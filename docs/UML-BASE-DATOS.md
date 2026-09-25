# Modelo UML de la base de datos — Agora

> Documento técnico del modelo de datos de Agora.  
> Fuente de verdad: `src/datos/esquema.ts`.

## 1. Alcance

El modelo de datos soporta:

- configuración institucional;
- años lectivos, jornadas, ciclos y periodos;
- áreas, asignaturas y planes académicos;
- aspirantes y procesos de matrícula;
- estudiantes, acudientes, docentes y usuarios;
- asignación docente y evaluación académica;
- cartera, caja, egresos y nómina;
- archivos y documentos generados;
- auditoría, control de acceso y limitación de solicitudes;
- autenticación mediante Better Auth;
- contenido institucional administrable mediante CMS.

Los diagramas se dividen por dominios funcionales para facilitar su lectura. Las entidades que participan en más de un dominio pueden aparecer en más de un diagrama.

---

## 2. Perfiles funcionales

La plataforma contempla los siguientes perfiles:

1. Profesor
2. Estudiante
3. Acudiente
4. Secretaría
5. Administrador
6. Superadministrador
7. Contador

Actualmente, el perfil principal se almacena en:

```text
USUARIO.rol
```

| Perfil funcional | Valor técnico documentado |
|---|---|
| Profesor | `profesor` |
| Estudiante | `estudiante` |
| Acudiente | `acudiente` |
| Secretaría | `secretaria` |
| Administrador | `administrador` |
| Superadministrador | `superadmin` |
| Contador | `contador` |

> El esquema actual utiliza un único campo de texto para representar el rol principal. No existen todavía las entidades `ROL`, `PERMISO` ni `USUARIO_ROL`. Si se requiere asignar múltiples perfiles a una misma persona, deberá diseñarse posteriormente un modelo RBAC formal.

---

## 3. Convenciones del modelo

| Símbolo | Significado |
|---|---|
| `PK` | Clave primaria |
| `FK` | Clave foránea |
| `UK` | Restricción de unicidad |
| `||--o{` | Una entidad se relaciona con cero o muchos registros |
| `||--o|` | Una entidad se relaciona con cero o un registro |

Las relaciones dibujadas representan relaciones declaradas en el esquema mediante claves foráneas, salvo cuando una observación indique expresamente que se trata de una relación lógica.

---

# 4. Configuración institucional y estructura académica

```mermaid
erDiagram
    CONFIGURACION_INSTITUCIONAL {
        uuid id PK
        text nombre_legal
        text nombre_corto
        text lema
        text nit
        text dane
        text resolucion
        text direccion
        text municipio
        text departamento
        text telefono
        text correo
        text escudo_url
        text rector_nombre
        text rector_firma_url
        text dir_adm_nombre
        text dir_adm_firma_url
        timestamp creado_en
        timestamp actualizado_en
    }

    ANIO_LECTIVO ||--o{ PERIODO : contiene
    ANIO_LECTIVO ||--o{ ESCALA_VALORACION : define
    ANIO_LECTIVO ||--o{ CURSO : organiza
    ANIO_LECTIVO ||--o{ PLAN_ASIGNATURA : determina
    ANIO_LECTIVO ||--o{ ASIGNACION_DOCENTE : comprende
    ANIO_LECTIVO ||--o{ MATRICULA : habilita

    JORNADA ||--o{ CURSO : organiza
    CICLO ||--o{ CURSO : clasifica
    CICLO ||--o{ PLAN_ASIGNATURA : estructura

    ANIO_LECTIVO {
        uuid id PK
        text nombre
        date inicio
        date fin
        boolean activo
        timestamp creado_en
        timestamp actualizado_en
    }

    JORNADA {
        uuid id PK
        char codigo UK
        text nombre
        text detalle
    }

    CICLO {
        uuid id PK
        text codigo UK
        text grado_equivalente
        text esquema_periodos
    }

    PERIODO {
        uuid id PK
        uuid anio_lectivo_id FK
        smallint numero
        text esquema
        date inicio
        date fin
        boolean notas_abiertas
        timestamp cerrado_en
    }

    ESCALA_VALORACION {
        uuid id PK
        uuid anio_lectivo_id FK
        text nivel
        numeric desde
        numeric hasta
        integer orden
    }

    CURSO {
        uuid id PK
        uuid anio_lectivo_id FK
        uuid ciclo_id FK
        uuid jornada_id FK
        text nombre
        timestamp eliminado_en
    }
```

