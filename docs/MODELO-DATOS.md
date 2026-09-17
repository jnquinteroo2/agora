# MODELO DE DATOS — Plataforma Ágora

Esquema Postgres 18. Drizzle ORM. Todas las tablas con RLS activo y forzado (FORCE ROW LEVEL SECURITY).  
Identificadores públicos: UUID v7. Nunca enteros secuenciales expuestos en URL.  
Borrado lógico en entidades académicas y financieras (columna `eliminado_en timestamptz`).  
Movimientos contables: nunca se borran, se anulan con contrapartida.

---

## Convenciones

- `id` → `uuid` NOT NULL DEFAULT gen_uuid_v7() PRIMARY KEY
- `creado_en` → `timestamptz` NOT NULL DEFAULT now()
- `actualizado_en` → `timestamptz` NOT NULL DEFAULT now()  (trigger on update)
- `eliminado_en` → `timestamptz` (null = activo)
- Nombres en `snake_case` español
- Llaves foráneas con `ON DELETE RESTRICT` por defecto; `CASCADE` solo donde semánticamente correcto

---

## Tablas de configuración institucional

```sql
-- Datos del colegio (singleton, siempre una fila)
CREATE TABLE configuracion_institucional (
  id               uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  nombre_legal     text NOT NULL,
  nombre_corto     text NOT NULL,
  lema             text,
  nit              text,
  dane             text,
  resolucion       text,
  direccion        text,
  municipio        text,
  departamento     text,
  telefono         text,
  correo           text,
  escudo_url       text,           -- servido por /api/archivos/:id
  rector_nombre    text NOT NULL,
  rector_firma_url text,
  dir_adm_nombre   text NOT NULL,
  dir_adm_firma_url text,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

-- Años lectivos
CREATE TABLE anio_lectivo (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  nombre       text NOT NULL,      -- ej. "2025"
  inicio       date NOT NULL,
  fin          date NOT NULL,
  activo       boolean NOT NULL DEFAULT false,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Jornadas
CREATE TABLE jornada (
  id       uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  codigo   char(1) NOT NULL UNIQUE,   -- D, N, S
  nombre   text NOT NULL,
  detalle  text
);

-- Ciclos CLEI
CREATE TABLE ciclo (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  codigo          text NOT NULL UNIQUE,  -- 3A, 3B, 4A, 4B, 5, 6
  grado_equivalente text NOT NULL,       -- Sexto, Séptimo…
  esquema_periodos  text NOT NULL        -- 'cuatro' | 'dos' | 'media'
);

-- Escala de valoración (por año lectivo)
CREATE TABLE escala_valoracion (
  id            uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  nivel         text NOT NULL,    -- Bajo, Básico, Alto, Superior
  desde         numeric(3,1) NOT NULL,
  hasta         numeric(3,1) NOT NULL,
  orden         int NOT NULL
);

-- Periodos (instancias por año lectivo y esquema)
CREATE TABLE periodo (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  numero          smallint NOT NULL,   -- 1..4 o 1..2
  esquema         text NOT NULL,       -- 'cuatro' | 'dos' | 'media'
  inicio          date NOT NULL,
  fin             date NOT NULL,
  notas_abiertas  boolean NOT NULL DEFAULT false,
  cerrado_en      timestamptz,
  UNIQUE(anio_lectivo_id, numero, esquema)
);
```

---

## Plan de estudios

```sql
-- Áreas académicas
CREATE TABLE area (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  nombre       text NOT NULL,
  eliminado_en timestamptz
);

-- Asignaturas
CREATE TABLE asignatura (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  area_id      uuid NOT NULL REFERENCES area(id),
  nombre       text NOT NULL,
  eliminado_en timestamptz
);

-- Asignatura en el plan de estudios de un ciclo (con intensidad horaria)
CREATE TABLE plan_asignatura (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  ciclo_id        uuid NOT NULL REFERENCES ciclo(id),
  asignatura_id   uuid NOT NULL REFERENCES asignatura(id),
  horas_semana    smallint NOT NULL DEFAULT 1,
  UNIQUE(anio_lectivo_id, ciclo_id, asignatura_id)
);

-- Cursos (grupo concreto: ciclo + jornada + año)
CREATE TABLE curso (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  ciclo_id        uuid NOT NULL REFERENCES ciclo(id),
  jornada_id      uuid NOT NULL REFERENCES jornada(id),
  nombre          text NOT NULL,   -- ej. "4B Nocturna 2025"
  eliminado_en    timestamptz,
  UNIQUE(anio_lectivo_id, ciclo_id, jornada_id)
);

-- Banco de descriptores
CREATE TABLE descriptor (
  id            uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  asignatura_id uuid NOT NULL REFERENCES asignatura(id),
  nivel         text NOT NULL,   -- Bajo | Básico | Alto | Superior
  texto         text NOT NULL,
  eliminado_en  timestamptz
);
```

