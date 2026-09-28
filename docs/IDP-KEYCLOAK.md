# Proveedor de identidad con Keycloak

Estado al 25 de septiembre de 2026: **implementado detrás de la bandera `AUTH_KEYCLOAK_HABILITADO` (apagada por defecto).** Existen los contenedores de desarrollo y producción, el realm importable, el tema de ingreso y de correo con el sistema visual del sitio, la integración con Better Auth (camino A) y **el alta, el enlace y la desactivación de cuentas** desde la plataforma, con el doble control en cada ingreso. Con la bandera apagada el ingreso con correo, contraseña y TOTP de Better Auth funciona igual que antes, y volver atrás es apagar la bandera y recrear `web` y `pdf`.

La sección 13 resume los contenedores, el realm, el tema y la integración; la sección 14, el alta y la desactivación de cuentas. Las secciones 1 a 12 conservan el análisis original, actualizado donde el código cambió algo.

---

## 1. Versión

| Dato | Valor | Fuente |
|---|---|---|
| Versión estable vigente | **26.7.4**, publicada el 16 de septiembre de 2026 (verificada de nuevo el 25 de septiembre de 2026) | Lanzamientos de `github.com/keycloak/keycloak` (la API de GitHub la marca como la última versión estable) |
| Imagen oficial | `quay.io/keycloak/keycloak:26.7.4` | Registro oficial en quay.io |
| Digest de la imagen | `sha256:82a77884f3af238beab1e7afd63b5f530e1b5c0590bd7aa60b40a40463e29b2c` | API de quay.io, etiqueta `26.7.4` |
| PostgreSQL soportado | 14 a 18; **la 18 es la versión con la que Keycloak prueba** | Guía oficial "Configuring the database" |

La imagen se fija por versión **y** por digest (`quay.io/keycloak/keycloak:26.7.4@sha256:82a7…29b2c`), como ya se hace con el resto del stack. Antes de implementar hay que volver a verificar la versión vigente: estos datos envejecen.

---

## 2. Arquitectura

```
Internet ──► Traefik ──► web (Next.js)           dominio.edu.co
                    └──► keycloak               auth.dominio.edu.co
                              │
                              └──► db-keycloak (PostgreSQL 18, solo para Keycloak)
```

### Contenedores

- **`keycloak`**: imagen propia construida `FROM quay.io/keycloak/keycloak:26.7.4@sha256:…`, con `kc.sh build --db=postgres --health-enabled=true` en la etapa de build y `start --optimized` al arrancar, que es el modo de producción documentado. TLS termina en Traefik: Keycloak escucha HTTP en la red interna con `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded` y `KC_HOSTNAME=https://auth.<dominio>`.
- **`db-keycloak`**: `postgres:18-alpine`, **separada de la base de la plataforma**, con volumen, usuario y contraseña propios (secretos de Docker, como `db`). Keycloak nunca ve la base de la plataforma, y la plataforma nunca ve la de Keycloak. Si una se compromete, la otra no queda expuesta.
- **Redes**: `keycloak` en `edge` (para Traefik) y en una red interna nueva, `idp`, compartida solo con `db-keycloak`. La aplicación habla con Keycloak por su URL pública (`https://auth.<dominio>`), porque el emisor (`iss`) de los tokens debe coincidir exactamente con esa URL.

### Traefik

- Router nuevo: `Host(\`auth.${DOMINIO}\`)`, `entrypoints=websecure`, `certresolver=letsencrypt` y el middleware `security-headers@file` existente.
- **La consola de administración no se publica en internet.** Opciones, de más a menos restrictiva: servirla solo por la red interna o por un túnel SSH; o publicarla en `KC_HOSTNAME_ADMIN` con un `ipAllowList` de Traefik. Decisión pendiente (sección 12).
- Salud: `KC_HEALTH_ENABLED=true` expone `/health/ready` en el puerto de gestión 9000, que no se publica en Traefik. El `healthcheck` de Docker lo consulta internamente.

### Recursos en el VPS

La guía oficial de dimensionamiento dice que un nodo usa unos **1250 MB de RAM** de base, incluidas las cachés del realm y 10.000 sesiones. En contenedores, Keycloak dedica el 70 % del límite de memoria al heap y usa unos 300 MB fuera de él. El límite recomendado sale de la fórmula (1250 − 300) / 0,7, es decir, unos 1360 MB.

| Servicio | Límite de memoria |
|---|---|
| `keycloak` | 1,5 GB |
| `db-keycloak` | 256 a 512 MB |
| Existentes (`web` 1 GB, `db` 512 MB, `pdf` 768 MB) | 2,3 GB |
| **Total con margen para el sistema y Traefik** | **6 GB de RAM en el VPS como mínimo** |

En CPU, la misma guía pide 1 vCPU por cada 15 inicios de sesión con contraseña por segundo. Un colegio está órdenes de magnitud por debajo: con 2 vCPU compartidas alcanza.

### Respaldo

- `db-keycloak` entra al mismo esquema de `infra/backup`: `pg_dump`, cifrado con `age` con la misma clave pública y la misma retención (`BACKUP_RETAIN_DAYS`). Usuario de respaldo propio, de solo lectura, en `db-keycloak`.
- Además, una exportación del realm (`kc.sh export --realm agora --users skip`) versionada en el repositorio, **sin secretos ni usuarios**, para poder reconstruir la configuración sin restaurar la base.
- La restauración se prueba antes de pasar a producción, no después.

---

## 3. Integración: realm y cliente