---

# 5. Plan académico

```mermaid
erDiagram
    AREA ||--o{ ASIGNATURA : agrupa
    ANIO_LECTIVO ||--o{ PLAN_ASIGNATURA : define
    CICLO ||--o{ PLAN_ASIGNATURA : organiza
    ASIGNATURA ||--o{ PLAN_ASIGNATURA : incluye
    ASIGNATURA ||--o{ DESCRIPTOR : define
    ASIGNATURA ||--o{ ASIGNACION_DOCENTE : se_dicta

    AREA {
        uuid id PK
        text nombre
        timestamp eliminado_en
    }

    ASIGNATURA {
        uuid id PK
        uuid area_id FK
        text nombre
        timestamp eliminado_en
    }

    PLAN_ASIGNATURA {
        uuid id PK
        uuid anio_lectivo_id FK
        uuid ciclo_id FK
        uuid asignatura_id FK
        smallint horas_semana
    }

    DESCRIPTOR {
        uuid id PK
        uuid asignatura_id FK
        text nivel
        text texto
        timestamp eliminado_en
    }
```

---

# 6. Personas, perfiles operativos y relaciones familiares

```mermaid
erDiagram
    PERSONA ||--o{ USUARIO : tiene_cuenta
    PERSONA ||--o{ ESTUDIANTE_FAMILIAR : participa
    PERSONA ||--o{ ASPIRANTE : presenta
    PERSONA ||--o{ HISTORIA_ACADEMICA : posee
    USUARIO ||--o{ ASIGNACION_DOCENTE : desempeña
    USUARIO ||--o{ CALIFICACION : registra
    USUARIO ||--o{ OBSERVADOR_REGISTRO : registra

    PERSONA {
        uuid id PK
        text tipo_documento
        text numero_documento UK
        text primer_nombre
        text segundo_nombre
        text primer_apellido
        text segundo_apellido
        date fecha_nacimiento
        text lugar_nacimiento
        text genero
        text telefono
        text correo
        text direccion
        text eps
        text discapacidad
        text necesidad_edu
        timestamp eliminado_en
    }

    USUARIO {
        uuid id PK
        uuid persona_id FK
        text correo UK
        text rol
        boolean activo
        boolean primer_ingreso
        timestamp creado_en
        timestamp actualizado_en
    }

    ESTUDIANTE_FAMILIAR {
        uuid id PK
        uuid estudiante_id FK
        uuid familiar_id FK
        text tipo
        boolean autorizacion_habeas_data
        timestamp autorizacion_fecha
        text autorizacion_version
    }

    ASPIRANTE {
        uuid id PK
        text radicado UK
        uuid persona_id FK
        uuid ciclo_id FK
        uuid jornada_id FK
        text estado
        text motivo_rechazo
        jsonb datos_formulario
        boolean autorizacion_datos
        timestamp autorizacion_fecha
        text autorizacion_version
        uuid revisado_por FK
        timestamp revisado_en
        timestamp creado_en
    }

    HISTORIA_ACADEMICA {
        uuid id PK
        uuid persona_id FK
        text institucion
        text grado
        smallint anio
        boolean aprobado
    }
```

> `ESTUDIANTE_FAMILIAR` utiliza dos referencias hacia `PERSONA`: una representa al estudiante y otra al acudiente o familiar. Mermaid las muestra como una relación conceptual única; los roles concretos están determinados por `estudiante_id` y `familiar_id`.

---

# 7. Aspirantes y matrícula

```mermaid
erDiagram
    ANIO_LECTIVO ||--o{ MATRICULA : habilita
    PERSONA ||--o{ MATRICULA : corresponde_a
    CURSO ||--o{ MATRICULA : recibe
    ASPIRANTE ||--o{ MATRICULA : puede_originar

    PERSONA {
        uuid id PK
        text tipo_documento
        text numero_documento
        text primer_nombre
        text primer_apellido
        text correo
    }

    ANIO_LECTIVO {
        uuid id PK
        text nombre
        date inicio
        date fin
        boolean activo
    }

    CURSO {
        uuid id PK
        uuid anio_lectivo_id FK
        uuid ciclo_id FK
        uuid jornada_id FK
        text nombre
    }

    ASPIRANTE {
        uuid id PK
        text radicado UK
        uuid persona_id FK
        uuid ciclo_id FK
        uuid jornada_id FK
        text estado
        text motivo_rechazo
        jsonb datos_formulario
        boolean autorizacion_datos
        uuid revisado_por FK
        timestamp revisado_en
        timestamp creado_en
    }

    MATRICULA {
        uuid id PK
        uuid anio_lectivo_id FK
        uuid estudiante_id FK
        uuid curso_id FK
        uuid aspirante_id FK
        text estado
        text contrato_folio
        uuid contrato_pdf_id
        timestamp creado_en
    }
```

