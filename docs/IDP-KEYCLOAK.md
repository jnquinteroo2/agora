# Proveedor de identidad con Keycloak: plan

Estado: **plan, sin implementar.** Ningún contenedor, configuración ni código de este documento existe todavía. El inicio de sesión actual (Better Auth con correo, contraseña y TOTP opcional) sigue como está. Este es un proyecto aparte, posterior a la publicación del sitio, y no bloquea el lanzamiento.

Redactado el 21 de septiembre de 2026.

---

## 1. Versión

| Dato | Valor | Fuente |
|---|---|---|
| Versión estable vigente | **26.7.4**, publicada el 16 de septiembre de 2026 | Página de descargas de keycloak.org y lanzamientos de `github.com/keycloak/keycloak` (la API de GitHub la marca como la última versión estable) |
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
  - URI de redirección exacta, sin comodines: `https://<dominio>/api/auth/oauth2/callback/keycloak`.
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