- **Realm** `agora`. El realm `master` queda solo para administrar Keycloak.
- **Cliente OIDC confidencial** `plataforma-agora`:
  - Flujo estándar (código de autorización) con **PKCE S256 obligatorio**. Sin flujo implícito, sin *direct access grants* y sin cuentas de servicio.
  - URI de redirección exacta, sin comodines: `https://<dominio>/api/auth/callback/keycloak`. (En Better Auth 1.7.2 el plugin registra Keycloak como proveedor social y usa el callback estándar `callback/:id`; la ruta `oauth2/callback` no existe en esta versión.)
  - URI de redirección tras cerrar sesión: `https://<dominio>/login`.
  - `response_mode=query`, que es el predeterminado. **No usar `form_post`**: sería un POST entre sitios hacia la plataforma, y la cookie `SameSite=Lax` con el estado de OAuth no viajaría.
  - Ámbitos: `openid email profile`.
  - El secreto del cliente va como secreto de Docker, nunca en el `.env` de la imagen (ver el bloqueo de seguridad de `LANZAMIENTO.md`).
- Tokens de acceso de vida corta (5 minutos). La plataforma no usa el token de acceso para autorizar nada: solo sirve para identificar a la persona al iniciar sesión. La sesión la sigue llevando la cookie `agora.session_token`.

### Dos caminos

**A. Mantener Better Auth y agregar su plugin de OAuth genérico** (`better-auth/plugins/generic-oauth`, que en la versión instalada, 1.7.2, ya trae el ayudante `keycloak({ clientId, clientSecret, issuer })`).

- A favor:
  - Cambia muy poco. La cookie de sesión, `obtenerSesion()`, `obtenerUsuarioActual()`, el middleware y el contexto de RLS siguen igual.
  - La tabla `ba_account` ya modela cuentas externas (`provider_id`, `account_id`).
  - Se pueden tener los dos métodos de ingreso a la vez durante la migración, y volver atrás es cambiar una bandera.
- En contra:
  - Siguen existiendo dos sistemas de sesión: la de Keycloak y la de la plataforma. Cerrar sesión en uno no cierra el otro, salvo que se configure `endSessionEndpoint`.
  - Better Auth ya causó dos bloqueos de inicio de sesión por diferencias de esquema entre versiones (bugs 14 y 16 de `PENDIENTES.md`). El plugin agrega superficie de ese tipo.

**B. Reemplazar Better Auth** por un cliente OIDC directo (por ejemplo `openid-client`) y una sesión propia.

- A favor:
  - Un solo sistema de identidad y menos dependencias.
  - Control total del flujo.
- En contra:
  - Hay que reescribir la sesión, la cookie, su rotación y su revocación, el cierre de sesión y todo lo que hoy llama a `auth.api.getSession`.
  - Se pierde la vuelta atrás fácil.
  - Es código de seguridad nuevo, escrito a mano y sin probar en producción.

**Recomendación: A.** Keycloak pasa a ser el único que verifica contraseñas y segundo factor, y Better Auth queda como la capa de sesión que ya funciona y ya está probada con RLS. Si en el futuro Better Auth vuelve a dar problemas de versión, pasar a B es más fácil con Keycloak ya en marcha que haciendo las dos cosas a la vez.

---

## 4. Enlace de identidades: el `sub` de Keycloak y `usuario.id`

Es la parte más delicada. Todo el aislamiento de datos depende de ella:

- La sesión de Better Auth identifica al usuario por `ba_user.id`, que **es el mismo valor** que `usuario.id`. La siembra y `crearPersonaConUsuario` crean los dos con el mismo id, en un vínculo 1:1.
- `obtenerUsuarioActual()` y el middleware leen `usuario` con ese id, y `conContextoRLS` fija `app.user_id` con él. Las políticas de RLS (por ejemplo, que un estudiante solo vea su `plan_cobro`) comparan contra `app.user_id`.

Si un inicio de sesión con Keycloak terminara en un `ba_user` distinto, o creara uno nuevo, esa persona quedaría sin datos o, peor, con los de otra.

### Reglas

1. **El identificador de Keycloak es el `sub`**, el UUID interno del usuario en Keycloak, que nunca cambia. **Nunca el correo:** puede cambiar, repetirse después de borrar una cuenta o ser el de un acudiente compartido.
2. **Se prohíbe el registro implícito:** `disableImplicitSignUp: true` y `disableSignUp: true` en el proveedor. Un `sub` desconocido no crea usuario: el inicio de sesión se rechaza y la persona va a `/sin-acceso`.
3. **Se desactiva el enlace automático por correo** (`accountLinking` sin `trustedProviders` para Keycloak). Better Auth puede enlazar una cuenta externa a un usuario existente cuando el correo coincide, y aquí eso es justamente lo que no se quiere.
4. **El enlace se hace de antemano y de forma explícita:**
   - Al crear el usuario en Keycloak se le pone el atributo `agora_usuario_id = usuario.id`.
   - Se inserta en `ba_account` la fila `provider_id = 'keycloak'`, `account_id = <sub>`, `user_id = usuario.id`.
   - Hay que verificar en la versión de Better Auth de ese momento qué valor exige la columna `issuer` para cuentas OAuth. Hoy existe y es obligatoria, y para credenciales locales vale `local:credential`.
5. **Doble control en cada inicio de sesión:**
   - Un *protocol mapper* de Keycloak pone `agora_usuario_id` en el token de ID.
   - Un `databaseHooks.session.create.before` de Better Auth compara ese valor con el `user_id` que Better Auth resolvió por `(provider_id, account_id)`. Si no coinciden, rechaza la sesión y deja registro en `auditoria`.
   - Con eso, un error de enlace en cualquiera de los dos lados falla cerrado, nunca abierto.
