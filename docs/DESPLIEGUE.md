# DESPLIEGUE: paso final al VPS

Este documento dice **cómo** se despliega. **Qué falta** para poder publicar (datos de la institución, revisión del abogado, decisiones) está en [`LANZAMIENTO.md`](LANZAMIENTO.md). Los dos se leen juntos: no se ejecuta ningún paso de aquí mientras quede abierta alguna casilla de la lista de verificación de `LANZAMIENTO.md`.

Estado: **documento, no ejecutado.** Ninguno de los cambios propuestos aquí (`.dockerignore`, argumentos de build, ruta de los secretos) está aplicado en el repositorio. Redactado el 21 de septiembre de 2026.

---

## 0. Problemas encontrados al preparar este documento

Se revisaron `infra/docker-compose.prod.yml`, `infra/Dockerfile` y `worker/Dockerfile`. Hay que resolver esto antes del primer despliegue:

| # | Problema | Efecto | Paso donde se resuelve |
|---|---|---|---|
| 1 | No hay `.dockerignore`. `infra/Dockerfile` y `worker/Dockerfile` hacen `COPY . .` | Las imágenes `web` y `pdf` llevan el `.env` local con todos los secretos, y la de `pdf` también el `node_modules` de macOS encima del de Linux. El contexto de build pesa unos 1,1 GB (`node_modules` 708 MB, `.next` 405 MB) | 2 |
| 2 | `NEXT_PUBLIC_APP_URL` se lee del `.env` copiado | `src/auth/cliente.ts` la usa como `baseURL`, y Next la fija en el bundle del navegador durante el build. Sin el `.env` en el build, el cliente de autenticación queda sin URL | 3 |
| 3 | `pdf` usa `seccomp:./worker/seccomp-chromium.json`, pero ese archivo **no existe** ni en `infra/worker/` ni en `worker/` | El servicio `pdf` no arranca en producción | 4 |
| 4 | Los secretos se leen de `/run/secrets/...` en el anfitrión | En Linux, `/run` es un `tmpfs` que se vacía al reiniciar: tras el primer reinicio del VPS, ningún servicio arranca | 5 |
| 5 | La etapa `deps` de `worker/Dockerfile` instala las dependencias en Alpine (musl) y las copia a una imagen Ubuntu (glibc) | Los módulos nativos (`@node-rs/argon2`, `sharp`) pueden no cargar en el worker | 2 (verificación) |
| 6 | `web` corre con `read_only: true` | La optimización de imágenes de Next escribe en `.next/cache`. Hay que verificar que `/_next/image` responda. Si no, se monta un `tmpfs` en `/app/.next/cache` | 9 |
| 7 | `infra/traefik/traefik.yml` usa `${ACME_EMAIL}` | Hay que confirmar que Traefik expande esa variable en la configuración estática. Si no, se escribe el correo literal | 7 |

---

## 1. Antes de construir: cambios de código del día del lanzamiento

Estos cambios van en el código, así que se hacen **antes** de construir las imágenes:

1. **Borrar el álbum de prueba de la lista `CONTENIDO_DE_PRUEBA`** en `src/seo/metadatos.ts`. El álbum en sí se borra en la base (paso 8).
2. **Fecha de vigencia de los documentos legales**, `vigenteDesde` en `src/legal/versiones.ts`, con la fecha real de publicación (ver `LANZAMIENTO.md`, "Fecha de entrada en vigencia").
3. **Constantes legales pendientes** en `src/legal/politica.ts` (área de atención, vigencia de las bases, encargados), si `LANZAMIENTO.md` ya las tiene resueltas.
4. Correr localmente la verificación completa (`DESIGN.md`, sección "Herramientas de verificación") contra el build nuevo.

---

## 2. `.dockerignore`

Crear `.dockerignore` en la raíz del repositorio con este contenido:

```
.env
.env.*
!.env.example
.git
node_modules
.next
capturas
tests
docs
test-results
playwright-report
Claude outputs
.claude
*.tsbuildinfo
```