> `matricula.estudiante_id` apunta a `persona.id`, porque una persona puede desempeñar el rol de estudiante. `contrato_pdf_id` es una referencia lógica y actualmente no tiene una FK declarada hacia `archivo.id`.

---

# 8. Docencia, calificaciones y seguimiento académico

```mermaid
erDiagram
    ANIO_LECTIVO ||--o{ ASIGNACION_DOCENTE : comprende
    USUARIO ||--o{ ASIGNACION_DOCENTE : ejerce
    ASIGNATURA ||--o{ ASIGNACION_DOCENTE : asigna
    CURSO ||--o{ ASIGNACION_DOCENTE : recibe

    MATRICULA ||--o{ CALIFICACION : recibe
    ASIGNATURA ||--o{ CALIFICACION : evalua
    PERIODO ||--o{ CALIFICACION : corresponde
    DESCRIPTOR ||--o{ CALIFICACION : contextualiza
    USUARIO ||--o{ CALIFICACION : registra

    CALIFICACION ||--o{ CALIFICACION_HISTORIAL : conserva_cambios
    USUARIO ||--o{ CALIFICACION_HISTORIAL : modifica

    MATRICULA ||--o{ OBSERVADOR_REGISTRO : contiene
    USUARIO ||--o{ OBSERVADOR_REGISTRO : registra

    ASIGNACION_DOCENTE {
        uuid id PK
        uuid anio_lectivo_id FK
        uuid docente_id FK
        uuid asignatura_id FK
        uuid curso_id FK
    }

    CALIFICACION {
        uuid id PK
        uuid matricula_id FK
        uuid asignatura_id FK
        uuid periodo_id FK
        numeric nota
        text nivel_desempeno
        uuid descriptor_id FK
        text descriptor_texto
        smallint fallas
        boolean bloqueado
        uuid registrado_por FK
        timestamp creado_en
        timestamp actualizado_en
    }

    CALIFICACION_HISTORIAL {
        uuid id PK
        uuid calificacion_id FK
        numeric nota_anterior
        numeric nota_nueva
        smallint fallas_anterior
        smallint fallas_nueva
        text razon
        uuid modificado_por FK
        timestamp modificado_en
    }

    OBSERVADOR_REGISTRO {
        uuid id PK
        uuid matricula_id FK
        text tipo
        text descripcion
        boolean firmado_estudiante
        boolean firmado_acudiente
        uuid registrado_por FK
        timestamp creado_en
    }
```

> `calificacion.descriptor_texto` conserva una copia textual del descriptor utilizado, incluso si posteriormente el descriptor original es modificado o eliminado.

---

# 9. Finanzas, cartera y caja

```mermaid
erDiagram
    MATRICULA ||--o{ PLAN_COBRO : genera
    CONCEPTO_INGRESO ||--o{ PLAN_COBRO : define

    ANIO_LECTIVO ||--o{ RECIBO_CAJA : organiza
    MATRICULA ||--o{ RECIBO_CAJA : relaciona
    CONCEPTO_INGRESO ||--o{ RECIBO_CAJA : clasifica
    USUARIO ||--o{ RECIBO_CAJA : registra

    ANIO_LECTIVO ||--o{ EGRESO : organiza
    CATEGORIA_EGRESO ||--o{ EGRESO : clasifica
    USUARIO ||--o{ EGRESO : registra

    CONCEPTO_INGRESO {
        uuid id PK
        text nombre
        text descripcion
        timestamp eliminado_en
    }

    PLAN_COBRO {
        uuid id PK
        uuid matricula_id FK
        uuid concepto_id FK
        smallint mes
        numeric valor_programado
        timestamp creado_en
    }

    RECIBO_CAJA {
        uuid id PK
        uuid anio_lectivo_id FK
        integer consecutivo
        uuid matricula_id FK
        text beneficiario
        uuid concepto_id FK
        text descripcion
        numeric valor
        text forma_pago
        date fecha
        uuid pdf_id
        boolean anulado
        text anulacion_motivo
        uuid anulado_por FK
        timestamp anulado_en
        uuid registrado_por FK
        timestamp creado_en
    }

    CATEGORIA_EGRESO {
        uuid id PK
        text nombre
        timestamp eliminado_en
    }

    EGRESO {
        uuid id PK
        uuid anio_lectivo_id FK
        integer consecutivo
        uuid categoria_id FK
        text beneficiario
        text descripcion
        numeric valor
        date fecha
        uuid soporte_id
        uuid pdf_id
        boolean anulado
        text anulacion_motivo
        uuid anulado_por FK
        timestamp anulado_en
        uuid registrado_por FK
        timestamp creado_en
    }
```