6. **Alta de usuarios nuevos después de la migración:** `crearPersonaConUsuario` y `otorgarAcceso` crean también el usuario en Keycloak por su API de administración, con una cuenta de servicio de permisos mínimos (`manage-users` en el realm `agora`), y escriben la fila de `ba_account` en la misma operación. Si falla la creación en Keycloak, no se crea nada en la plataforma.
7. **Desactivar una cuenta:** `cambiarEstadoUsuario` desactiva en los dos lados. El middleware ya rechaza a un `usuario` inactivo aunque Keycloak lo deje entrar, así que la plataforma sigue siendo la última palabra.

---

## 5. Roles: superadmin, docente y estudiante

**Los roles se quedan en `usuario.rol`, en la base de la plataforma.** Keycloak autentica; la plataforma autoriza.

- El middleware, las páginas del panel y RLS leen `usuario.rol` hoy, y seguirían haciéndolo. No hay que tocar ninguna política.
- Mantenerlos en Keycloak como roles de realm y copiarlos a `usuario.rol` en cada ingreso crearía dos fuentes de verdad que pueden desincronizarse. Un rol de superadmin olvidado en Keycloak se volvería un problema de seguridad difícil de ver.
- Si más adelante se quiere administrar los roles desde Keycloak, el cambio es explícito: Keycloak manda el rol en un claim, la plataforma lo acepta solo si coincide con una lista cerrada y queda auditado. Eso es una decisión aparte (sección 12).

---

## 6. Segundo factor

- **Decisión del 25 de septiembre de 2026:** TOTP obligatorio para Superadministrador, Administrador, Secretaría y Contador, y opcional para Profesor, Estudiante y Acudiente (sección 14). Volverlo obligatorio para Profesor queda en `PENDIENTES.md`.
- Hoy Better Auth ofrece TOTP opcional (`ba_two_factor`). En la base de desarrollo, **cero** usuarios lo tienen activo. En producción hay que contarlos antes de migrar.
- Con Keycloak, el segundo factor lo gestiona Keycloak: OTP con aplicación de autenticación, y opcionalmente llaves de acceso (WebAuthn). Se recomienda **OTP obligatorio para `superadmin` y `docente`** mediante un flujo condicional según el grupo, y opcional para estudiantes.
- **Usuarios que ya tienen TOTP:**
  - Opción recomendada: **reinscripción.** En el primer ingreso por Keycloak, la acción requerida `CONFIGURE_TOTP` les pide escanear un código nuevo. Es simple y no mueve secretos entre sistemas.
  - Opción posible: importar el secreto existente como credencial OTP por la API de administración. Evita la reinscripción, pero implica sacar secretos TOTP de una base y meterlos en otra. Solo vale la pena si hay muchos usuarios con TOTP.
- Tras el corte, el plugin `twoFactor` de Better Auth se desactiva y `ba_two_factor` se vacía **al terminar el periodo de vuelta atrás**, no antes.

---

## 7. Cambios de CSP

La CSP actual está en `middleware.ts` (`construirCSP`).

- **`form-action`:** hoy vale `'self'`. El ingreso con Better Auth empieza con una petición `fetch` (`authClient.signIn.oauth2`) y luego navega a la URL que devuelve Keycloak. Una navegación así no la controla `form-action`. Pero Chrome aplica `form-action` también a las redirecciones que siguen al envío de un formulario. Si algún paso del ingreso o del cierre de sesión termina siendo un `<form>` que redirige a Keycloak, hay que agregar `https://auth.<dominio>`. Se decide con una prueba real, no a priori, y la prueba `tests/e2e/csp.spec.ts` debe cubrir el flujo completo de ingreso por Keycloak.
- **`connect-src`:** no cambia. El canje del código por los tokens lo hace el servidor, no el navegador.
- **`frame-src` y `frame-ancestors`:** no cambian. No se usa el iframe de verificación de sesión de Keycloak (*check session iframe*), y la plataforma no se incrusta en ningún lado.
- **Las páginas de Keycloak tienen su propia CSP**, configurable por realm en *Security defenses*. Se endurece allí: `frame-ancestors 'none'` y sin orígenes externos, porque el tema no carga nada de terceros.

---

## 8. Tema de la pantalla de ingreso

- Tema de login propio (`agora`) en `infra/keycloak/themes/agora/login`, construido sobre el tema base de Keycloak con plantillas FreeMarker y CSS. Se monta en la imagen durante el build.
- Identidad de la marca:
  - Fondo del panel, logo `logo-agora-blanco.png`, Cormorant Garamond para los títulos e Inter Tight para el texto.
  - **Fuentes servidas desde el propio tema**, no desde Google.
  - Botón principal en carmín, el único carmín de la pantalla.
  - Colores desde los mismos valores de `src/ui/tokens.css`.
- **Idioma:** español como único idioma del realm (`es`), con los textos revisados en el mismo tono del sitio (usted, sin rayas largas, sin "todavía no").
- **Accesibilidad:** etiquetas visibles con buen contraste. Esto corrige de paso las etiquetas casi invisibles del `/login` actual, anotadas en `PENDIENTES.md`. Además: foco visible, errores asociados a su campo, y revisión con axe como el resto del sitio.
- En el pie de la pantalla, enlaces a `/privacidad` y a `/terminos` del sitio.

---

## 9. Migración de las cuentas existentes

1. **Inventario:** usuarios activos por rol y cuántos tienen TOTP. Hoy, en desarrollo, hay 1 (`superadmin`).
2. **Contraseñas:** Keycloak 26 usa Argon2 por defecto y admite importar credenciales con su hash. Better Auth guarda hashes Argon2id (`@node-rs/argon2`, parámetros en `src/auth/config.ts`). **Hay que verificar en un entorno de prueba** que un hash importado con esos parámetros valida en Keycloak.
   - Si valida: cada persona conserva su contraseña.
   - Si no: la acción requerida `UPDATE_PASSWORD` con un enlace de un solo uso enviado por correo. Esto exige tener antes un proveedor de correo de producción, que hoy no existe (ver `LANZAMIENTO.md`).
