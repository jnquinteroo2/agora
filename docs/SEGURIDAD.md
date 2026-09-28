# SEGURIDAD — Modelo de amenazas y controles — Plataforma Ágora

Skill aplicada: `owasp-security` (OWASP Top 10:2025, ASVS 5.0).

---

## Principio rector

Ninguna decisión de autorización ocurre en el cliente. El cliente solo oculta lo que el servidor ya negó. Toda consulta a datos pasa por tres barreras independientes.

---

## Modelo de amenazas (STRIDE aplicado)

### Actores externos

| Actor | Motivación probable | Superficie de ataque |
|---|---|---|
| Padre/acudiente no autorizado | Ver notas o estado de cuenta de otro estudiante | Portal web — rutas de estudiante |
| Docente curioso | Ver notas de asignaturas que no dicta | Server Actions — planilla de calificaciones |
| Ex-empleado | Acceso con credenciales revocadas | Autenticación — sesión |
| Bot/scraper | Extraer datos de inscripción, directorio | Formularios públicos |
| Atacante externo | Inyección SQL, XSS, CSRF, escalación de privilegios | API completa |
| Proveedor comprometido | Dependencia maliciosa en cadena de suministro | npm, Docker images |

---

## Barreras de defensa en profundidad

### Barrera 1 — Middleware de ruta (Next.js `middleware.ts`)

```
Petición entrante
  → ¿Tiene cookie de sesión válida?
      No → redirect /login (o 401 si es API)
      Sí → ¿El segmento de ruta corresponde al rol de la sesión?
              No → 403
              Sí → pasa a la aplicación
```

Rutas agrupadas en el App Router:
- `(publico)/` → sin auth requerida
- `(auth)/` → solo sin sesión activa
- `(panel)/admin/` → rol `superadmin`
- `(panel)/docente/` → rol `docente`
- `(panel)/estudiante/` → rol `estudiante`

### Barrera 2 — Server Action / Route Handler (next-safe-action)

Cada acción pasa por middleware en cascada:
1. `resolverSesion` — resuelve la sesión desde la cookie, lanza si inválida
2. `verificarPermiso(accion, recurso)` — comprueba permiso concreto sobre recurso concreto
3. `validarEntrada(schema)` — Zod, lanza con errores detallados
4. Lógica de negocio

Prohibido confiar en IDs que llegan del cliente sin verificar pertenencia al actor autenticado.

### Barrera 3 — Row Level Security (Postgres)

Cada transacción de aplicación:
```sql
BEGIN;
SET LOCAL app.user_id = $1;
SET LOCAL app.role    = $2;
SET LOCAL app.year    = $3;
-- ... operación ...
COMMIT;
```

El usuario de aplicación (`agora_app`) **no tiene** BYPASSRLS. Las políticas se evalúan en cada consulta.

---

## Amenazas OWASP Top 10:2025 y controles

### A01 — Control de acceso roto
**Control**: triple barrera descrita arriba. Suite de pruebas de aislamiento obligatoria y bloqueante: cada entidad sensible tiene un caso con rol equivocado y con ID de otro usuario, verifica 403/404 en la API y 0 filas en consulta SQL directa bajo el contexto RLS del otro usuario.

### A02 — Fallos criptográficos
**Control**:
- Contraseñas: Argon2id con `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`.
- Transporte: TLS 1.3 obligatorio, HSTS con preload, sin downgrade.
- Backups: cifrados con `age` (clave pública/privada, no simétrico).
- Secretos: solo en `.env` (600) o Docker secrets. Validados con Zod al arranque.
- Verificación de documentos PDF: hash SHA256 del contenido + UUID v7 en QR. La ruta pública solo confirma validez, nunca devuelve datos personales.

### A03 — Inyección
**Control**:
- Drizzle ORM: todas las consultas parametrizadas. Sin SQL por concatenación de cadenas.
- Salida HTML: Next.js escapa por defecto. `dangerouslySetInnerHTML` solo en el CMS y solo tras sanitización en servidor con lista blanca estricta (DOMPurify configurado en node).
- Comandos shell: ninguna operación ejecuta comandos construidos desde input de usuario.