---

## Personas

```sql
-- Tabla base de personas (estudiantes, docentes, acudientes)
CREATE TABLE persona (
  id               uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  tipo_documento   text NOT NULL,   -- CC, TI, CE, PEP…
  numero_documento text NOT NULL,
  primer_nombre    text NOT NULL,
  segundo_nombre   text,
  primer_apellido  text NOT NULL,
  segundo_apellido text,
  fecha_nacimiento date,
  lugar_nacimiento text,
  genero           text,
  telefono         text,
  correo           text,
  direccion        text,
  eps              text,
  discapacidad     text,
  necesidad_edu    text,
  UNIQUE(tipo_documento, numero_documento),
  eliminado_en     timestamptz
);

-- Usuarios del sistema (persona + credenciales)
CREATE TABLE usuario (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  persona_id      uuid NOT NULL REFERENCES persona(id),
  correo          text NOT NULL UNIQUE,
  rol             text NOT NULL,   -- superadmin | docente | estudiante
  activo          boolean NOT NULL DEFAULT true,
  primer_ingreso  boolean NOT NULL DEFAULT true,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
  -- Las credenciales las gestiona Better Auth en sus propias tablas
);

-- Relación estudiante ↔ acudiente (y madre/padre/familiar)
CREATE TABLE estudiante_familiar (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  estudiante_id uuid NOT NULL REFERENCES persona(id),
  familiar_id   uuid NOT NULL REFERENCES persona(id),
  tipo          text NOT NULL,  -- acudiente | madre | padre | familiar_contacto
  autorizacion_habeas_data boolean NOT NULL DEFAULT false,
  autorizacion_fecha       timestamptz,
  autorizacion_version     text
);
```

---

## Admisiones y matrícula

```sql
-- Aspirantes (formulario de inscripción en línea)
CREATE TABLE aspirante (
  id                 uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  radicado           text NOT NULL UNIQUE,  -- generado: AGORA-2025-0001
  persona_id         uuid REFERENCES persona(id),
  ciclo_id           uuid REFERENCES ciclo(id),
  jornada_id         uuid REFERENCES jornada(id),
  estado             text NOT NULL DEFAULT 'pendiente',
    -- pendiente | en_revision | aprobado | rechazado | matriculado
  motivo_rechazo     text,
  datos_formulario   jsonb NOT NULL,   -- snapshot completo del formulario
  autorizacion_datos boolean NOT NULL DEFAULT false,
  autorizacion_fecha timestamptz,
  autorizacion_version text,
  revisado_por       uuid REFERENCES usuario(id),
  revisado_en        timestamptz,
  creado_en          timestamptz NOT NULL DEFAULT now()
);

-- Matrícula (estudiante inscrito en un curso para un año lectivo)
CREATE TABLE matricula (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  estudiante_id   uuid NOT NULL REFERENCES persona(id),
  curso_id        uuid NOT NULL REFERENCES curso(id),
  aspirante_id    uuid REFERENCES aspirante(id),
  estado          text NOT NULL DEFAULT 'activo',
    -- activo | retirado | promovido | no_promovido
  contrato_folio  text,
  contrato_pdf_id uuid,    -- FK a archivo
  creado_en       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(anio_lectivo_id, estudiante_id)
);

-- Historia académica (por grado, para el formulario de inscripción)
CREATE TABLE historia_academica (
  id            uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  persona_id    uuid NOT NULL REFERENCES persona(id),
  institucion   text NOT NULL,
  grado         text NOT NULL,
  anio          smallint NOT NULL,
  aprobado      boolean NOT NULL DEFAULT true
);
```

---

## Asignación docente

```sql
-- Docente asignado a una asignatura en un curso y año
CREATE TABLE asignacion_docente (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  docente_id      uuid NOT NULL REFERENCES usuario(id),
  asignatura_id   uuid NOT NULL REFERENCES asignatura(id),
  curso_id        uuid NOT NULL REFERENCES curso(id),
  UNIQUE(anio_lectivo_id, docente_id, asignatura_id, curso_id)
);
```

