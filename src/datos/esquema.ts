import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  smallint,
  integer,
  numeric,
  jsonb,
  inet,
  char,
  index,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'

const uuidv7 = () => sql`uuidv7()`
const ahora = () => sql`now()`

export const configuracionInstitucional = pgTable('configuracion_institucional', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  nombreLegal: text('nombre_legal').notNull(),
  nombreCorto: text('nombre_corto').notNull(),
  lema: text('lema'),
  nit: text('nit'),
  dane: text('dane'),
  resolucion: text('resolucion'),
  direccion: text('direccion'),
  municipio: text('municipio'),
  departamento: text('departamento'),
  telefono: text('telefono'),
  correo: text('correo'),
  escudoUrl: text('escudo_url'),
  rectorNombre: text('rector_nombre').notNull(),
  rectorFirmaUrl: text('rector_firma_url'),
  dirAdmNombre: text('dir_adm_nombre').notNull(),
  dirAdmFirmaUrl: text('dir_adm_firma_url'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const anioLectivo = pgTable('anio_lectivo', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  nombre: text('nombre').notNull(),
  inicio: date('inicio').notNull(),
  fin: date('fin').notNull(),
  activo: boolean('activo').notNull().default(false),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const jornada = pgTable('jornada', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  codigo: char('codigo', { length: 1 }).notNull().unique(),
  nombre: text('nombre').notNull(),
  detalle: text('detalle'),
})

export const ciclo = pgTable('ciclo', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  codigo: text('codigo').notNull().unique(),
  gradoEquivalente: text('grado_equivalente').notNull(),
  esquemaPeriodos: text('esquema_periodos').notNull(),
})

export const escalaValoracion = pgTable('escala_valoracion', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  anioLectivoId: uuid('anio_lectivo_id')
    .notNull()
    .references(() => anioLectivo.id),
  nivel: text('nivel').notNull(),
  desde: numeric('desde', { precision: 3, scale: 1 }).notNull(),
  hasta: numeric('hasta', { precision: 3, scale: 1 }).notNull(),
  orden: integer('orden').notNull(),
})

export const periodo = pgTable(
  'periodo',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    numero: smallint('numero').notNull(),
    esquema: text('esquema').notNull(),
    inicio: date('inicio').notNull(),
    fin: date('fin').notNull(),
    notasAbiertas: boolean('notas_abiertas').notNull().default(false),
    cerradoEn: timestamp('cerrado_en', { withTimezone: true }),
  },
  (t) => [unique().on(t.anioLectivoId, t.numero, t.esquema)]
)

export const area = pgTable('area', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  nombre: text('nombre').notNull(),
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
})

export const asignatura = pgTable('asignatura', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  areaId: uuid('area_id')
    .notNull()
    .references(() => area.id),
  nombre: text('nombre').notNull(),
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
})

export const planAsignatura = pgTable(
  'plan_asignatura',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    cicloId: uuid('ciclo_id')
      .notNull()
      .references(() => ciclo.id),
    asignaturaId: uuid('asignatura_id')
      .notNull()
      .references(() => asignatura.id),
    horasSemana: smallint('horas_semana').notNull().default(1),
  },
  (t) => [unique().on(t.anioLectivoId, t.cicloId, t.asignaturaId)]
)

export const curso = pgTable(
  'curso',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    cicloId: uuid('ciclo_id')
      .notNull()
      .references(() => ciclo.id),
    jornadaId: uuid('jornada_id')
      .notNull()
      .references(() => jornada.id),
    nombre: text('nombre').notNull(),
    eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
  },
  (t) => [unique().on(t.anioLectivoId, t.cicloId, t.jornadaId)]
)

export const descriptor = pgTable('descriptor', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  asignaturaId: uuid('asignatura_id')
    .notNull()
    .references(() => asignatura.id),
  nivel: text('nivel').notNull(),
  texto: text('texto').notNull(),
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
})

export const persona = pgTable('persona', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  tipoDocumento: text('tipo_documento').notNull(),
  numeroDocumento: text('numero_documento').notNull(),
  primerNombre: text('primer_nombre').notNull(),
  segundoNombre: text('segundo_nombre'),
  primerApellido: text('primer_apellido').notNull(),
  segundoApellido: text('segundo_apellido'),
  fechaNacimiento: date('fecha_nacimiento'),
  lugarNacimiento: text('lugar_nacimiento'),
  genero: text('genero'),
  telefono: text('telefono'),
  correo: text('correo'),
  direccion: text('direccion'),
  eps: text('eps'),
  discapacidad: text('discapacidad'),
  necesidadEdu: text('necesidad_edu'),
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
},
(t) => [unique().on(t.tipoDocumento, t.numeroDocumento)]
)