3. **Creación en Keycloak** por un script idempotente con la API de administración: por cada `usuario`, un usuario de Keycloak con el mismo correo, el atributo `agora_usuario_id`, el grupo según `usuario.rol` y las acciones requeridas que correspondan. Luego la fila de `ba_account` con el `sub` devuelto. El script se puede correr de nuevo sin duplicar nada.
4. **Convivencia:** una bandera de servidor `AUTH_PROVEEDOR` con dos valores:
   - `local`: comportamiento actual.
   - `keycloak`: `/login` muestra "Ingresar con la cuenta institucional" y redirige a Keycloak.
   Durante las pruebas, el superadministrador puede usar los dos.
5. **Corte:** con `AUTH_PROVEEDOR=keycloak`, el ingreso con correo y contraseña de Better Auth se desactiva (`emailAndPassword.enabled = false`), pero **no se borran** las credenciales locales.

### Plan para volver atrás

- Durante un periodo definido (se propone un mes), las credenciales de `ba_account` con `provider_id = 'credential'` y las filas de `ba_two_factor` se conservan intactas.
- Volver atrás es poner `AUTH_PROVEEDOR=local` y reiniciar `web`. Las filas de Keycloak en `ba_account` no estorban: nadie puede usarlas sin Keycloak.
- Lo que no vuelve atrás: las contraseñas cambiadas en Keycloak durante ese periodo. Quien la cambió allí vuelve a su contraseña anterior. Hay que avisarlo antes del corte.
- Al cerrar el periodo: se borran las credenciales locales y `ba_two_factor`, se quita el código de ingreso local y queda solo Keycloak.

---

## 10. Estimación por etapas

Días de trabajo de una persona, sin contar esperas por decisiones.

| Etapa | Contenido | Días |
|---|---|---|
| 0 | Decisiones de la sección 12, dominio `auth.` y proveedor de correo | fuera del cálculo |
| 1 | Contenedores, red, Traefik, `db-keycloak`, respaldo y restauración probada, en un entorno de prueba | 2 a 3 |
| 2 | Realm, cliente, mapper, grupos, flujos de segundo factor, exportación versionada | 1 a 2 |
| 3 | Tema de ingreso con la marca, textos en español, revisión con axe | 2 a 3 |
| 4 | Plugin de OAuth genérico, bandera `AUTH_PROVEEDOR`, doble control del enlace, pruebas de punta a punta de ingreso, cierre de sesión y rechazo de un `sub` desconocido, CSP | 3 a 4 |
| 5 | Script de migración, prueba de importación de hashes Argon2id, ensayo completo con copia de datos | 2 a 3 |
| 6 | Corte en producción, acompañamiento y cierre del periodo de vuelta atrás | 1, más el periodo |
| **Total** | | **11 a 16 días** |

---

## 11. Riesgos principales

- **Enlace de identidades mal hecho** (sección 4): una persona entra con los datos de otra. Lo mitigan el registro implícito prohibido, el enlace explícito por `sub`, el doble control en cada sesión y las pruebas que intentan cada caso de fallo.
- **Keycloak caído significa que nadie entra a la plataforma.** El sitio público no depende de Keycloak y sigue funcionando.
- **La recuperación de contraseñas depende del correo**, que hoy no existe en producción.
- **Otro servicio con estado que mantener:** actualizaciones de seguridad de Keycloak, que publica versiones de corrección cada pocas semanas (26.7.1 a 26.7.4 salieron entre agosto y septiembre de 2026).

---

## 12. Decisiones que debe tomar usted

1. **Hacerlo o no, y cuándo.** El beneficio real es centralizar la identidad y el segundo factor. Si la plataforma va a seguir siendo la única aplicación de la institución, Better Auth solo puede bastar.
2. **Camino A o B** (sección 3). Se recomienda A.
3. **Subdominio** de Keycloak (por ejemplo `auth.<dominio>`).
4. **Acceso a la consola de administración:** solo red interna o túnel SSH, o publicada con lista de IP.
5. **Segundo factor obligatorio** para `superadmin` y `docente`: sí o no. Y para estudiantes.
6. **Usuarios con TOTP actual:** reinscripción o importación del secreto.
7. **Contraseñas:** importar los hashes (si la prueba lo permite) o pedir a todos que definan una nueva.
8. **Dónde viven los roles:** en la plataforma (recomendado) o en Keycloak.
9. **Duración del periodo de vuelta atrás.**
10. **Tamaño del VPS:** pasar a 6 GB de RAM como mínimo.
11. **Proveedor de correo de producción,** que también es un dato pendiente de `LANZAMIENTO.md` y encargado del tratamiento de datos personales.

---

## 13. Lo implementado (25 de septiembre de 2026)

### Contenedores