---

## Calificaciones, fallas y descriptores

```sql
-- Nota de un estudiante en una asignatura, periodo y curso
CREATE TABLE calificacion (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  matricula_id    uuid NOT NULL REFERENCES matricula(id),
  asignatura_id   uuid NOT NULL REFERENCES asignatura(id),
  periodo_id      uuid NOT NULL REFERENCES periodo(id),
  nota            numeric(3,1),
  nivel_desempeno text,          -- calculado y persistido al guardar
  descriptor_id   uuid REFERENCES descriptor(id),
  descriptor_texto text,         -- texto libre si no usa el banco
  fallas          smallint NOT NULL DEFAULT 0,
  bloqueado       boolean NOT NULL DEFAULT false,
  registrado_por  uuid NOT NULL REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(matricula_id, asignatura_id, periodo_id)
);

-- Historial de cambios de calificación (solo append)
CREATE TABLE calificacion_historial (
  id               uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  calificacion_id  uuid NOT NULL REFERENCES calificacion(id),
  nota_anterior    numeric(3,1),
  nota_nueva       numeric(3,1),
  fallas_anterior  smallint,
  fallas_nueva     smallint,
  razon            text,
  modificado_por   uuid NOT NULL REFERENCES usuario(id),
  modificado_en    timestamptz NOT NULL DEFAULT now()
);
```

---

## Observador del estudiante

```sql
-- Registro en el observador (fechado, con firma)
CREATE TABLE observador_registro (
  id            uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  matricula_id  uuid NOT NULL REFERENCES matricula(id),
  tipo          text NOT NULL,   -- dialogo | observacion | compromiso | decision_final
  descripcion   text NOT NULL,
  firmado_estudiante boolean NOT NULL DEFAULT false,
  firmado_acudiente  boolean NOT NULL DEFAULT false,
  registrado_por uuid NOT NULL REFERENCES usuario(id),
  creado_en      timestamptz NOT NULL DEFAULT now()
);
```

---

## Finanzas — Ingresos

```sql
-- Conceptos de cobro (matrícula, pensión, certificado…)
CREATE TABLE concepto_ingreso (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  nombre       text NOT NULL,
  descripcion  text,
  eliminado_en timestamptz
);

-- Plan de cobro por estudiante y año (pensiones programadas)
CREATE TABLE plan_cobro (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  matricula_id    uuid NOT NULL REFERENCES matricula(id),
  concepto_id     uuid NOT NULL REFERENCES concepto_ingreso(id),
  mes             smallint,           -- 1..12, null si no es mensual
  valor_programado numeric(12,0) NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now()
);

-- Recibo de caja (ingreso)
CREATE TABLE recibo_caja (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  consecutivo     int NOT NULL,       -- sin huecos, generado con FOR UPDATE
  matricula_id    uuid REFERENCES matricula(id),
  beneficiario    text NOT NULL,      -- nombre si no hay matricula_id
  concepto_id     uuid NOT NULL REFERENCES concepto_ingreso(id),
  descripcion     text,
  valor           numeric(12,0) NOT NULL,
  forma_pago      text NOT NULL,      -- efectivo | transferencia | cheque
  fecha           date NOT NULL,
  pdf_id          uuid,               -- FK a archivo, generado después
  anulado         boolean NOT NULL DEFAULT false,
  anulacion_motivo text,
  anulado_por     uuid REFERENCES usuario(id),
  anulado_en      timestamptz,
  registrado_por  uuid NOT NULL REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(anio_lectivo_id, consecutivo)
);
```

---

## Finanzas — Egresos