export const usuario = pgTable('usuario', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  personaId: uuid('persona_id')
    .notNull()
    .references(() => persona.id),
  correo: text('correo').notNull().unique(),
  rol: text('rol').notNull(),
  activo: boolean('activo').notNull().default(true),
  primerIngreso: boolean('primer_ingreso').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const estudianteFamiliar = pgTable('estudiante_familiar', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  estudianteId: uuid('estudiante_id')
    .notNull()
    .references(() => persona.id),
  familiarId: uuid('familiar_id')
    .notNull()
    .references(() => persona.id),
  tipo: text('tipo').notNull(),
  autorizacionHabeasData: boolean('autorizacion_habeas_data').notNull().default(false),
  autorizacionFecha: timestamp('autorizacion_fecha', { withTimezone: true }),
  autorizacionVersion: text('autorizacion_version'),
})

export const aspirante = pgTable('aspirante', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  radicado: text('radicado').notNull().unique(),
  personaId: uuid('persona_id').references(() => persona.id),
  cicloId: uuid('ciclo_id').references(() => ciclo.id),
  jornadaId: uuid('jornada_id').references(() => jornada.id),
  estado: text('estado').notNull().default('pendiente'),
  motivoRechazo: text('motivo_rechazo'),
  datosFormulario: jsonb('datos_formulario').notNull(),
  autorizacionDatos: boolean('autorizacion_datos').notNull().default(false),
  autorizacionFecha: timestamp('autorizacion_fecha', { withTimezone: true }),
  autorizacionVersion: text('autorizacion_version'),
  revisadoPor: uuid('revisado_por').references(() => usuario.id),
  revisadoEn: timestamp('revisado_en', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const matricula = pgTable(
  'matricula',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    estudianteId: uuid('estudiante_id')
      .notNull()
      .references(() => persona.id),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => curso.id),
    aspiranteId: uuid('aspirante_id').references(() => aspirante.id),
    estado: text('estado').notNull().default('activo'),
    contratoFolio: text('contrato_folio'),
    contratoPdfId: uuid('contrato_pdf_id'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  },
  (t) => [unique().on(t.anioLectivoId, t.estudianteId)]
)

export const historiaAcademica = pgTable('historia_academica', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  personaId: uuid('persona_id')
    .notNull()
    .references(() => persona.id),
  institucion: text('institucion').notNull(),
  grado: text('grado').notNull(),
  anio: smallint('anio').notNull(),
  aprobado: boolean('aprobado').notNull().default(true),
})

export const asignacionDocente = pgTable(
  'asignacion_docente',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    docenteId: uuid('docente_id')
      .notNull()
      .references(() => usuario.id),
    asignaturaId: uuid('asignatura_id')
      .notNull()
      .references(() => asignatura.id),
    cursoId: uuid('curso_id')
      .notNull()
      .references(() => curso.id),
  },
  (t) => [unique().on(t.anioLectivoId, t.docenteId, t.asignaturaId, t.cursoId)]
)

export const calificacion = pgTable(
  'calificacion',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    matriculaId: uuid('matricula_id')
      .notNull()
      .references(() => matricula.id),
    asignaturaId: uuid('asignatura_id')
      .notNull()
      .references(() => asignatura.id),
    periodoId: uuid('periodo_id')
      .notNull()
      .references(() => periodo.id),
    nota: numeric('nota', { precision: 3, scale: 1 }),
    nivelDesempeno: text('nivel_desempeno'),
    descriptorId: uuid('descriptor_id').references(() => descriptor.id),
    descriptorTexto: text('descriptor_texto'),
    fallas: smallint('fallas').notNull().default(0),
    bloqueado: boolean('bloqueado').notNull().default(false),
    registradoPor: uuid('registrado_por')
      .notNull()
      .references(() => usuario.id),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().default(ahora()),
  },
  (t) => [
    unique().on(t.matriculaId, t.asignaturaId, t.periodoId),
    index('idx_calificacion_matricula').on(t.matriculaId),
    index('idx_calificacion_asignatura_periodo').on(t.asignaturaId, t.periodoId),
  ]
)