| Pieza | Desarrollo (`infra/docker-compose.yml`) | Producción (`infra/docker-compose.prod.yml`) |
|---|---|---|
| `keycloak` | Imagen propia `infra/keycloak/Dockerfile`, `FROM quay.io/keycloak/keycloak:26.7.4@sha256:82a77884f3af238beab1e7afd63b5f530e1b5c0590bd7aa60b40a40463e29b2c`, `kc.sh build --db=postgres --health-enabled=true`, `start --optimized --import-realm`. Publicado solo en `127.0.0.1:8082` (el 8081 lo ocupa otro proyecto de la máquina). Redes `idp` e `internal` | Imagen `${KEYCLOAK_IMAGE}` construida del mismo Dockerfile. Traefik en `auth.${DOMINIO}` con TLS, `security-headers@file` y la regla `Host(auth) && !PathPrefix(/admin) && !PathPrefix(/realms/master)`: **la consola de administración no se publica**. `KC_PROXY_HEADERS=xforwarded`. Redes `edge` e `idp`. Límite de 1,5 GB |
| `db-keycloak` | `postgres:18.6-alpine@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873`, volumen `db_keycloak_data`, solo en la red `idp` | La misma imagen, contraseña por el secreto `keycloak-db-password` |
| Salud | `HEALTHCHECK` contra `/health/ready` en el puerto de gestión 9000 (no publicado), con `bash` y `/dev/tcp` porque la imagen no trae `curl` | Igual |
| Red `idp` | `internal: true`, solo `keycloak` y `db-keycloak` | Igual |

**Secretos.** En desarrollo, todos los servicios leen un único `.env` (fuera de git), así que Keycloak y la plataforma ven los secretos del otro; `db-keycloak` toma su contraseña de `KC_DB_PASSWORD`. En producción, los secretos de Docker `keycloak-env` y `keycloak-db-password`. La plataforma recibe `AUTH_KEYCLOAK_HABILITADO`, `KEYCLOAK_EMISOR`, `KEYCLOAK_URL_INTERNA`, `KEYCLOAK_CLIENTE_ID` y `KEYCLOAK_CLIENTE_SECRETO` en su `.env`; `src/env.ts` exige las tres últimas cuando la bandera está encendida.

**Red en desarrollo.** El navegador usa `http://localhost:8082` y el contenedor `web` no puede usar esa dirección. Con `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true`, Keycloak publica los puntos de autorización y cierre de sesión en la URL pública, y el de tokens, el de datos de usuario y las llaves (`jwks`) en `http://keycloak:8080`, mientras el emisor (`iss`) sigue siendo la URL pública. La plataforma lee el documento de descubrimiento por la URL interna y verifica el token de ID contra el emisor público (`requireIdTokenVerification`).

### Realm `agora` (`infra/keycloak/realm/agora-realm.json`)