```sql
-- Categorías de gasto
CREATE TABLE categoria_egreso (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  nombre       text NOT NULL,
  eliminado_en timestamptz
);

-- Comprobante de egreso
CREATE TABLE egreso (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  consecutivo     int NOT NULL,
  categoria_id    uuid NOT NULL REFERENCES categoria_egreso(id),
  beneficiario    text NOT NULL,
  descripcion     text,
  valor           numeric(12,0) NOT NULL,
  fecha           date NOT NULL,
  soporte_id      uuid,               -- FK a archivo adjunto
  pdf_id          uuid,
  anulado         boolean NOT NULL DEFAULT false,
  anulacion_motivo text,
  anulado_por     uuid REFERENCES usuario(id),
  anulado_en      timestamptz,
  registrado_por  uuid NOT NULL REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(anio_lectivo_id, consecutivo)
);

-- Nomina docente por bloque
CREATE TABLE nomina_bloque (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  docente_id      uuid NOT NULL REFERENCES usuario(id),
  periodo_id      uuid NOT NULL REFERENCES periodo(id),
  tipo_jornada    text NOT NULL,     -- diurno | sabatino
  bloques         smallint NOT NULL,
  valor_bloque    numeric(10,0) NOT NULL,
  total           numeric(12,0) GENERATED ALWAYS AS (bloques * valor_bloque) STORED,
  egreso_id       uuid REFERENCES egreso(id),
  creado_en       timestamptz NOT NULL DEFAULT now()
);

-- Caja menor
CREATE TABLE caja_menor_movimiento (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  tipo            text NOT NULL,     -- desembolso | legalizacion
  descripcion     text NOT NULL,
  valor           numeric(10,0) NOT NULL,
  soporte_id      uuid,
  registrado_por  uuid NOT NULL REFERENCES usuario(id),
  fecha           date NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now()
);
```

---

## Archivos

```sql
-- Metadatos de todos los archivos (imágenes, PDF, soportes)
CREATE TABLE archivo (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  nombre_orig  text NOT NULL,
  nombre_stor  text NOT NULL UNIQUE,  -- UUID reescrito en MinIO/volumen
  bucket       text NOT NULL,
  mime         text NOT NULL,
  bytes        int NOT NULL,
  hash_sha256  text NOT NULL,
  subido_por   uuid REFERENCES usuario(id),
  creado_en    timestamptz NOT NULL DEFAULT now()
);

-- Documento generado (boletín, recibo, constancia…)
CREATE TABLE documento_generado (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  tipo            text NOT NULL,     -- boletin | recibo_caja | comprobante_egreso | constancia | certificado | contrato
  entidad_id      uuid NOT NULL,     -- matricula_id, recibo_caja_id, etc.
  anio_lectivo_id uuid REFERENCES anio_lectivo(id),
  periodo_id      uuid REFERENCES periodo(id),
  archivo_id      uuid NOT NULL REFERENCES archivo(id),
  hash_contenido  text NOT NULL,     -- SHA256 del HTML renderizado (evita regenerar lo idéntico)
  generado_por    uuid REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now()
);
```

---

## Auditoría

```sql
-- Solo append. Sin UPDATE ni DELETE para el usuario de aplicación.
CREATE TABLE auditoria (
  id            uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  actor_id      uuid,              -- null si sistema
  actor_rol     text,
  accion        text NOT NULL,     -- crear | modificar | anular | ver_expediente | login | login_fallido…
  entidad       text NOT NULL,     -- calificacion | recibo_caja | usuario…
  entidad_id    uuid,
  diferencia    jsonb,             -- {antes: {…}, despues: {…}}
  ip            inet,
  user_agent    text,
  creado_en     timestamptz NOT NULL DEFAULT now()
);
```

---

## CMS

```sql
CREATE TABLE cms_entrada (
  id           uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  tipo         text NOT NULL,    -- blog | pagina | aliado | testimonio | equipo | album | circular
  slug         text NOT NULL,
  titulo       text NOT NULL,
  subtitulo    text,
  cuerpo       text,             -- HTML sanitizado en servidor
  meta_desc    text,
  meta_img_id  uuid REFERENCES archivo(id),
  estado       text NOT NULL DEFAULT 'borrador',  -- borrador | publicado
  publicar_en  timestamptz,
  autor_id     uuid REFERENCES usuario(id),
  creado_en    timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  eliminado_en timestamptz,
  UNIQUE(tipo, slug)
);

CREATE TABLE cms_album_foto (
  id         uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  album_id   uuid NOT NULL REFERENCES cms_entrada(id),
  archivo_id uuid NOT NULL REFERENCES archivo(id),
  alt        text NOT NULL,
  orden      smallint NOT NULL DEFAULT 0
);
```

---

## Políticas RLS — resumen por tabla