Efectos:
- Ninguna imagen vuelve a llevar el `.env`.
- El `node_modules` de macOS deja de pisar el de Linux dentro de la imagen `pdf`.
- El contexto de build baja de unos 1,1 GB a unos pocos MB.

Verificación, con el tamaño del contexto en la primera línea de la salida:

```bash
docker build -f infra/Dockerfile --target runner --progress=plain -t agora-web:prueba . 2>&1 | grep -m1 "transferring context"
```

Para el problema 5 (Alpine contra Ubuntu en el worker): después de construir la imagen `pdf`, confirmar que los módulos nativos cargan:

```bash
docker run --rm --entrypoint node agora-pdf:VERSION -e "require('@node-rs/argon2'); require('sharp'); console.log('nativos OK')"
```

Si falla, la etapa `deps` de `worker/Dockerfile` debe usar la misma base que `runner` (`mcr.microsoft.com/playwright:v1.62.1-noble`).

---

## 3. `NEXT_PUBLIC_APP_URL` como argumento de build

En `infra/Dockerfile`, etapa `builder`, antes de `RUN npm run build`:

```dockerfile
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
```

Y construir con la URL pública definitiva:

```bash
docker build --build-arg NEXT_PUBLIC_APP_URL=https://DOMINIO ...
```

Es el único valor que queda fijado en la imagen, y no es secreto. Todo lo demás, `SITIO_URL` incluida, se lee al arrancar desde el archivo de entorno del servidor (paso 5).

---

## 4. Perfil seccomp de Chromium

`pdf` ejecuta Chromium (Playwright) para generar los PDF, y el compose de producción le aplica `seccomp:./worker/seccomp-chromium.json`. Hay que crear ese archivo en `infra/worker/seccomp-chromium.json`: la ruta es relativa a `infra/`, donde está el compose.

- Partir del perfil predeterminado de Docker y agregar solo las llamadas al sistema que el sandbox de Chromium necesita (las relacionadas con espacios de nombres de usuario, como `clone`, `unshare` y `setns`), en vez de desactivar seccomp o lanzar Chromium con `--no-sandbox`.
- Probarlo localmente: levantar `pdf` con el perfil, generar un boletín y un recibo, y revisar que no haya errores de sandbox en `docker logs`.
- Si no se logra un perfil funcional antes del lanzamiento, se decide explícitamente qué hacer. Nunca se quita la línea del compose en silencio.

---

## 5. Secretos de producción

**Todos los secretos se generan en el VPS y son nuevos.** Ninguno sale del `.env` local, que además ya quedó copiado en imágenes construidas en desarrollo.

### Dónde viven

`/run` se vacía al reiniciar (problema 4). Los secretos van en un directorio persistente, solo para `root`:

```bash
sudo install -d -m 700 -o root -g root /etc/agora/secretos
```

En `infra/docker-compose.prod.yml`, la sección `secrets:` y los `env_file` pasan de `/run/secrets/...` a `/etc/agora/secretos/...`.

### Generación

Contraseñas de Postgres en hexadecimal, para que no haya caracteres que rompan las URL de conexión:

```bash
cd /etc/agora/secretos
sudo sh -c 'umask 077
openssl rand -hex 32 > db-superuser-password
openssl rand -hex 32 > db-migraciones-password
openssl rand -hex 32 > db-app-password
openssl rand -hex 32 > db-backup-password'
```

- **`BETTER_AUTH_SECRET`**: `openssl rand -base64 48`.
- **Contraseña inicial del superadministrador**: `openssl rand -base64 18`, que da 24 caracteres. Debe tener al menos 12 caracteres y no aparecer en filtraciones: la plataforma la verifica contra Have I Been Pwned al cambiarla. Se entrega a la persona por un canal separado y se cambia en el primer ingreso.
- **Clave de respaldo**: el par de `age` se genera **fuera del VPS**. En el servidor solo queda la clave pública (`backup-age-key`); la privada se guarda fuera de línea. Sin ella, los respaldos no se pueden descifrar.

### Archivo de entorno `agora-env`

Se arma a partir de `.env.example`, con estos valores:

- `DATABASE_URL`, `DATABASE_URL_MIGRACIONES` y `PGBOSS_DATABASE_URL` con el host `db` y las contraseñas recién generadas.
- `BETTER_AUTH_SECRET` nuevo.
- `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` con `https://DOMINIO`.
- **`SITIO_URL=https://DOMINIO`**. Sin ella, `web` sale con código 1 al arrancar.
- **`SITIO_INDEXABLE=false`**. Se cambia a `true` solo en el paso 10.
- `SMTP_*` del proveedor confirmado en `LANZAMIENTO.md`.
- `SUPERADMIN_EMAIL` y la contraseña inicial.
- `PDF_RENDER_BASE_URL=http://web:3000`.

Permisos: `chmod 600`, dueño `root`.

---

## 6. Construcción y traslado de las imágenes

No se usa ningún registro de imágenes. Se construye localmente para la arquitectura del VPS y se traslada como archivo.

```bash
VERSION=$(date +%Y.%m.%d)-1
docker build --platform linux/amd64 -f infra/Dockerfile --target migrator -t agora-migrate:$VERSION .
docker build --platform linux/amd64 -f infra/Dockerfile --target runner \
  --build-arg NEXT_PUBLIC_APP_URL=https://DOMINIO -t agora-web:$VERSION .
docker build --platform linux/amd64 -f worker/Dockerfile -t agora-pdf:$VERSION .
docker build --platform linux/amd64 -f infra/backup/Dockerfile -t agora-backup:$VERSION infra/backup
```

**Verificación obligatoria antes de trasladar:** ninguna imagen puede contener un `.env`.

```bash
docker run --rm agora-web:$VERSION ls -la /app
docker run --rm --entrypoint ls agora-pdf:$VERSION -la /app
docker run --rm --entrypoint sh agora-web:$VERSION -c 'test ! -e /app/.env && echo "sin .env"'
docker run --rm --entrypoint sh agora-pdf:$VERSION -c 'test ! -e /app/.env && echo "sin .env"'
```

Si cualquiera de las dos últimas no imprime `sin .env`, se detiene todo.

Traslado:

```bash
docker save agora-migrate:$VERSION agora-web:$VERSION agora-pdf:$VERSION agora-backup:$VERSION | gzip > agora-$VERSION.tar.gz
scp agora-$VERSION.tar.gz usuario@VPS:/tmp/
ssh usuario@VPS "gunzip -c /tmp/agora-$VERSION.tar.gz | docker load && rm /tmp/agora-$VERSION.tar.gz"
```

Se conservan en el VPS las imágenes de la versión anterior: son el plan para volver atrás (paso 11).

---

## 7. Orden exacto en el VPS

Requisitos previos:
- DNS del dominio apuntando al VPS.
- Firewall abierto solo en los puertos 22, 80 y 443.
- Docker con el plugin de compose.
- Carpeta `infra/` copiada a `/opt/agora/infra`, sin `.env`.

```bash
cd /opt/agora/infra
export DOMINIO=DOMINIO ACME_EMAIL=CORREO
export MIGRATE_IMAGE=agora-migrate:$VERSION WEB_IMAGE=agora-web:$VERSION
export PDF_IMAGE=agora-pdf:$VERSION BACKUP_IMAGE=agora-backup:$VERSION

docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d web pdf backup
docker compose -f docker-compose.prod.yml up -d proxy
docker compose -f docker-compose.prod.yml ps
```

- El primer arranque de `db` crea los roles con `postgres-init/`.
- `migrate` aplica todas las migraciones, 0000 a 0010 inclusive.
- **Datos iniciales:** `src/datos/semilla.ts` es de desarrollo. Siembra, por ejemplo, el horario de la jornada diurna, que `LANZAMIENTO.md` marca como sin verificar. En producción no se corre tal cual. Qué se carga (superadministrador, configuración institucional, ciclos, jornadas, año lectivo) es una decisión de `LANZAMIENTO.md`, y se carga con esos datos reales.

---

## 8. Pasos del día del lanzamiento

Cada paso está descrito en `LANZAMIENTO.md`; aquí va solo el orden.