export const calificacionHistorial = pgTable('calificacion_historial', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  calificacionId: uuid('calificacion_id')
    .notNull()
    .references(() => calificacion.id),
  notaAnterior: numeric('nota_anterior', { precision: 3, scale: 1 }),
  notaNueva: numeric('nota_nueva', { precision: 3, scale: 1 }),
  fallasAnterior: smallint('fallas_anterior'),
  fallasNueva: smallint('fallas_nueva'),
  razon: text('razon'),
  modificadoPor: uuid('modificado_por')
    .notNull()
    .references(() => usuario.id),
  modificadoEn: timestamp('modificado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const observadorRegistro = pgTable('observador_registro', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  matriculaId: uuid('matricula_id')
    .notNull()
    .references(() => matricula.id),
  tipo: text('tipo').notNull(),
  descripcion: text('descripcion').notNull(),
  firmadoEstudiante: boolean('firmado_estudiante').notNull().default(false),
  firmadoAcudiente: boolean('firmado_acudiente').notNull().default(false),
  registradoPor: uuid('registrado_por')
    .notNull()
    .references(() => usuario.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const conceptoIngreso = pgTable('concepto_ingreso', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
})

export const planCobro = pgTable('plan_cobro', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  matriculaId: uuid('matricula_id')
    .notNull()
    .references(() => matricula.id),
  conceptoId: uuid('concepto_id')
    .notNull()
    .references(() => conceptoIngreso.id),
  mes: smallint('mes'),
  valorProgramado: numeric('valor_programado', { precision: 12, scale: 0 }).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const reciboCaja = pgTable(
  'recibo_caja',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    consecutivo: integer('consecutivo').notNull(),
    matriculaId: uuid('matricula_id').references(() => matricula.id),
    beneficiario: text('beneficiario').notNull(),
    conceptoId: uuid('concepto_id')
      .notNull()
      .references(() => conceptoIngreso.id),
    descripcion: text('descripcion'),
    valor: numeric('valor', { precision: 12, scale: 0 }).notNull(),
    formaPago: text('forma_pago').notNull(),
    fecha: date('fecha').notNull(),
    pdfId: uuid('pdf_id'),
    anulado: boolean('anulado').notNull().default(false),
    anulacionMotivo: text('anulacion_motivo'),
    anuladoPor: uuid('anulado_por').references(() => usuario.id),
    anuladoEn: timestamp('anulado_en', { withTimezone: true }),
    registradoPor: uuid('registrado_por')
      .notNull()
      .references(() => usuario.id),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  },
  (t) => [
    unique().on(t.anioLectivoId, t.consecutivo),
    index('idx_recibo_anio_fecha').on(t.anioLectivoId, t.fecha),
  ]
)

export const categoriaEgreso = pgTable('categoria_egreso', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  nombre: text('nombre').notNull(),
  eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
})

export const egreso = pgTable(
  'egreso',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    consecutivo: integer('consecutivo').notNull(),
    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categoriaEgreso.id),
    beneficiario: text('beneficiario').notNull(),
    descripcion: text('descripcion'),
    valor: numeric('valor', { precision: 12, scale: 0 }).notNull(),
    fecha: date('fecha').notNull(),
    soporteId: uuid('soporte_id'),
    pdfId: uuid('pdf_id'),
    anulado: boolean('anulado').notNull().default(false),
    anulacionMotivo: text('anulacion_motivo'),
    anuladoPor: uuid('anulado_por').references(() => usuario.id),
    anuladoEn: timestamp('anulado_en', { withTimezone: true }),
    registradoPor: uuid('registrado_por')
      .notNull()
      .references(() => usuario.id),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  },
  (t) => [
    unique().on(t.anioLectivoId, t.consecutivo),
    index('idx_egreso_anio_fecha').on(t.anioLectivoId, t.fecha),
  ]
)

