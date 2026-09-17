# ARQUITECTURA — Plataforma Ágora

## Decisión central

Monolito Next.js 16 containerizado. Un repositorio, un proceso web, sin microservicios. La complejidad se gestiona con separación de capas en código, no en red.

---

## Diagrama de contenedores

```
Internet
   │  80/443
   ▼
┌──────────────────────────────────────────────────────────┐
│  proxy (Traefik 3)                                        │
│  • TLS automático Let's Encrypt                           │
│  • Redireccion HTTP → HTTPS                               │
│  • Cabeceras de seguridad globales                        │
│  • Rate-limit a nivel de borde por IP                     │
│  • Panel de administración deshabilitado                  │
└──────────────────┬───────────────────────────────────────┘
                   │ red: edge
                   ▼
┌──────────────────────────────────────────────────────────┐
│  web (Next.js 16 standalone)                              │
│  • App Router, Server Components, Server Actions          │
│  • next-safe-action con middleware auth + rate-limit      │
│  • Imagen: node:alpine no-root UID=1001 read-only FS      │
│  • Healthcheck: GET /api/health → 200                     │
└───┬──────────┬──────────┬──────────────┬─────────────────┘
    │          │          │              │   red: internal
    ▼          ▼          ▼              ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌──────────────┐
│  db    │ │cache │ │ storage │ │    pdf       │
│Postgres│ │Valkey│ │ MinIO / │ │  worker      │
│   18   │ │  8   │ │  volumen│ │ (Playwright) │
│  RLS   │ │      │ │  local  │ │  pg-boss     │
└────────┘ └──────┘ └─────────┘ └──────────────┘
    ▲
┌────────┐
│ backup │
│pg_dump │
│  age   │
└────────┘
```

**Regla de red**: solo `proxy` tiene puertos publicados (80, 443). Todos los demás servicios viven en la red `internal` sin salida a internet. El contenedor `pdf` tampoco alcanza internet.

---

## Flujo de una petición típica

```
Navegador
  → HTTPS → Traefik (TLS, headers, rate-limit)
  → HTTP interno → web (Next.js)
      → middleware.ts (sesión válida + rol autorizado para la ruta)
      → Server Component o Server Action
          → next-safe-action middleware (resuelve sesión, valida permiso concreto, valida Zod)
          → src/datos/ (Drizzle query)
              → SET LOCAL app.user_id / app.role / app.year
              → Postgres con RLS activo (policy evalúa SET LOCAL)
          ← filas filtradas por RLS
      ← datos serializados
  ← HTML / JSON / streaming RSC
Navegador
```

---

## Capas de código

```
/
├── app/                          Next.js App Router
│   ├── (publico)/                Sitio institucional (no auth)
│   ├── (auth)/                   Login, recover, TOTP
│   ├── (panel)/
│   │   ├── admin/                Rutas superadmin
│   │   ├── docente/              Rutas docente
│   │   └── estudiante/           Rutas estudiante
│   └── api/
│       ├── health/               Healthcheck
│       ├── archivos/[id]/        Entrega archivos con verificación de permisos
│       └── verificar/[id]/       Verificación pública de documentos (sin datos personales)
│
├── src/
│   ├── dominio/                  Lógica de negocio pura (sin framework)
│   │   ├── calificaciones.ts     Promedios, niveles, definitivas
│   │   ├── consecutivos.ts       Generación transaccional de recibos y comprobantes
│   │   ├── cartera.ts            Saldos, abonos, estado de cuenta
│   │   └── validaciones.ts       Reglas de negocio compartidas
│   │
│   ├── datos/                    Drizzle ORM + SQL versionado
│   │   ├── schema.ts             Esquema completo tipado
│   │   ├── migraciones/          SQL versionado (Drizzle Kit)
│   │   ├── rls/                  Políticas RLS en SQL (.sql por tabla)
│   │   └── consultas/            Funciones de consulta agrupadas por módulo
│   │
│   ├── auth/                     Better Auth, sesión, permisos
│   │   ├── config.ts
│   │   ├── sesion.ts             Helper: getSession() con caché de request
│   │   └── permisos.ts           can(rol, accion, recurso) puro y testeable
│   │
│   ├── acciones/                 Server Actions por módulo
│   │   ├── academico/
│   │   ├── financiero/
│   │   ├── cms/
│   │   └── auth/
│   │
│   ├── ui/                       Sistema de diseño Ágora
│   │   ├── tokens.css            Variables CSS (Tailwind v4)
│   │   ├── primitivas/           Button, Input, Table, Badge…
│   │   ├── compuestos/           DataTable, FormField, Modal…
│   │   └── iconos/               Lucide + SVG propios (greca, escudo)
│   │
│   └── pdf/                      Plantillas y cliente de cola
│       ├── plantillas/           Componentes servidor → HTML de impresión
│       └── cola.ts               Cliente pg-boss para encolar trabajos
│
├── worker/                       Servicio renderizado PDF
│   ├── Dockerfile
│   └── main.ts                   Consume pg-boss, Playwright → PDF → MinIO
│
├── infra/
│   ├── Dockerfile                Multi-stage (deps → builder → runner)
│   ├── docker-compose.yml        Dev (con override)
│   ├── docker-compose.prod.yml   Prod (imágenes por digest)
│   ├── traefik/                  traefik.yml + dynamic/
│   └── backup/                   pg_dump + age + rotación
│
├── tests/
│   ├── unitarias/                Vitest — dominio puro
│   ├── integracion/              Vitest + Testcontainers — Postgres real con RLS
│   ├── aislamiento/              Suite de roles cruzados (bloqueante)
│   └── e2e/                      Playwright — recorridos críticos
│
└── docs/                         Documentación del proyecto
```

---

## Decisiones clave y razones

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Monolito Next.js | Microservicios | Equipo pequeño, cero overhead de red interna, deployable en un VPS de 4 GB |
| Better Auth | NextAuth / Auth.js | Soporte nativo de sesiones en DB, TOTP integrado, API más predecible |
| Drizzle ORM | Prisma | SQL real visible, migraciones como SQL puro, sin proxy en runtime |
| Postgres 18 con RLS | Cualquier otra DB | RLS es la tercera barrera de autorización; no hay sustituto |
| pg-boss | Bull / Redis streams | Corre sobre Postgres ya presente, elimina un broker adicional |
| Playwright para PDF | Puppeteer / @react-pdf | Fidelidad de CSS de impresión y @page; reproduce el boletín exacto |
| MinIO / volumen local | S3 | Sin dependencia de nube; migrable a S3 con un cambio de URL |
| Valkey | Redis | Fork open-source compatible, sin licencia BSL |
| next-safe-action | fetch manual | Middleware tipado de autenticación y autorización en cada acción, Zod integrado |

---

## Entornos

**Dev** (`docker compose up`):
- Hot reload con volumen montado
- Mailpit como captura de correo (puerto 8025)
- Postgres expuesto en localhost:5432 solo para herramientas locales
- Datos semilla automáticos al primer arranque

**Prod** (`docker compose -f docker-compose.prod.yml up`):
- Imágenes fijadas por digest SHA256
- Sin código montado, sin puertos internos expuestos al host
- Secretos por archivo `.env` con permisos 600 o Docker secrets
- Aprobación manual antes de cada despliegue