1. **Consecutivo de radicados**: reiniciarlo con el SQL de `LANZAMIENTO.md` ("Consecutivo de radicados de admisión"), **después** de cualquier prueba de admisión en producción y **antes** de anunciar el sitio.
2. **Álbum de prueba**: borrarlo desde el panel (Contenido), o con `DELETE` sobre `cms_album_foto` y `cms_entrada` para el slug `album-de-prueba`, además de sus archivos. Su slug ya salió de `CONTENIDO_DE_PRUEBA` en el paso 1.
3. **`SITIO_URL`**: ya está en `agora-env` (paso 5). Se confirma con la canónica de `/inicio` (paso 9).
4. **Perfil seccomp de Chromium**: en su lugar (paso 4). Se confirma generando un PDF real.
5. **Secretos de Docker**: en `/etc/agora/secretos`, con permisos 600 (paso 5).
6. **`SITIO_INDEXABLE`**: se deja en `false` hasta el paso 10.

---

## 9. Verificación posterior al despliegue

```bash
curl -sI https://DOMINIO/inicio
curl -sI https://DOMINIO/panel
curl -s  https://DOMINIO/robots.txt
curl -s  https://DOMINIO/inicio | grep -o '<link rel="canonical"[^>]*>'
curl -sI "https://DOMINIO/_next/image?url=%2Fmarca%2Flogo-agora.png&w=96&q=75"
docker compose -f docker-compose.prod.yml logs --since 10m web pdf | grep -iE "error|SITIO_URL" || echo "sin errores"
```

Qué se espera:
- `/inicio` responde 200, con TLS válido.
- `/panel` responde 307 hacia `/login`.
- `robots.txt` dice `Disallow: /` mientras `SITIO_INDEXABLE` sea falsa.
- La canónica apunta a `https://DOMINIO`.
- `/_next/image` responde 200. Si no, es el problema 6.

Además, desde un navegador:
- `/login` muestra el formulario y el superadministrador entra y sale.
- La consola del navegador no muestra violaciones de CSP en `/inicio`, `/admisiones` y `/login`.
- Una solicitud de admisión de prueba devuelve su radicado. Se borra y luego se reinicia el consecutivo (paso 8).
- Se genera un boletín o un recibo en PDF.
- Al día siguiente, existe un respaldo cifrado en el volumen `backups`, **y se restaura en una base aparte** para probarlo.

Las pruebas de punta a punta del repositorio (`npm run test:e2e`) **no corren contra producción**: se niegan si la URL no es local, porque escriben en la base.

---

## 10. Indexación

Solo cuando **todas** las casillas de `LANZAMIENTO.md` estén cerradas: `SITIO_INDEXABLE=true` en `agora-env` y `docker compose -f docker-compose.prod.yml up -d web`. Luego se confirma que `robots.txt` permite el sitio y apunta al sitemap, y que `/inicio` dice `index, follow`.

---

## 11. Plan para volver atrás

- **Antes de cada despliegue**, un respaldo manual de la base:

  ```bash
  docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres -Fc agora > /opt/agora/antes-$VERSION.dump
  ```

  Las migraciones solo van hacia adelante: sin este archivo, volver a la imagen anterior con una base ya migrada puede no funcionar.
- **Volver a la versión anterior de la aplicación**, con las imágenes anteriores que se conservaron en el VPS:

  ```bash
  export WEB_IMAGE=agora-web:ANTERIOR PDF_IMAGE=agora-pdf:ANTERIOR MIGRATE_IMAGE=agora-migrate:ANTERIOR
  docker compose -f docker-compose.prod.yml up -d web pdf
  ```

- **Si la nueva versión aplicó migraciones incompatibles** con la anterior: detener `web` y `pdf`, restaurar el volcado previo con `pg_restore --clean --if-exists` y volver a levantar con las imágenes anteriores.
- **Si el problema es de indexación** (por ejemplo, se activó antes de tiempo): `SITIO_INDEXABLE=false` y reiniciar `web`. Los buscadores dejan de indexar en la siguiente visita; lo ya indexado se retira desde sus herramientas para administradores de sitios.