- Sin usuarios ni secretos: el secreto del cliente, las URL y el servidor de correo se resuelven desde variables de entorno al importar (`${KEYCLOAK_CLIENTE_SECRETO}`, `${PLATAFORMA_URL}`, `${KEYCLOAK_SMTP_*}`). La importación solo ocurre si el realm no existe: un cambio al archivo exige reimportar.
- Idioma `es` único, tema `agora`, **`registrationAllowed: false`**.
- Cliente confidencial `plataforma-agora`: código de autorización con PKCE S256, sin flujo implícito, sin *direct access grants*, sin cuentas de servicio, redirección exacta `${PLATAFORMA_URL}/api/auth/callback/keycloak`, cierre de sesión hacia `${PLATAFORMA_URL}/login`, `fullScopeAllowed: false`.
- Política de contraseñas: 12 a 128 caracteres, distinta del usuario y del correo, sin repetir las últimas 3, Argon2.
- Protección contra fuerza bruta: 5 intentos, espera creciente desde 60 s hasta 15 min.
- Tokens de acceso de 5 minutos.
- Acción requerida `CONFIGURE_TOTP` habilitada (OTP de 6 dígitos cada 30 s). Se asigna al crear la cuenta de Superadministrador, Administrador, Secretaría y Contador (sección 14).
- Encabezados de seguridad del realm: `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `form-action 'self' ${PLATAFORMA_URL}` (la redirección de vuelta a la plataforma sigue al envío del formulario) y `script-src 'self' 'unsafe-inline'`. **Decisión:** Keycloak inserta desde el servidor un `history.replaceState` en línea después de cada envío de formulario. Su URL lleva `tab_id` y `client_data` distintos en cada solicitud (comprobado el 25 de septiembre con dos envíos seguidos), así que no se puede autorizar por hash. Con `'self'` estricto, la consola registra un error de CSP y al recargar se reenvía el formulario. Las plantillas del tema no tienen ningún script en línea. El detalle está en `SEGURIDAD.md`, A05.
- Los roles **no** se guardan en Keycloak: la autoridad sigue siendo `usuario.rol` (sección 5).

### Tema `agora` (`infra/keycloak/themes/agora/login`)

- Hereda del tema `base`. Sobrescribe `template.ftl` (encabezado con el logo oficial, pie con `/privacidad` y `/terminos` de la plataforma, sin scripts en línea), `login.ftl`, `login-otp.ftl`, `login-reset-password.ftl` y `login-update-password.ftl`. Las demás pantallas usan las plantillas base con las clases del tema.
- Mismos tokens del sitio en claro y oscuro (por `prefers-color-scheme`), Newsreader para títulos y Schibsted Grotesk para la interfaz, servidas desde el tema (`resources/fonts`, con sus licencias OFL). Logo a color o blanco según el modo.
- Etiquetas visibles, errores asociados a su campo con `aria-describedby` y `aria-invalid`, foco al mensaje de error, botón para mostrar u ocultar la contraseña con `aria-pressed`, foco visible, sin enlace de registro y con la nota "No es posible crear una cuenta desde aquí: las cuentas las crea la administración del colegio".
- Textos en español con trato de usted (`messages/messages_es.properties`), que reemplazan los del tema base (que mezclan tú y usted).

### Integración en la plataforma

- `src/auth/config.ts`: `genericOAuth` con el ayudante `keycloak()` solo cuando `AUTH_KEYCLOAK_HABILITADO=true`, con `pkce`, `disableImplicitSignUp`, `disableSignUp`, `requireIdTokenVerification`, cierre de sesión en Keycloak (`endSessionEndpoint` público y regreso a `/login`) y el enlace automático por correo desactivado (`account.accountLinking.enabled: false`). `emailAndPassword.disableSignUp` sigue activo.
- `/login`: con la bandera encendida muestra el botón **Ingresar de forma segura** (`signIn.social({ provider: 'keycloak' })`) y traduce los errores de vuelta (`signup_disabled`: "Su cuenta no está habilitada en la plataforma"). Con la bandera apagada, el formulario de siempre.
- Cierre de sesión: si Better Auth devuelve la URL de cierre de Keycloak, el botón navega a ella; si no, vuelve a `/login`.
- CSP de la plataforma: **sin cambios.** El ingreso empieza con `fetch` y una navegación, no con un formulario, y el canje del código lo hace el servidor. Comprobado recorriendo el flujo completo sin errores de CSP en ninguno de los dos dominios.

### Comprobado

- Keycloak y `db-keycloak` sanos; el realm se importa; el descubrimiento responde desde el host y desde `web`.
- Tema en claro y oscuro, a 1440 y 390 px, sin errores de consola; error de credenciales asociado al campo y con foco; sin enlaces de registro.
- Con la bandera encendida: el flujo va de `/login` a Keycloak y vuelve. Una persona que existe en Keycloak pero **no está enlazada** vuelve a `/login?error=signup_disabled`, sin sesión y sin crear ningún `ba_user` (falla cerrada).
- Con la bandera apagada: las 49 pruebas de punta a punta pasan como antes.

---

## 14. Alta, enlace y desactivación de cuentas (implementado el 25 de septiembre de 2026)

Diseño aprobado el 25 de septiembre. Todo vive en `src/auth/idp/` y lo usan las acciones de `src/acciones/personas/persona.ts`, la pantalla **Cuentas** (`/panel/admin/cuentas`, componentes en `app/panel/_cuentas/`) y los formularios de Profesores y Estudiantes.

### Piezas

| Pieza | Archivo | Qué hace |
|---|---|---|
| Cliente de la Admin API | `src/auth/idp/keycloak-admin.ts` | Token de la cuenta de servicio `plataforma-admin` (con caché hasta que vence), crear, leer, buscar por `agora_usuario_id`, borrar, habilitar o deshabilitar, cerrar sesiones, cambiar correo, contraseña temporal e invitación. Usa `KEYCLOAK_URL_INTERNA`, así que no sale de la red interna. Un 409 se traduce a `ErrorIdpConflicto` |
| Alta y cambios | `src/auth/idp/alta.ts` | `darDeAltaCuenta`, `cambiarEstadoCuenta`, `reenviarInvitacion`, `restablecerContrasenaTemporal`, `cambiarCorreoCuenta` |
| Sincronización | `src/auth/idp/cuentas.ts` | Acciones requeridas por perfil, generación de usuario y contraseña temporal, `sincronizarEstadoIdp` y `sincronizarPendientesIdp` |
| Doble control | `src/auth/idp/doble-control.ts` | Perfil desde el token de ID, comparación de identidad y auditoría del rechazo |
| Migración | `src/auth/idp/migrar-cuentas.ts` (`npm run idp:migrar-cuentas`) | Enlaza las cuentas activas existentes |
| Realm en caliente | `infra/keycloak/actualizar-realm.sh` (en la imagen: `/opt/keycloak/bin/actualizar-realm-agora.sh`) | Aplica a un realm ya importado los cambios de esta sección, de forma idempotente |
| Reintento periódico | `worker/main.ts`, cola `idp.sincronizar` | Cada 10 minutos, solo con la bandera encendida |
| Columnas nuevas | migración `0011_usuario_sincronizacion_idp.sql` | `usuario.sin_correo`, `idp_pendiente`, `idp_intentos`, `idp_ultimo_intento`. No toca políticas RLS |

### Crear una cuenta (bandera encendida)

1. `next-safe-action` valida en el servidor el rol del actor y los datos.
2. La plataforma genera el UUID de `usuario.id` antes de todo.
3. Crea el usuario en Keycloak por la Admin API: nombre de usuario igual al correo, `emailVerified`, `enabled: true`, atributo `agora_usuario_id`, sin contraseña y con las acciones requeridas `UPDATE_PASSWORD`, más `CONFIGURE_TOTP` si el perfil es Superadministrador, Administrador, Secretaría o Contador. Recibe el `sub` en la cabecera `Location`.
4. En **una sola transacción**: `persona`, `usuario`, `ba_user` (mismo id), `ba_account` (`provider_id = 'keycloak'`, `account_id = sub`, `user_id = usuario.id`, `issuer = KEYCLOAK_EMISOR` sin barra final, sin contraseña) y la auditoría `crear_usuario` u `otorgar_acceso` (con el rol, el proveedor y el `sub`).
5. Si la transacción falla, borra el usuario en Keycloak (`alta_revertida_idp`). Si ese borrado también falla, registra `cuenta_huerfana_idp` con el `sub`, el nombre de usuario y los dos errores.
6. **Solo después de confirmar la transacción** envía la invitación (`execute-actions-email`, `lifespan=259200`, 72 horas, con `client_id=plataforma-agora`). Si falla, la cuenta queda creada, se audita `invitacion_idp_fallida` y la pantalla ofrece **Reenviar invitación**.
7. Si Keycloak responde 409 porque el correo ya existe, no se reintenta ni se escribe nada en la base. El administrador ve: "Keycloak ya tiene una cuenta con ese correo. No se creó nada…".

Con la bandera apagada, el alta es la de siempre: cuenta `credential` con Argon2id y la contraseña inicial que escribe el administrador.

### Excepción: estudiante sin correo

- La implementa `darDeAltaCuenta` (`src/auth/idp/alta.ts`) cuando recibe `sinCorreo: true`; `validarAcceso` (`src/acciones/personas/persona.ts`) la limita al perfil Estudiante.
- Solo para el perfil Estudiante, marcada en el formulario ("El estudiante no tiene correo propio (excepción)") y auditada (`excepcionSinCorreo: true`).
- La plataforma genera el nombre de usuario (`est-` y 8 caracteres al azar, nunca el documento ni otro dato personal) y una contraseña temporal de 16 caracteres. Las dos se muestran **una sola vez** para entregarlas en persona.
- En Keycloak, el usuario no tiene correo y tiene la credencial marcada `temporary`: en el primer ingreso se le exige `UPDATE_PASSWORD`. No hay invitación.
- En la plataforma, `usuario.correo` y `ba_user.email` guardan `<usuario>@sin-correo.invalid` (dominio reservado que nunca recibe correo), porque las dos columnas son obligatorias y únicas. El token de ID no trae `email`; el `getUserInfo` propio arma ese mismo valor desde `preferred_username`.
- Solo la administración restablece esa contraseña (**Restablecer contraseña**), con otra temporal. "¿Olvidó su contraseña?" no sirve: no hay correo.

### Doble control al ingresar

- *Protocol mapper* `agora_usuario_id` en el cliente `plataforma-agora`, solo en el token de ID.
- Better Auth encuentra la cuenta por `(issuer, sub)` y guarda el token de ID en `ba_account`. En `databaseHooks.session.create.before`, solo en el callback de Keycloak, `verificarIngresoKeycloak` exige que el `sub` del token sea el de la cuenta, que `agora_usuario_id` sea el `usuario.id` y que la cuenta esté activa. Si algo no coincide, no crea la sesión (la persona vuelve a `/login?error=unable_to_create_session`) y audita `rechazo_ingreso_idp` con el motivo.
- Better Auth 1.7.2 exige `sub` y `email` en el perfil. Por eso `getUserInfo` devuelve los dos desde el token de ID ya verificado (`requireIdTokenVerification`).

### Desactivar, reactivar y sincronizar

- `cambiarEstadoUsuario`: en una transacción, `usuario.activo`, borrado de `ba_session` (la sesión cae de inmediato), `idp_pendiente = true` y la auditoría. Después, `enabled` en Keycloak y, al desactivar, `POST /users/{id}/logout`. Si Keycloak responde, `idp_pendiente` vuelve a `false`. Si falla, queda **pendiente de sincronizar**, visible en la pantalla, con **Reintentar sincronización**.
- La cola `idp.sincronizar` reintenta cada 10 minutos solo las cuentas pendientes. Cada intento se audita (`sincronizacion_idp` o `sincronizacion_idp_fallida`, con el número de intento y el error). El actor es `sistema`.
- Con la bandera apagada, una cuenta enlazada que cambia de estado queda pendiente y se sincroniza cuando la bandera vuelva a encenderse.
- Nadie puede desactivar su propia cuenta. No se borran cuentas.

### Quién gestiona cuentas y cambio de perfil (fase 6, 27 de septiembre de 2026)

- Las acciones de cuentas usan `accionGestorCuentas`: solo Superadministrador y Administrador. La regla de qué perfil asigna cada uno está en `src/auth/roles.ts` y se valida en el servidor en el alta y en `cambiarRolUsuario`; RLS la repite en la base (migración `0012`).
- Cambiar el perfil cierra las sesiones de la cuenta en la plataforma y se audita (`cambiar_rol` con el perfil anterior y el nuevo). Si el perfil nuevo exige TOTP y el anterior no, se agrega la acción requerida `CONFIGURE_TOTP` en Keycloak (`totp_idp_exigido`; si falla, `totp_idp_fallido` y la pantalla lo informa).
- Cambiar el perfil lo hace `cambiarRolCuenta` (`src/auth/idp/alta.ts`); el TOTP que corresponde a cada perfil lo decide `accionesRequeridasPara` con la lista `ROLES_CON_TOTP_OBLIGATORIO` (`src/auth/idp/cuentas.ts`). `sincronizarEstadoIdp` no interviene en el TOTP: solo habilita, deshabilita y cierra sesiones.

### Consola de cuenta deshabilitada (28 de septiembre de 2026)

- Los clientes `account` y `account-console` del realm están deshabilitados (en `agora-realm.json` para instalaciones nuevas y con `actualizar-realm-agora.sh` para las existentes). `/realms/agora/account/` responde 404 y entrar por ese cliente muestra "No fue posible continuar" con el tema del colegio.
- Motivo: la consola `keycloak.v3` es una aplicación aparte, con sus propios textos (en tuteo) y estilos; no se podía llevar al sistema visual y al trato de usted de forma confiable. La administración gestiona las cuentas desde el panel.
- Contraseña: la persona la define con la invitación y la cambia con "¿Olvidó su contraseña?" (correo con enlace de 15 minutos). La administración puede reenviar la invitación, que incluye `UPDATE_PASSWORD`.
- TOTP: obligatorio por perfil con `CONFIGURE_TOTP` en el alta y al cambiar de perfil; para los perfiles donde es opcional, el botón **Pedir verificación en dos pasos** (`exigirTotpUsuario`) agrega la acción requerida. Como no hay consola, nadie puede quitarse el TOTP.
- Correo de invitación: la plantilla `executeActions.ftl` del tema une las acciones con "y".

### Cambio de correo

Primero Keycloak (correo y nombre de usuario; un 409 detiene todo), después la base (`usuario.correo`, `ba_user.email` y la auditoría `cambiar_correo` con el anterior y el nuevo). Si la base falla, se devuelve Keycloak al correo anterior; si eso falla, se audita `correo_desincronizado_idp`. El enlace por `sub` no cambia.

### Realm

- Perfil de usuario declarado (`realm/perfil-usuario.json`, el mismo del realm): `agora_usuario_id` con lectura y edición solo para `admin`. Usuario, correo y nombres: la persona los ve, pero solo la administración los edita. `editUsernameAllowed: true` para que la Admin API pueda cambiar el nombre de usuario al cambiar el correo; la persona sigue sin poder cambiarlo, por los permisos del perfil.
- `registrationEmailAsUsername: false`: el nombre de usuario lo fija la plataforma (el correo, o el generado para la excepción).
- Cliente `plataforma-admin`: confidencial, solo cuenta de servicio (sin flujo estándar, implícito ni *direct grants*), token de 2 minutos, rol de cliente `realm-management`: `manage-users` y `view-users`. Verificado: responde 200 en los usuarios de `agora` y 403 en los clientes y en el realm `master`.
- Tema de correo `agora` (`themes/agora/email`), con los textos de invitación y restablecimiento en trato de usted.
- La acción requerida `delete_credential` no está registrada: nadie puede quitarse el TOTP desde la consola de su cuenta.

### Secretos, red y servicio de sincronización (27 de septiembre de 2026)

- El secreto del cliente `plataforma-admin` solo lo tienen `web` y el servicio `cuentas-idp`. En producción es el secreto de Docker `keycloak-admin-secret`, montado solo en esos dos y leído con `KEYCLOAK_ADMIN_CLIENTE_SECRETO_FILE` (`src/env.ts`); ya no va en `agora-env`. En desarrollo va en el `.env` único, que leen todos los servicios. El mismo valor va en `keycloak-env` para que Keycloak lo conozca en producción. `web` no arranca con la bandera encendida si le falta (`exigirSecretoDeAdministracionIdp`, `src/arranque.ts`).
- `cuentas-idp`: misma imagen del worker, pero corre `worker/idp.ts`, que solo atiende la cola `idp.sincronizar` (cada 10 minutos, `sincronizarPendientesIdp`). No lanza Chromium. Ahí también se ejecuta `src/auth/idp/migrar-cuentas.ts`.
- Red interna `idp-admin`: solo `web`, `cuentas-idp` y `keycloak`. `pdf` ya no está en ella ni tiene el secreto: verificado que no resuelve `keycloak` y que una llamada a la Admin API desde `pdf` falla con "Falta KEYCLOAK_ADMIN_CLIENTE_SECRETO".
- En desarrollo, `keycloak` dejó la red `internal`: usa `idp`, `idp-admin` y `correo` (esta última, compartida solo con Mailpit y no interna, para publicar el puerto 8082).
- `KEYCLOAK_URL_INTERNA=http://keycloak:8080/realms/agora` en `agora-env`. Traefik sigue sin publicar `/admin`.