> `recibo_caja.pdf_id`, `egreso.soporte_id` y `egreso.pdf_id` son referencias lógicas a archivos o documentos. El esquema actual no declara FK directa para estas columnas.

---

# 10. Nómina y caja menor

```mermaid
erDiagram
    ANIO_LECTIVO ||--o{ NOMINA_BLOQUE : comprende
    USUARIO ||--o{ NOMINA_BLOQUE : corresponde_a
    PERIODO ||--o{ NOMINA_BLOQUE : liquida
    EGRESO ||--o{ NOMINA_BLOQUE : respalda

    ANIO_LECTIVO ||--o{ CAJA_MENOR_MOVIMIENTO : contiene
    USUARIO ||--o{ CAJA_MENOR_MOVIMIENTO : registra

    NOMINA_BLOQUE {
        uuid id PK
        uuid anio_lectivo_id FK
        uuid docente_id FK
        uuid periodo_id FK
        text tipo_jornada
        smallint bloques
        numeric valor_bloque
        numeric total
        uuid egreso_id FK
        timestamp creado_en
    }

    CAJA_MENOR_MOVIMIENTO {
        uuid id PK
        uuid anio_lectivo_id FK
        text tipo
        text descripcion
        numeric valor
        uuid soporte_id
        uuid registrado_por FK
        date fecha
        timestamp creado_en
    }
```

---

# 11. Archivos y documentos generados

```mermaid
erDiagram
    USUARIO ||--o{ ARCHIVO : sube
    ARCHIVO ||--o{ DOCUMENTO_GENERADO : soporta
    USUARIO ||--o{ DOCUMENTO_GENERADO : genera

    ARCHIVO {
        uuid id PK
        text nombre_orig
        text nombre_stor UK
        text bucket
        text mime
        integer bytes
        text hash_sha256
        uuid subido_por FK
        timestamp creado_en
    }

    DOCUMENTO_GENERADO {
        uuid id PK
        text tipo
        uuid entidad_id
        uuid anio_lectivo_id FK
        uuid periodo_id FK
        uuid archivo_id FK
        text hash_contenido
        uuid generado_por FK
        timestamp creado_en
    }
```

> `documento_generado.entidad_id` es una referencia polimórfica: identifica registros pertenecientes a distintas entidades según el valor de `tipo`. Por esa razón no tiene una FK única declarada.

---

# 12. CMS institucional

```mermaid
erDiagram
    USUARIO ||--o{ CMS_ENTRADA : autor
    ARCHIVO ||--o{ CMS_ENTRADA : imagen_meta
    CMS_ENTRADA ||--o{ CMS_ALBUM_FOTO : contiene
    ARCHIVO ||--o{ CMS_ALBUM_FOTO : representa

    CMS_ENTRADA {
        uuid id PK
        text tipo
        text slug
        text titulo
        text subtitulo
        text cuerpo
        text meta_desc
        uuid meta_img_id FK
        text estado
        timestamp publicar_en
        uuid autor_id FK
        timestamp creado_en
        timestamp actualizado_en
        timestamp eliminado_en
    }

    CMS_ALBUM_FOTO {
        uuid id PK
        uuid album_id FK
        uuid archivo_id FK
        text alt
        smallint orden
    }
```

---

# 13. Auditoría, control y secuencias

```mermaid
erDiagram
    USUARIO ||--o{ AUDITORIA : puede_originar
    ANIO_LECTIVO ||--o{ SECUENCIA : administra

    AUDITORIA {
        uuid id PK
        uuid actor_id
        text actor_rol
        text accion
        text entidad
        uuid entidad_id
        jsonb diferencia
        inet ip
        text user_agent
        timestamp creado_en
    }

    SECUENCIA {
        uuid id PK
        uuid anio_lectivo_id FK
        text tipo
        integer ultimo
    }

    LIMITE_TASA {
        uuid id PK
        text clave
        timestamp ventana
        integer intentos
        timestamp creado_en
    }
```