export const nominaBloque = pgTable('nomina_bloque', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  anioLectivoId: uuid('anio_lectivo_id')
    .notNull()
    .references(() => anioLectivo.id),
  docenteId: uuid('docente_id')
    .notNull()
    .references(() => usuario.id),
  periodoId: uuid('periodo_id')
    .notNull()
    .references(() => periodo.id),
  tipoJornada: text('tipo_jornada').notNull(),
  bloques: smallint('bloques').notNull(),
  valorBloque: numeric('valor_bloque', { precision: 10, scale: 0 }).notNull(),
  total: numeric('total', { precision: 12, scale: 0 }).notNull(),
  egresoId: uuid('egreso_id').references(() => egreso.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const cajaMenorMovimiento = pgTable('caja_menor_movimiento', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  anioLectivoId: uuid('anio_lectivo_id')
    .notNull()
    .references(() => anioLectivo.id),
  tipo: text('tipo').notNull(),
  descripcion: text('descripcion').notNull(),
  valor: numeric('valor', { precision: 10, scale: 0 }).notNull(),
  soporteId: uuid('soporte_id'),
  registradoPor: uuid('registrado_por')
    .notNull()
    .references(() => usuario.id),
  fecha: date('fecha').notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const archivo = pgTable('archivo', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  nombreOrig: text('nombre_orig').notNull(),
  nombreStor: text('nombre_stor').notNull().unique(),
  bucket: text('bucket').notNull(),
  mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(),
  hashSha256: text('hash_sha256').notNull(),
  subidoPor: uuid('subido_por').references(() => usuario.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const documentoGenerado = pgTable('documento_generado', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  tipo: text('tipo').notNull(),
  entidadId: uuid('entidad_id').notNull(),
  anioLectivoId: uuid('anio_lectivo_id').references(() => anioLectivo.id),
  periodoId: uuid('periodo_id').references(() => periodo.id),
  archivoId: uuid('archivo_id')
    .notNull()
    .references(() => archivo.id),
  hashContenido: text('hash_contenido').notNull(),
  generadoPor: uuid('generado_por').references(() => usuario.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
})

export const auditoria = pgTable(
  'auditoria',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    actorId: uuid('actor_id'),
    actorRol: text('actor_rol'),
    accion: text('accion').notNull(),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id'),
    diferencia: jsonb('diferencia'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  },
  (t) => [index('idx_auditoria_entidad_fecha').on(t.entidad, t.creadoEn)]
)

export const cmsEntrada = pgTable(
  'cms_entrada',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    tipo: text('tipo').notNull(),
    slug: text('slug').notNull(),
    titulo: text('titulo').notNull(),
    subtitulo: text('subtitulo'),
    cuerpo: text('cuerpo'),
    metaDesc: text('meta_desc'),
    metaImgId: uuid('meta_img_id').references(() => archivo.id),
    estado: text('estado').notNull().default('borrador'),
    publicarEn: timestamp('publicar_en', { withTimezone: true }),
    autorId: uuid('autor_id').references(() => usuario.id),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().default(ahora()),
    eliminadoEn: timestamp('eliminado_en', { withTimezone: true }),
  },
  (t) => [
    unique().on(t.tipo, t.slug),
    index('idx_cms_tipo_estado').on(t.tipo, t.estado, t.publicarEn),
  ]
)

export const cmsAlbumFoto = pgTable('cms_album_foto', {
  id: uuid('id').default(uuidv7()).primaryKey(),
  albumId: uuid('album_id')
    .notNull()
    .references(() => cmsEntrada.id),
  archivoId: uuid('archivo_id')
    .notNull()
    .references(() => archivo.id),
  alt: text('alt').notNull(),
  orden: smallint('orden').notNull().default(0),
})

export const secuencia = pgTable(
  'secuencia',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    anioLectivoId: uuid('anio_lectivo_id')
      .notNull()
      .references(() => anioLectivo.id),
    tipo: text('tipo').notNull(),
    ultimo: integer('ultimo').notNull().default(0),
  },
  (t) => [unique().on(t.anioLectivoId, t.tipo)]
)

export const limiteTasa = pgTable(
  'limite_tasa',
  {
    id: uuid('id').default(uuidv7()).primaryKey(),
    clave: text('clave').notNull(),
    ventana: timestamp('ventana', { withTimezone: true }).notNull(),
    intentos: integer('intentos').notNull().default(0),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().default(ahora()),
  },
  (t) => [index('idx_limite_tasa_clave_ventana').on(t.clave, t.ventana)]
)

export const baUser = pgTable('ba_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const baSession = pgTable('ba_session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => baUser.id, { onDelete: 'cascade' }),
  expiresAfterInactive: integer('expires_after_inactive'),
})

export const baAccount = pgTable('ba_account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  issuer: text('issuer').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => baUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

export const baVerification = pgTable('ba_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const baTwoFactor = pgTable('ba_two_factor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => baUser.id, { onDelete: 'cascade' }),
  verified: boolean('verified').notNull().default(true),
  failedVerificationCount: integer('failed_verification_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
})

export type ConfiguracionInstitucional = typeof configuracionInstitucional.$inferSelect
export type AnioLectivo = typeof anioLectivo.$inferSelect
export type Ciclo = typeof ciclo.$inferSelect
export type Jornada = typeof jornada.$inferSelect
export type Periodo = typeof periodo.$inferSelect
export type Area = typeof area.$inferSelect
export type Asignatura = typeof asignatura.$inferSelect
export type Curso = typeof curso.$inferSelect
export type Persona = typeof persona.$inferSelect
export type Usuario = typeof usuario.$inferSelect
export type Matricula = typeof matricula.$inferSelect
export type Calificacion = typeof calificacion.$inferSelect
export type ReciboCaja = typeof reciboCaja.$inferSelect
export type Egreso = typeof egreso.$inferSelect
export type Archivo = typeof archivo.$inferSelect
export type Auditoria = typeof auditoria.$inferSelect
export type CmsEntrada = typeof cmsEntrada.$inferSelect
export type CmsAlbumFoto = typeof cmsAlbumFoto.$inferSelect