### Poner en marcha en un entorno con el realm ya importado

1. Agregar `KEYCLOAK_ADMIN_CLIENTE_SECRETO` a los dos secretos y reconstruir la imagen de Keycloak.
2. `docker compose exec keycloak /opt/keycloak/bin/actualizar-realm-agora.sh` (usa el administrador de arranque o `KCADM_USUARIO` y `KCADM_CLAVE`). Se puede correr las veces que haga falta.
3. Aplicar la migración `0011` (servicio `migrate`).
4. Simulacro de la migración de cuentas: `docker compose exec pdf node --import tsx/esm src/auth/idp/migrar-cuentas.ts --simulacro`. Después, sin `--simulacro`. Con `--sin-invitacion` enlaza sin enviar correos. Es idempotente: reutiliza el usuario de Keycloak si ya tiene el `agora_usuario_id` y no vuelve a tocar las cuentas ya enlazadas. Las cuentas `credential` se conservan mientras la bandera esté apagada.
5. Encender `AUTH_KEYCLOAK_HABILITADO` y recrear `web` y `pdf`.

### Comprobado (25 de septiembre de 2026)

- Pruebas de integración (`tests/integracion/cuentas-idp.test.ts`, base real y Keycloak simulado): alta y enlace en una transacción; invitación enviada después del *commit*; 409 sin reintento ni escritura; compensación; cuenta huérfana auditada; invitación fallida; excepción sin correo; baja con sesiones borradas; Keycloak caído, pendiente y resuelto por el reintento con cada intento auditado; cambio de correo sin tocar el `sub`; bandera apagada.
- De punta a punta con la bandera encendida (`tests/e2e/keycloak-cuentas.spec.ts`, contra Keycloak y Mailpit reales):
  - Profesor: invitación en Mailpit, contraseña propia, su panel y sin errores de CSP en los dos dominios. Al desactivarlo cae su sesión en la plataforma y sus sesiones en Keycloak pasan a 0, y no puede volver a entrar. Reactivado, vuelve a entrar. Después de cambiar su correo entra con el nuevo.
  - Superadministrador nuevo: contraseña y TOTP exigidos, y entra con código.
  - Estudiante sin correo: entra con la credencial temporal, se le exige cambiarla y llega a su panel.
  - Documento duplicado: la base falla y el usuario de Keycloak se borra.
  - Consola de cuenta: `agora_usuario_id` no aparece, y un intento de cambiarlo (y de cambiar el usuario) por la API de cuenta no tiene efecto.
- Con la bandera apagada, las pruebas de punta a punta anteriores pasan igual; las de Keycloak se omiten.
- Migración de las 2 cuentas de desarrollo: enlazadas e invitadas. La segunda corrida no encuentra nada que hacer.