> `auditoria.actor_id` identifica al actor de la operación, pero actualmente no tiene una FK declarada hacia `usuario.id`.  
> `auditoria.entidad_id` también es una referencia polimórfica y depende del valor de `entidad`.

---

# 14. Autenticación con Better Auth

```mermaid
erDiagram
    BA_USER ||--o{ BA_SESSION : mantiene
    BA_USER ||--o{ BA_ACCOUNT : configura
    BA_USER ||--o{ BA_TWO_FACTOR : protege

    BA_USER {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        boolean two_factor_enabled
        timestamp created_at
        timestamp updated_at
    }

    BA_SESSION {
        text id PK
        timestamp expires_at
        text token UK
        timestamp created_at
        timestamp updated_at
        text ip_address
        text user_agent
        text user_id FK
        integer expires_after_inactive
    }

    BA_ACCOUNT {
        text id PK
        text account_id
        text provider_id
        text issuer
        text user_id FK
        text access_token
        text refresh_token
        text id_token
        timestamp access_token_expires_at
        timestamp refresh_token_expires_at
        text scope
        text password
        timestamp created_at
        timestamp updated_at
    }

    BA_VERIFICATION {
        text id PK
        text identifier
        text value
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    BA_TWO_FACTOR {
        text id PK
        text secret
        text backup_codes
        text user_id FK
        boolean verified
        integer failed_verification_count
        timestamp locked_until
    }
```

> `BA_USER` y `USUARIO` representan conceptos diferentes. `BA_USER` pertenece al mecanismo de autenticación de Better Auth; `USUARIO` representa la cuenta operativa de Agora. El esquema actual no declara una FK directa entre ambas tablas.

---

# 15. Inventario de entidades

## Institución y academia

- `configuracion_institucional`
- `anio_lectivo`
- `jornada`
- `ciclo`
- `escala_valoracion`
- `periodo`
- `area`
- `asignatura`
- `plan_asignatura`
- `curso`
- `descriptor`

## Personas y operación académica

- `persona`
- `usuario`
- `estudiante_familiar`
- `aspirante`
- `matricula`
- `historia_academica`
- `asignacion_docente`
- `calificacion`
- `calificacion_historial`
- `observador_registro`

## Finanzas

- `concepto_ingreso`
- `plan_cobro`
- `recibo_caja`
- `categoria_egreso`
- `egreso`
- `nomina_bloque`
- `caja_menor_movimiento`
- `secuencia`

## Archivos y contenido

- `archivo`
- `documento_generado`
- `cms_entrada`
- `cms_album_foto`

## Seguridad e infraestructura

- `auditoria`
- `limite_tasa`
- `ba_user`
- `ba_session`
- `ba_account`
- `ba_verification`
- `ba_two_factor`

---

# 16. Consideraciones de diseño

1. `persona` centraliza la identidad de estudiantes, acudientes, docentes y personal administrativo.
2. `usuario` vincula una persona con las capacidades operativas de la plataforma.
3. `usuario.rol` representa actualmente un único perfil principal.
4. `estudiante_familiar` permite modelar relaciones entre estudiantes y acudientes.
5. `matricula` conecta un estudiante con un año lectivo y un curso.
6. `calificacion` se identifica funcionalmente por matrícula, asignatura y periodo.
7. `calificacion_historial` proporciona trazabilidad de modificaciones sobre las notas.
8. `documento_generado.entidad_id` y `auditoria.entidad_id` son referencias polimórficas.
9. Las columnas `pdf_id`, `soporte_id` y `contrato_pdf_id` son referencias lógicas sin FK explícita hacia `archivo`.
10. Better Auth mantiene su propio conjunto de tablas de autenticación.
11. Las tablas de autenticación no deben confundirse con las tablas operativas de Agora.
12. La separación entre roles funcionales y autenticación permite evolucionar posteriormente hacia un modelo de permisos más granular.

---

# 17. Estado del modelo

Este documento refleja la estructura actualmente declarada en:

```text
src/datos/esquema.ts
```

Cualquier cambio futuro en tablas, columnas, claves foráneas, roles o permisos deberá actualizar simultáneamente:

- el esquema Drizzle;
- las migraciones;
- este documento UML;
- las políticas de autorización;
- la documentación funcional correspondiente.