### A04 — Diseño inseguro
**Control**:
- Identificadores públicos: UUID v7, nunca enteros secuenciales en URL.
- Consecutivos sin huecos: función SQL con `FOR UPDATE`, nunca calculados en cliente.
- Movimientos contables: nunca se borran, se anulan con contrapartida y razón.
- Borrado lógico en entidades académicas.
- Ventana de edición de notas controlada por fechas desde el panel del superadmin.
- Generación de PDF en contenedor aislado sin acceso a internet.

### A05 — Configuración de seguridad incorrecta
**Control — cabeceras HTTP** (configuradas en Traefik + `next.config.ts`):
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

**Content Security Policy** — estricta con nonce por petición:
```
default-src 'self';
script-src 'self' 'nonce-{NONCE}';
style-src 'self' 'nonce-{NONCE}';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```
Sin `unsafe-inline` ni `unsafe-eval`. Los estilos y scripts se ajustan a la política, no al revés.

**CSP de las páginas de Keycloak** (`auth.<dominio>`, configurada en el realm `agora`, no en `middleware.ts`):
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-src 'self';
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self' https://<dominio>;
```
- **`'unsafe-inline'` en `script-src`, solo en el dominio de Keycloak.** Después de cada envío de formulario, Keycloak inserta desde el servidor un `<script>` con `history.replaceState(...)` cuya URL lleva `tab_id` y `client_data` distintos en cada solicitud (comprobado el 25 de septiembre de 2026 con dos envíos seguidos). Un hash sha256 no sirve para un contenido que cambia, y Keycloak 26.7.4 no admite nonce en las páginas de su realm. Sin `'unsafe-inline'`, la consola registra una violación de CSP y al recargar se reenvía el formulario. Las plantillas del tema `agora` no tienen scripts en línea: el único script en línea es ese. La plataforma (`middleware.ts`) sigue con nonce y sin `'unsafe-inline'` en scripts.
- **`frame-ancestors 'none'` y `X-Frame-Options: DENY`.** Ninguna página de Keycloak se puede enmarcar. La consola de cuenta, que necesitaba un iframe del mismo origen, está deshabilitada (`IDP-KEYCLOAK.md`, sección 14).
- **`style-src 'self'`.** Las plantillas del tema no usan estilos en línea.

**Límites de tasa en el borde (Traefik, `infra/traefik/dynamic/security.yml`):** `rate-limit-login` (5 cada 15 minutos por IP, ráfaga 10) en `/api/auth` de la plataforma y en los `POST` de credenciales de Keycloak (`/realms/agora/login-actions`); `rate-limit-global` (100 por minuto, ráfaga 200) en el resto. El exceso responde 429 con `Retry-After`. Se suma al límite propio de la aplicación (`RATE_LIMIT_*`).

### A06 — Componentes vulnerables y desactualizados
**Control**:
- `npm audit` en cada push; falla el pipeline ante severidad alta.
- `gitleaks` en pre-commit y en pipeline.
- `supply-chain-risk-auditor` skill antes de cada release.
- Imágenes Docker escaneadas con Trivy. Sin vulnerabilidades críticas en la imagen final.
- Lockfile obligatorio (`package-lock.json`). Sin `npm install --legacy-peer-deps` en producción.
- Imágenes de producción fijadas por digest SHA256.

### A07 — Fallos de identificación y autenticación
**Control**:
- Sesiones en base de datos, no JWT sin estado.
- Cookie: `httpOnly`, `secure`, `sameSite=lax`, `path=/`. Sin acceso desde JavaScript.
- Rotación de identificador de sesión al iniciar sesión y al cambiar privilegios.
- Revocación inmediata desde el panel.
- Expiración por inactividad: 8 h (superadmin), 12 h (docente), 24 h (estudiante).
- Expiración absoluta: 12 h para superadmin.
- TOTP obligatorio para superadmin, opcional para docentes. Códigos de recuperación de un solo uso.
- Bloqueo progresivo: 5 intentos fallidos → bloqueo de 15 min por cuenta + por IP.
- Registro de todo intento fallido en `auditoria`.
- Recuperación de contraseña: token de un solo uso, vida de 1 h, invalida sesiones activas, notificación por correo.
- Política de contraseñas: longitud mínima 12, verificación contra HaveIBeenPwned (k-anonimato). Sin reglas arbitrarias de caracteres.
- Credenciales generadas por el superadmin con cambio obligatorio en el primer ingreso.

**Con Keycloak (`AUTH_KEYCLOAK_HABILITADO=true`)**, detalle en `IDP-KEYCLOAK.md`, sección 14:
- Keycloak autentica y la plataforma autoriza: el rol sale siempre de `usuario.rol`.
- Enlace explícito por `sub`, nunca por correo. En cada ingreso, `databaseHooks.session.create.before` compara el `agora_usuario_id` del token de ID con el usuario resuelto por `(issuer, sub)` y rechaza la sesión si no coincide o si la cuenta está inactiva. El rechazo queda en `auditoria` (`rechazo_ingreso_idp`).
- Alta por invitación de un solo uso (72 horas). La plataforma nunca conoce la contraseña, salvo la temporal de la excepción "estudiante sin correo", que se muestra una sola vez al administrador.
- TOTP obligatorio para Superadministrador, Administrador, Secretaría y Contador (acción requerida `CONFIGURE_TOTP` en el alta). El realm no registra la acción `delete_credential`, así que nadie puede quitarse el TOTP desde la consola de su cuenta.
- La desactivación borra primero las sesiones de la plataforma y luego deshabilita la cuenta y cierra sus sesiones en Keycloak. Si Keycloak falla, la cuenta queda "pendiente de sincronizar" y un trabajo de pg-boss lo reintenta cada 10 minutos. Mientras tanto la plataforma ya la rechaza, porque `usuario.activo` es la última palabra.
- La cuenta de servicio `plataforma-admin` solo tiene `manage-users` y `view-users` en el realm `agora` (responde 403 a clientes y al realm `master`). La Admin API se usa solo por la red interna `idp-admin`: Traefik no publica `/admin`.

### A08 — Fallos de integridad en software y datos
**Control**:
- Subida de archivos:
  1. Lista blanca de tipos MIME (imágenes: jpg/png/webp/avif, documentos: pdf).
  2. Verificación de bytes mágicos (magic bytes), no solo extensión ni `Content-Type`.
  3. Límite de tamaño: imágenes 5 MB, soportes contables 10 MB.
  4. Nombre reescrito a UUID v7.
  5. Almacenamiento fuera de la ruta pública (`/public/`).
  6. `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` en entrega.
  7. Imágenes reprocesadas con `sharp` para eliminar metadatos EXIF y cargas útiles embebidas.
  8. Entrega siempre por route handler que verifica permisos.

### A09 — Fallos de registro y monitorización
**Control**:
- Logs estructurados con `pino`. Redacción automática de: documentos de identidad, correos, teléfonos, números de tarjeta, passwords.
- Sin datos personales en trazas de error del cliente (las trazas van al servidor).
- Tabla `auditoria` de solo append: actor, acción, entidad, ID, diferencia JSON, IP, user-agent, timestamp.
- El usuario de aplicación `agora_app` no tiene permiso de UPDATE ni DELETE sobre `auditoria`.
- Se audita: todo cambio de nota, todo movimiento financiero, todo cambio de rol, todo intento de acceso a expediente ajeno, todo login fallido.
- Bitácora consultable desde el panel del superadmin con filtros por actor/entidad/acción/fecha.

### A10 — Server-Side Request Forgery (SSRF)
**Control**:
- La aplicación web no realiza peticiones HTTP a URLs proporcionadas por el usuario.
- El contenedor PDF no tiene acceso a internet (red `internal` sin salida).
- El contenedor de backup no tiene acceso a internet (solo a `db`).
- Las URLs de verificación de documentos solo apuntan al propio dominio.

---

## Controles adicionales

### CSRF
- Verificación de cabecera `Origin` en toda mutación (Next.js Server Actions incluyen token propio).
- Cookie `sameSite=lax` como defensa adicional.

### Límite de tasa
| Endpoint | Límite | Ventana |
|---|---|---|
| POST /login | 5 intentos | 15 min por IP + cuenta |
| POST /recuperar-contrasena | 3 intentos | 1 h por IP |
| POST /inscripcion (público) | 10 envíos | 1 h por IP |
| POST /contacto | 5 mensajes | 1 h por IP |
| GET /api/archivos/:id | 60 req | 1 min por sesión |
| Cualquier Server Action | 30 req | 1 min por sesión |

Respuesta: `429 Too Many Requests` con `Retry-After`.

### Formularios públicos — anti-bots sin CAPTCHA invasivo
1. Campo trampa oculto con CSS (`display: none`) — si llega con valor, descarta.
2. Marca de tiempo mínima: el formulario debe haberse mostrado al menos 3 segundos antes del envío.
3. Límite de tasa por IP (ver tabla arriba).
4. Turnstile (Cloudflare) solo si se detecta abuso sostenido.

### Habeas Data — Ley 1581 de 2012
- Política de tratamiento de datos publicada en `/privacidad`.
- Casilla de autorización explícita en el formulario de inscripción.
- Registro de la autorización con fecha, IP y versión del texto en `aspirante.autorizacion_*`.
- Para menores de edad: autorización del acudiente en `estudiante_familiar.autorizacion_habeas_data`.
- Procedimiento de consulta, rectificación y supresión disponible desde el panel del superadmin.

---

## Usuarios de base de datos

| Usuario | Permisos | Uso |
|---|---|---|
| `agora_superusuario` | Solo para crear `agora_app` y `agora_migraciones` | Solo en el script de inicialización |
| `agora_migraciones` | DDL sobre el schema `public` | Solo en el contenedor de migraciones, al arranque |
| `agora_app` | DML (INSERT/SELECT/UPDATE/DELETE) sobre tablas específicas. Sin DDL. Sin BYPASSRLS. Sin SUPERUSER. | Aplicación en tiempo de ejecución |
| `agora_backup` | CONNECT + SELECT (para pg_dump) | Contenedor de backup |

---

## Verificación continua

| Herramienta | Cuándo | Falla el pipeline si |
|---|---|---|
| `gitleaks` | pre-commit + cada push | Detecta un secreto |
| `npm audit` | cada push | Severidad alta o crítica |
| `semgrep` (OWASP + reglas propias) | cada push | Hallazgo de severidad alta |
| `codeql` | cada push | Hallazgo de severidad alta |
| `trivy` | imagen construida | Vulnerabilidad crítica en imagen final |
| `supply-chain-risk-auditor` | antes de cada release | Dependencia de riesgo alto |
| Suite de aislamiento (Vitest + Testcontainers) | cada push | Cualquier falla |

Al cerrar la fase de hardening (Fase 8): ejecutar `owasp-security` + `audit-context-building` + `fp-check` sobre todo el código. Entregar informe con hallazgos, severidad y corrección aplicada. Cero severidad alta o crítica pendiente.

---

## Checklist de entrega por fase

- [ ] **Fase 3**: Suite de aislamiento verde. Muestra salida.
- [ ] **Fase 5**: Notas de un docente no alcanzables por otro docente ni por un estudiante ajeno.
- [ ] **Fase 6**: Recibos y egresos de un año no visibles para docentes ni estudiantes.
- [ ] **Fase 8**: Semgrep + CodeQL + Trivy sin hallazgos altos. Informe completo.
- [ ] **Todas**: Ningún secreto en el repositorio. `gitleaks` verde.