| Tabla | superadmin | docente | estudiante | sistema/anon |
|---|---|---|---|---|
| `configuracion_institucional` | ALL | SELECT | SELECT | — |
| `anio_lectivo`, `ciclo`, `jornada`, `periodo` | ALL | SELECT | SELECT | — |
| `area`, `asignatura`, `plan_asignatura` | ALL | SELECT | SELECT | — |
| `persona` | ALL | SELECT (solo personas de sus cursos) | SELECT (solo sí mismo + familiares) | — |
| `usuario` | ALL | SELECT (propio) | SELECT (propio) | — |
| `aspirante` | ALL | — | SELECT (propio) | INSERT (formulario público con token) |
| `matricula` | ALL | SELECT (solo cursos asignados) | SELECT (propia) | — |
| `asignacion_docente` | ALL | SELECT (propia) | SELECT (de su curso) | — |
| `calificacion` | ALL | SELECT/INSERT/UPDATE (asignaturas asignadas, periodo abierto) | SELECT (propia) | — |
| `calificacion_historial` | SELECT | — | — | — |
| `observador_registro` | ALL | INSERT/SELECT (sus cursos) | SELECT parcial (tipos visibles) | — |
| `recibo_caja` | ALL | — | SELECT (propia matricula_id) | — |
| `egreso`, `nomina_bloque`, `caja_menor_movimiento` | ALL | — | — | — |
| `archivo` | ALL | SELECT/INSERT (propios) | SELECT (propios docs) | — |
| `documento_generado` | ALL | SELECT (sus cursos) | SELECT (propio) | SELECT (verificación, sin datos personales) |
| `auditoria` | SELECT | — | — | — |
| `cms_entrada` | ALL | — | SELECT (publicados) | SELECT (publicados) |

**Implementación técnica**:
```sql
-- Cada transacción de aplicación abre con:
SET LOCAL app.user_id  = '<uuid>';
SET LOCAL app.role     = 'docente';         -- superadmin | docente | estudiante
SET LOCAL app.year     = '<anio_lectivo_id>';

-- Ejemplo de política para calificacion (docente):
CREATE POLICY calificacion_docente_select ON calificacion
  FOR SELECT TO app_user
  USING (
    current_setting('app.role') = 'docente'
    AND EXISTS (
      SELECT 1 FROM asignacion_docente ad
      JOIN matricula m ON m.curso_id = ad.curso_id
      WHERE ad.docente_id   = current_setting('app.user_id')::uuid
        AND ad.asignatura_id = calificacion.asignatura_id
        AND m.id             = calificacion.matricula_id
        AND ad.anio_lectivo_id = current_setting('app.year')::uuid
    )
  );
```

---

## Consecutivos — garantía sin huecos

```sql
-- Tabla de control de secuencias (bloqueo pesimista)
CREATE TABLE secuencia (
  id              uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  anio_lectivo_id uuid NOT NULL REFERENCES anio_lectivo(id),
  tipo            text NOT NULL,   -- recibo_caja | comprobante_egreso | radicado_aspirante | folio_contrato
  ultimo          int NOT NULL DEFAULT 0,
  UNIQUE(anio_lectivo_id, tipo)
);

-- Función que incrementa atómicamente
CREATE OR REPLACE FUNCTION siguiente_consecutivo(p_anio uuid, p_tipo text)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_siguiente int;
BEGIN
  SELECT ultimo + 1 INTO v_siguiente
  FROM secuencia
  WHERE anio_lectivo_id = p_anio AND tipo = p_tipo
  FOR UPDATE;

  UPDATE secuencia SET ultimo = v_siguiente
  WHERE anio_lectivo_id = p_anio AND tipo = p_tipo;

  RETURN v_siguiente;
END;
$$;
```

---

## Índices críticos

```sql
-- Calificaciones: acceso por matrícula y por asignatura+curso (docente)
CREATE INDEX idx_calificacion_matricula ON calificacion(matricula_id);
CREATE INDEX idx_calificacion_asignatura_periodo ON calificacion(asignatura_id, periodo_id);

-- Matrícula: búsqueda por estudiante y año
CREATE INDEX idx_matricula_estudiante_anio ON matricula(estudiante_id, anio_lectivo_id);

-- Auditoría: filtro por entidad y fecha
CREATE INDEX idx_auditoria_entidad_fecha ON auditoria(entidad, creado_en DESC);

-- Recibos y egresos: por año y fecha
CREATE INDEX idx_recibo_anio_fecha ON recibo_caja(anio_lectivo_id, fecha DESC);
CREATE INDEX idx_egreso_anio_fecha ON egreso(anio_lectivo_id, fecha DESC);

-- CMS: por tipo y estado
CREATE INDEX idx_cms_tipo_estado ON cms_entrada(tipo, estado, publicar_en DESC)
  WHERE eliminado_en IS NULL;
```
