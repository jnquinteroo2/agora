import { hash } from '@node-rs/argon2'
import { createLocalAccountIssuer } from 'better-auth/db'
import { db, conContextoRLS } from './cliente'
import * as e from './esquema'
import { eq, asc, sql } from 'drizzle-orm'
import { logger } from '../logger'

const CONTEXTO_SIEMBRA = {
  usuarioId: '00000000-0000-0000-0000-000000000000',
  rol: 'superadmin' as const,
}

/* -------------------------------------------------------------------------- */
/* -------------------------- helpers de nombres/emails --------------------- */
/* -------------------------------------------------------------------------- */
function limpiaryNormalizar(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNombreCompleto(full: string) {
  const tokens = limpiaryNormalizar(full)
    .split(' ')
    .filter(Boolean)

  if (tokens.length === 0) {
    return {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
    }
  }

  if (tokens.length === 1) {
    return {
      primerNombre: tokens[0],
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
    }
  }

  // heurística: últimos dos tokens = apellidos; el resto nombres
  const primerNombre = tokens[0]
  const segundoNombre = tokens.length > 3 ? tokens.slice(1, tokens.length - 2).join(' ') : ''
  const primerApellido = tokens[tokens.length - 2] ?? ''
  const segundoApellido = tokens[tokens.length - 1] ?? ''

  return {
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
  }
}

function generarEmail(primerNombre: string, primerApellido: string, dominio = 'demo.local') {
  const clean = (s: string) =>
    limpiaryNormalizar(s)
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
  const user = `${clean(primerNombre)}.${clean(primerApellido)}`.replace(/\.+/g, '.')
  return `${user}@${dominio}`
}

/* -------------------------------------------------------------------------- */
/* -------------------------- funciones CRUD idempotentes ------------------- */
/* -------------------------------------------------------------------------- */
async function getOrCreatePersonaTx(tx: any, fullName: string, emailCandidate?: string) {
  const parsed = parseNombreCompleto(fullName)
  const correo = emailCandidate ?? generarEmail(parsed.primerNombre, parsed.primerApellido, process.env.SEMILLA_PERFILES_DOMINIO ?? 'demo.local')

  // Buscar por correo primero
  const existentePorCorreo = await tx
    .select({ id: e.persona.id })
    .from(e.persona)
    .where(eq(e.persona.correo, correo))
    .limit(1)

  if (existentePorCorreo[0]) return existentePorCorreo[0].id

  // Buscar por nombres (fallback)
  const existentePorNombre = await tx
    .select({ id: e.persona.id })
    .from(e.persona)
    .where(eq(e.persona.primerNombre, parsed.primerNombre))
    .where(eq(e.persona.primerApellido, parsed.primerApellido))
    .limit(1)

  if (existentePorNombre[0]) return existentePorNombre[0].id

  // Crear número documento provisional único
  const numeroDocumento = String(100000000 + Math.floor(Math.random() * 800000000))

  const [insertado] = await tx
    .insert(e.persona)
    .values({
      tipoDocumento: 'CC',
      numeroDocumento,
      primerNombre: parsed.primerNombre,
      segundoNombre: parsed.segundoNombre || null,
      primerApellido: parsed.primerApellido,
      segundoApellido: parsed.segundoApellido || null,
      correo,
    })
    .onConflictDoNothing()
    .returning({ id: e.persona.id })

  if (insertado?.id) return insertado.id

  // Si no insertó (onConflict) buscar por correo nuevamente
  const fallback = await tx
    .select({ id: e.persona.id })
    .from(e.persona)
    .where(eq(e.persona.correo, correo))
    .limit(1)

  return fallback[0]?.id
}

async function getOrCreateUsuarioTx(tx: any, personaId: string, correo: string, rol: string) {
  const existente = await tx
    .select({ id: e.usuario.id })
    .from(e.usuario)
    .where(eq(e.usuario.correo, correo))
    .limit(1)

  if (existente[0]) return existente[0].id

  const [insertado] = await tx
    .insert(e.usuario)
    .values({
      personaId,
      correo,
      rol,
      activo: true,
      primerIngreso: true,
    })
    .onConflictDoNothing()
    .returning({ id: e.usuario.id })

  if (insertado?.id) return insertado.id

  const fallback = await tx
    .select({ id: e.usuario.id })
    .from(e.usuario)
    .where(eq(e.usuario.correo, correo))
    .limit(1)

  return fallback[0]?.id
}

async function getOrCreateEstudianteFamiliarTx(tx: any, estudianteId: string, familiarId: string, tipo = 'acudiente') {
  const existente = await tx
    .select({ id: e.estudianteFamiliar.id })
    .from(e.estudianteFamiliar)
    .where(eq(e.estudianteFamiliar.estudianteId, estudianteId))
    .where(eq(e.estudianteFamiliar.familiarId, familiarId))
    .limit(1)

  if (existente[0]) return existente[0].id

  const [insertado] = await tx
    .insert(e.estudianteFamiliar)
    .values({
      estudianteId,
      familiarId,
      tipo,
      autorizacionHabeasData: true,
    })
    .onConflictDoNothing()
    .returning({ id: e.estudianteFamiliar.id })

  return insertado?.id
}

/* -------------------------------------------------------------------------- */
/* ------------------------------ datos de la lista ------------------------- */
/* -------------------------------------------------------------------------- */
/**
 * Lista de filas [ESTUDIANTE, ACUDIENTE, PROFESOR?]
 * Edita esta lista si requieres asignar jornadas/cursos manuales.
 */
const LISTA_ALUMNOS: Array<[string, string, string | null]> = [
  // Diurna
  ['CAÑATE TOSCANO JUAN ESTEBAN', 'CLAUDIA TOSCANO QUINTERO', 'PAOLA ALEXANDRA HERNANDEZ'],
  ['SAAVEDRA MUÑOZ LAURA VANESSA', 'DIANA MUÑOZ', 'JAVIER PEÑA'],
  ['BARRERA REINA LINA ISABELLA', 'JONNATAHAN BARRERA', 'DIANA VALBUENA'],
  ['JIMENEZ SUAREZ DANIEL ANDRES', 'ANGIE SUAREZ', 'MARIA CAMILA VARGAS'],
  ['MENDEZ RAMÍREZ ESTEBAN ANDRÉS', 'FLOR MARINA RAMIREZ', 'NICOLAS QUINTERO'],
  ['MIRANDA TRIANA ISABELA', 'JAQUELINE TRIANA', 'EMMA GAMBOA'],
  ['ROJAS VARGAS JUAN PABLO', 'YORNATHAN ROJAS', 'DANIEL SANTIAGO SOTO'],
  ['BALLEN CASTRO SAMUEL FELIPE', 'FLOR MARINA CASTRO', 'JUAN DAVID OSPINA'],
  ['BOYACÁ GARAY JUAN SEBASTIAN', 'LUZ MARINA GARAY', 'WILLIAM RICARDO HERNANDEZ'],
  ['MORENO GRACIA SHARID NICOL', 'PAOLA GRACIA', null],
  ['RÍOS GONZÁLEZ THOMAS ANDRÉS', 'LORENA GONZALEZ', null],
  ['SEVILLA BARÓN LAURA JULIANA', 'MARIELA BARON', null],
  ['CALDERÓN SEVILLA JHONJAN YESI', 'LUCIA SEVILLA', null],
  ['CORREDOR RUBIANO DIEGO ALEJANDRO', 'ANGELICA RUBIANO', null],
  ['QUIROGA DAZA SHARAY ALEJANDRA', 'DIANA CAROLINA DAZA', null],
  ['ROJAS MORENO FERGIE TATIANA', 'MARIA CONSTANZA MORENO', null],
  ['CATAMA RAMÍREZ THOMAS DAVID', 'GISELLE RAMIREZ CASTILLO', null],
  ['FONSECA BERMUDEZ PAULA NICOLE', 'VIVIAN BERMUDEZ', null],
  ['QUESADA RODRIGUEZ ALISSON JULIETH', 'INGRID RODRIGUEZ', null],
  ['RESTREPO PEREZ ARIANNA', 'WENDYS PEREZ', null],
  ['RUIZ PINILLA YINETH ANDREA', 'SANDRA PINILLA', null],
  ['ARENAS ORDUZ DANA SOFÍA', 'YOLANDA ORDUZ', null],
  ['BENAVIDES QUITÁN DANNA MICHELLE', 'LUCIA QUITIAN', null],
  ['PARRA FERRER ALEXANDRE ANTONIO', 'GRDYS VERONICA FERRER', null],
  ['ROBLES BALCEIRO ARANZA SOFIA', 'SEBASTIAN BALCEIRO', null],
  ['TENORIO MONTAÑO CARLOS SERAFIN', 'GONZALO CANTOR', null],
  ['TORRES GARCÍA HARRY GREYT', 'YOLANDA GARCIA', null],

  // Sábados
  ['GÓMEZ ROZO AMY GABRIELA', 'LUIS CARLOS GOMEZ', null],
  ['ARIZA ZAPATA MARTÍN ALBEIRO', 'MARCELA ZAPATA', null],
  ['ESPITIA VÉLEZ DIEGO ANTONIO', 'OVEIDA VIVIANA VELEZ', null],
  ['SALOME AVILA DIAZ', 'INGRI HILIANA DIAZ', null],
  ['SIACHOQUE GARCIA TAMARA VALENTINA', 'NIBIA GARCIA', null],
  ['HERRERA RAMÍREZ MARÍA CAMILA', 'HUMBERTO HERRERA RAMIREZ', null],
  ['FLOREZ MARTINEZ KEIDIS LUCÍA', 'MARELIS DEL CARMEN MARTINEZ', null],
  ['MADEIDO MUÑOZ SHARON DAYANNA', 'ANA ROCIO MUÑOZ', null],
  ['GIL NEIRA SARA MICHELLE', 'MARIA FANY NEIRA', null],
  ['GÓMEZ SUÁREZ JHONNY ESTEBAN', 'LEIDY VIVIANA SUAREZ', null],
  ['GONZÁLEZ CEPEDA NICOLE DANIELA', 'LILIANA CEPEDA MORALES', null],
  ['PÁRRAGA USME SARA VANESSA', 'YAZMIN ROCIO MORA', null],
  ['URREGO MARTINEZ VALERY', 'LUZ ESTHER URREGO', null],
  ['ALFARO MORENO ARIANGEL DE JESÚS', 'YINELIS MORENO MEDINA', null],
  ['CHICA PÉREZ SEBASTIAN JAVIER', 'FRANCISCO CHICA RUIZ', null],
  ['MARTINEZ MONSALVE JIMMY ALEXANDER', 'CLAUDIA MARTINEZ MEJIA', null],
  ['ROMERO HERNANDEZ KAREN VIVIANA', 'CLARA HERNANDEZ', null],
  ['TOSCANO QUINTERO ABY ALEJANDRA', 'CLAUDIA TOSCANO QUINTERO', null],
  ['TOSCANO TOCANCIPÁ JULIÁN LEONARDO', 'DIANA MARCELA TOCANCIPA', null],
]

/* -------------------------------------------------------------------------- */
/* ----------------------- creación de cursos / matrículas ------------------ */
/* -------------------------------------------------------------------------- */

/**
 * Detecta índice de corte entre diurna y sábados.
 * Preferible: establecer AGORA_SEED_SPLIT_INDEX env var para control manual.
 */
function detectarSplitIndex(): number {
  const envIndex = process.env['AGORA_SEED_SPLIT_INDEX']
  if (envIndex) {
    const n = Number(envIndex)
    if (!Number.isNaN(n) && n >= 0 && n <= LISTA_ALUMNOS.length) return n
  }
  // Buscamos marcador conocido (primer alumno de sábados)
  const marker = 'GÓMEZ ROZO AMY GABRIELA'
  const idx = LISTA_ALUMNOS.findIndex((r) => r[0] === marker)
  if (idx >= 0) return idx
  // Fallback: buscar comentario manual no posible en runtime -> usar longitud - 19 (heurística)
  const fallback = Math.max(0, LISTA_ALUMNOS.length - 19)
  return fallback
}

/**
 * Crea cursos (por ciclo x jornada) y plan de asignaturas básicas.
 * Devuelve map cursoIds (clave: `${cicloCodigo}_${jornadaCodigo}`).
 */
async function crearCursosYPlanes(tx: any, anioId: string, cicloIds: Record<string, string>, jornadaIds: Record<string, string>, asignaturaIds: Record<string, string>) {
  const cursoIds: Record<string, string> = {}

  // Crear cursos por combinación de ciclo x jornada
  for (const cicloCodigo of Object.keys(cicloIds)) {
    for (const jornadaCodigo of Object.keys(jornadaIds)) {
      const nombre = `${cicloCodigo}-${jornadaCodigo}`
      const [r] = await tx
        .insert(e.curso)
        .values({
          anioLectivoId: anioId,
          cicloId: cicloIds[cicloCodigo],
          jornadaId: jornadaIds[jornadaCodigo],
          nombre,
        })
        .onConflictDoNothing()
        .returning({ id: e.curso.id })

      const id =
        r?.id ??
        (await tx
          .select({ id: e.curso.id })
          .from(e.curso)
          .where(eq(e.curso.nombre, nombre))
          .then((x) => x[0]?.id))

      if (id) cursoIds[`${cicloCodigo}_${jornadaCodigo}`] = id
    }
  }

  // Crear planAsignatura simple: asignar cada asignatura a cada ciclo (si no existe)
  for (const cicloCodigo of Object.keys(cicloIds)) {
    for (const [nombreAsig, asigId] of Object.entries(asignaturaIds)) {
      // horas por defecto 2
      await tx
        .insert(e.planAsignatura)
        .values({
          anioLectivoId: anioId,
          cicloId: cicloIds[cicloCodigo],
          asignaturaId: asigId,
          horasSemana: 2,
        })
        .onConflictDoNothing()
    }
  }

  return cursoIds
}

/**
 * Matricular lista de alumnos en cursos detectados.
 * Estrategia:
 *  - Divide lista en Diurna/Sábados por splitIndex.
 *  - Para Diurna, asigna round-robin entre cursos de jornada D.
 *  - Para Sábados, asigna round-robin entre cursos de jornada S.
 */
async function matricularLista(tx: any, anioId: string, cursoIds: Record<string, string>) {
  const split = detectarSplitIndex()
  const cursosD = Object.entries(cursoIds).filter(([k]) => k.endsWith('_D')).map(([, v]) => v)
  const cursosS = Object.entries(cursoIds).filter(([k]) => k.endsWith('_S')).map(([, v]) => v)

  let idxD = 0
  let idxS = 0

  for (let i = 0; i < LISTA_ALUMNOS.length; i++) {
    const [alumnoNombre] = LISTA_ALUMNOS[i]
    const parsed = parseNombreCompleto(alumnoNombre)
    const email = generarEmail(parsed.primerNombre, parsed.primerApellido, process.env.SEMILLA_PERFILES_DOMINIO ?? 'demo.local')

    // Obtener persona por correo o por nombre
    let personaId: string | undefined
    const byEmail = await tx.select({ id: e.persona.id }).from(e.persona).where(eq(e.persona.correo, email)).limit(1)
    if (byEmail[0]) personaId = byEmail[0].id
    else {
      const byName = await tx
        .select({ id: e.persona.id })
        .from(e.persona)
        .where(eq(e.persona.primerNombre, parsed.primerNombre))
        .where(eq(e.persona.primerApellido, parsed.primerApellido))
        .limit(1)
      if (byName[0]) personaId = byName[0].id
    }
    if (!personaId) {
      logger.warn({ alumnoNombre }, 'No se encontró persona para matricular (se omitirá)')
      continue
    }

    const esDiurna = i < split
    const cursoSeleccionado = esDiurna ? cursosD[idxD % Math.max(1, cursosD.length)] : cursosS[idxS % Math.max(1, cursosS.length)]
    if (!cursoSeleccionado) {
      logger.warn('No hay cursos disponibles para la jornada', { esDiurna, alumnoNombre })
      continue
    }

    // Verificar si ya existe matrícula
    const existMat = await tx
      .select({ id: e.matricula.id })
      .from(e.matricula)
      .where(eq(e.matricula.anioLectivoId, anioId))
      .where(eq(e.matricula.estudianteId, personaId))
      .limit(1)

    if (existMat[0]) {
      logger.debug({ alumnoNombre }, 'Matrícula existente, se omite')
    } else {
      await tx.insert(e.matricula).values({
        anioLectivoId: anioId,
        estudianteId: personaId,
        cursoId: cursoSeleccionado,
        estado: 'activo',
        creadoEn: new Date(),
      }).onConflictDoNothing()
      if (esDiurna) idxD++
      else idxS++
    }
  }
}

/**
 * Asigna docentes a cursos de manera idempotente.
 * Estrategia (simple y ajustable):
 *  - Para cada profesor listado, si existe usuario, se le asigna a un curso de su jornada.
 *  - Si hay asignaturas preferidas (Matemáticas, Español, Inglés), se usarán; sino se toma la primera.
 */
async function asignarDocentes(tx: any, anioId: string, cursoIds: Record<string, string>) {
  const profesores = Array.from(new Set(LISTA_ALUMNOS.map((r) => r[2]).filter(Boolean))) as string[]
  const preferidas = ['Matemáticas', 'Español', 'Inglés']

  for (const profName of profesores) {
    if (!profName) continue
    const parsed = parseNombreCompleto(profName)
    const email = generarEmail(parsed.primerNombre, parsed.primerApellido, process.env.SEMILLA_PERFILES_DOMINIO ?? 'demo.local')

    const [usuario] = await tx
      .select({ id: e.usuario.id })
      .from(e.usuario)
      .where(eq(e.usuario.correo, email))
      .limit(1)

    if (!usuario) {
      logger.warn({ profName }, 'Profesor no encontrado (se omite asignación)')
      continue
    }

    // elegir asignatura preferida si existe
    let asignaturaId: string | undefined
    for (const p of preferidas) {
      const [asig] = await tx.select({ id: e.asignatura.id }).from(e.asignatura).where(eq(e.asignatura.nombre, p)).limit(1)
      if (asig?.id) {
        asignaturaId = asig.id
        break
      }
    }
    if (!asignaturaId) {
      const [anyAsig] = await tx.select({ id: e.asignatura.id }).from(e.asignatura).limit(1)
      asignaturaId = anyAsig?.id
    }
    if (!asignaturaId) {
      logger.warn('No hay asignaturas creadas para asignar', { profName })
      continue
    }

    // Asignar al primer curso disponible (puedes mejorar lógica aquí)
    const anyCurso = Object.values(cursoIds)[0]
    if (!anyCurso) continue

    await tx.insert(e.asignacionDocente).values({
      anioLectivoId: anioId,
      docenteId: usuario.id,
      asignaturaId,
      cursoId: anyCurso,
    }).onConflictDoNothing()
  }
}

/* -------------------------------------------------------------------------- */
/* ------------------------ semilla principal (existente) ------------------- */
/* -------------------------------------------------------------------------- */

const PERFILES_DE_PRUEBA = [
  { rol: 'superadmin', nombre: 'Superadministrador', documento: '99000001' },
  { rol: 'admin', nombre: 'Administrador', documento: '99000002' },
  { rol: 'secretaria', nombre: 'Secretaría', documento: '99000003' },
  { rol: 'contador', nombre: 'Contador', documento: '99000004' },
  { rol: 'docente', nombre: 'Profesor', documento: '99000005' },
  { rol: 'estudiante', nombre: 'Estudiante', documento: '99000006' },
  { rol: 'acudiente', nombre: 'Acudiente', documento: '99000007' },
] as const

export function siembraDemoHabilitada(): boolean {
  return process.env['AGORA_SIEMBRA_DEMO'] === 'true'
}

export function correoDePrueba(rol: string, dominio: string): string {
  return `prueba.${rol}@${dominio}`
}

async function sembrarPerfilesDePrueba() {
  const contrasena = process.env['SEMILLA_PERFILES_CONTRASENA'] ?? ''
  const dominio = process.env['SEMILLA_PERFILES_DOMINIO'] ?? ''
  if (!siembraDemoHabilitada()) {
    logger.info('Usuarios de prueba por perfil: no se siembran sin AGORA_SIEMBRA_DEMO=true')
    return
  }
  if (contrasena.length < 12 || !dominio) {
    logger.info(
      'Usuarios de prueba por perfil: faltan SEMILLA_PERFILES_CONTRASENA (mínimo 12) o SEMILLA_PERFILES_DOMINIO'
    )
    return
  }

  const contrasenaHash = await hash(contrasena, { memoryCost: 65536, timeCost: 3, parallelism: 4 })

  for (const perfil of PERFILES_DE_PRUEBA) {
    const correo = correoDePrueba(perfil.rol, dominio)
    await conContextoRLS(db, CONTEXTO_SIEMBRA, async (tx) => {
      const [existente] = await tx
        .select({ id: e.usuario.id })
        .from(e.usuario)
        .where(eq(e.usuario.correo, correo))
        .limit(1)
      if (existente) return

      const [personaCreada] = await tx
        .insert(e.persona)
        .values({
          tipoDocumento: 'CC',
          numeroDocumento: perfil.documento,
          primerNombre: 'Prueba',
          primerApellido: perfil.nombre,
        })
        .onConflictDoNothing()
        .returning({ id: e.persona.id })
      const personaId =
        personaCreada?.id ??
        (await tx
          .select({ id: e.persona.id })
          .from(e.persona)
          .where(eq(e.persona.numeroDocumento, perfil.documento))
          .then((x) => x[0]?.id))
      if (!personaId) throw new Error(`No se pudo crear la persona de prueba de ${perfil.rol}`)

      const [usuarioCreado] = await tx
        .insert(e.usuario)
        .values({ personaId, correo, rol: perfil.rol, primerIngreso: false })
        .returning({ id: e.usuario.id })
      const usuarioId = usuarioCreado!.id
      const ahora = new Date()
      await tx.insert(e.baUser).values({
        id: usuarioId,
        name: `Prueba ${perfil.nombre}`,
        email: correo,
        emailVerified: true,
        createdAt: ahora,
        updatedAt: ahora,
      })
      await tx.insert(e.baAccount).values({
        id: usuarioId,
        accountId: usuarioId,
        providerId: 'credential',
        issuer: createLocalAccountIssuer('credential'),
        userId: usuarioId,
        password: contrasenaHash,
        createdAt: ahora,
        updatedAt: ahora,
      })
      logger.info({ rol: perfil.rol }, 'Usuario de prueba creado')
    })
  }
}

/* -------------------------------------------------------------------------- */
/* ------------------------------- flujo principal -------------------------- */
/* -------------------------------------------------------------------------- */

async function sembrar() {
  logger.info('Iniciando siembra de datos...')

  const [anioExistente] = await db
    .select({ id: e.anioLectivo.id })
    .from(e.anioLectivo)
    .where(eq(e.anioLectivo.nombre, '2025'))
    .orderBy(asc(e.anioLectivo.creadoEn), asc(e.anioLectivo.id))
    .limit(1)

  let anioId = anioExistente?.id

  if (!anioId) {
    const [anioCreado] = await db
      .insert(e.anioLectivo)
      .values({ nombre: '2025', inicio: '2025-02-01', fin: '2025-11-30', activo: true })
      .returning({ id: e.anioLectivo.id })
    anioId = anioCreado?.id
  }

  if (!anioId) throw new Error('No se pudo crear el año lectivo')

  const jornadas = [
    { codigo: 'D' as const, nombre: 'Diurna', detalle: 'Lunes a viernes en la mañana' },
    { codigo: 'S' as const, nombre: 'Semipresencial sabatina', detalle: null },
  ]
  const jornadaIds: Record<string, string> = {}
  for (const j of jornadas) {
    const [r] = await db.insert(e.jornada).values(j).onConflictDoNothing().returning()
    const id =
      r?.id ??
      (await db
        .select({ id: e.jornada.id })
        .from(e.jornada)
        .where(eq(e.jornada.codigo, j.codigo))
        .then((x) => x[0]?.id))
    if (!id) throw new Error(`Jornada ${j.codigo} no encontrada`)
    jornadaIds[j.codigo] = id
  }

  const ciclos = [
    { codigo: '3A', gradoEquivalente: 'Sexto', esquemaPeriodos: 'cuatro' },
    { codigo: '3B', gradoEquivalente: 'Séptimo', esquemaPeriodos: 'cuatro' },
    { codigo: '4A', gradoEquivalente: 'Octavo', esquemaPeriodos: 'cuatro' },
    { codigo: '4B', gradoEquivalente: 'Noveno', esquemaPeriodos: 'cuatro' },
    { codigo: '5', gradoEquivalente: 'Décimo', esquemaPeriodos: 'media' },
    { codigo: '6', gradoEquivalente: 'Undécimo', esquemaPeriodos: 'media' },
  ]
  const cicloIds: Record<string, string> = {}
  for (const c of ciclos) {
    const [r] = await db.insert(e.ciclo).values(c).onConflictDoNothing().returning()
    const id =
      r?.id ??
      (await db
        .select({ id: e.ciclo.id })
        .from(e.ciclo)
        .where(eq(e.ciclo.codigo, c.codigo))
        .then((x) => x[0]?.id))
    if (!id) throw new Error(`Ciclo ${c.codigo} no encontrado`)
    cicloIds[c.codigo] = id
  }

  /* ---------------------- escalas, periodos, areas, asignaturas --------------------- */
  const nivelesEscala = [
    { nivel: 'Bajo', desde: '1.0', hasta: '2.9', orden: 1 },
    { nivel: 'Básico', desde: '3.0', hasta: '3.9', orden: 2 },
    { nivel: 'Alto', desde: '4.0', hasta: '4.5', orden: 3 },
    { nivel: 'Superior', desde: '4.6', hasta: '5.0', orden: 4 },
  ]
  for (const n of nivelesEscala) {
    await db
      .insert(e.escalaValoracion)
      .values({ anioLectivoId: anioId, ...n })
      .onConflictDoNothing()
  }

  const periodos4 = [1, 2, 3, 4]
  for (const num of periodos4) {
    const inicio = `2025-${String(num * 2 + 1).padStart(2, '0')}-01`
    const fin = `2025-${String(num * 2 + 2).padStart(2, '0')}-28`
    await db
      .insert(e.periodo)
      .values({
        anioLectivoId: anioId,
        numero: num,
        esquema: 'cuatro',
        inicio,
        fin,
        notasAbiertas: num === 1,
      })
      .onConflictDoNothing()
  }
  for (const num of [1, 2]) {
    await db
      .insert(e.periodo)
      .values({
        anioLectivoId: anioId,
        numero: num,
        esquema: 'media',
        inicio: num === 1 ? '2025-02-01' : '2025-07-01',
        fin: num === 1 ? '2025-06-30' : '2025-11-30',
        notasAbiertas: num === 1,
      })
      .onConflictDoNothing()
  }

  const areasAsignaturas: Array<{ area: string; asignaturas: string[] }> = [
    {
      area: 'Ciencias Naturales y Educación Ambiental',
      asignaturas: ['Biología', 'Química', 'Física'],
    },
    {
      area: 'Ciencias Sociales, Constitución Política y Democracia',
      asignaturas: ['Ciencias Sociales', 'Democracia', 'Estudios del Poder'],
    },
    { area: 'Filosofía', asignaturas: ['Filosofía'] },
    { area: 'Educación Artística y Cultural', asignaturas: ['Artística'] },
    { area: 'Educación Ética en Valores Humanos', asignaturas: ['Ética y Valores Humanos'] },
    { area: 'Convivencia', asignaturas: ['Convivencia'] },
    { area: 'Educación Física, Recreación y Deporte', asignaturas: ['Educación Física'] },
    { area: 'Humanidades', asignaturas: ['Español'] },
    { area: 'Inglés', asignaturas: ['Inglés'] },
    { area: 'Matemáticas', asignaturas: ['Matemáticas'] },
    { area: 'Tecnología e Informática', asignaturas: ['Tecnología e Informática'] },
    { area: 'Educación Religiosa', asignaturas: ['Educación Religiosa y Moral'] },
  ]

  const asignaturaIds: Record<string, string> = {}
  for (const { area: nombreArea, asignaturas } of areasAsignaturas) {
    const [areaR] = await db
      .insert(e.area)
      .values({ nombre: nombreArea })
      .onConflictDoNothing()
      .returning()
    const areaId =
      areaR?.id ??
      (await db
        .select({ id: e.area.id })
        .from(e.area)
        .where(eq(e.area.nombre, nombreArea))
        .then((x) => x[0]?.id))
    if (!areaId) continue
    for (const nombreAsig of asignaturas) {
      const [asigR] = await db
        .insert(e.asignatura)
        .values({ areaId, nombre: nombreAsig })
        .onConflictDoNothing()
        .returning()
      const asigId =
        asigR?.id ??
        (await db
          .select({ id: e.asignatura.id })
          .from(e.asignatura)
          .where(eq(e.asignatura.nombre, nombreAsig))
          .then((x) => x[0]?.id))
      if (asigId) asignaturaIds[nombreAsig] = asigId
    }
  }

  /* ---------------------- conceptos, categorias, cms, configuracion --------------------- */
  const conceptos = ['Matrícula', 'Pensión mensual', 'Certificados y constancias', 'Otros ingresos']
  for (const nombre of conceptos) {
    await db
      .insert(e.conceptoIngreso)
      .values({ nombre })
      .onConflictDoNothing({
        target: e.conceptoIngreso.nombre,
        where: sql`${e.conceptoIngreso.eliminadoEn} IS NULL`,
      })
  }

  const categorias = [
    'Arriendo',
    'Servicios públicos',
    'Nómina docente',
    'Nómina administrativa',
    'Refrigerios y cocina',
    'Papelería e insumos',
    'Publicidad y mercadeo',
    'Mantenimiento y arreglos locativos',
    'Plataformas y software',
    'Caja menor',
  ]
  for (const nombre of categorias) {
    await db
      .insert(e.categoriaEgreso)
      .values({ nombre })
      .onConflictDoNothing({
        target: e.categoriaEgreso.nombre,
        where: sql`${e.categoriaEgreso.eliminadoEn} IS NULL`,
      })
  }

  await conContextoRLS(db, CONTEXTO_SIEMBRA, (tx) =>
    tx
      .insert(e.cmsEntrada)
      .values({
        tipo: 'noticia',
        slug: 'bienvenida',
        titulo: 'Bienvenidos al Colegio Ágora',
        subtitulo: 'La plataforma institucional ya está en línea',
        cuerpo:
          'A partir de esta primera versión, aspirantes, estudiantes, acudientes y docentes ' +
          'pueden encontrar aquí la información y los trámites del colegio: admisiones, oferta ' +
          'de ciclos y jornadas, y el acceso al panel académico.',
        estado: 'publicado',
      })
      .onConflictDoNothing()
  )

  const [configuracionExistente] = await db
    .select({ id: e.configuracionInstitucional.id })
    .from(e.configuracionInstitucional)
    .limit(1)

  if (!configuracionExistente) {
    await db.insert(e.configuracionInstitucional).values({
      nombreLegal: 'Institución Educativa Ágora Funza',
      nombreCorto: 'Colegio Ágora',
      lema: 'El fundamento de un Estado es la educación de sus jóvenes',
      municipio: 'Funza',
      departamento: 'Cundinamarca',
      rectorNombre: 'William Ricardo Hernández Garzón',
      dirAdmNombre: 'Emma Gamboa',
    })
  }

  const { env: envars } = await import('../env')

  await conContextoRLS(db, CONTEXTO_SIEMBRA, async (tx) => {
    const personaAdmin = await tx
      .insert(e.persona)
      .values({
        tipoDocumento: 'CC',
        numeroDocumento: '00000000',
        primerNombre: 'Administrador',
        primerApellido: 'Ágora',
        correo: envars.SUPERADMIN_EMAIL,
      })
      .onConflictDoNothing()
      .returning()

    const personaAdminId =
      personaAdmin[0]?.id ??
      (await tx
        .select({ id: e.persona.id })
        .from(e.persona)
        .where(eq(e.persona.numeroDocumento, '00000000'))
        .then((x) => x[0]?.id))

    if (!personaAdminId) return

    const usuarioInsertado = await tx
      .insert(e.usuario)
      .values({
        personaId: personaAdminId,
        correo: envars.SUPERADMIN_EMAIL,
        rol: 'superadmin',
        primerIngreso: true,
      })
      .onConflictDoNothing()
      .returning()

    const usuarioAdminId =
      usuarioInsertado[0]?.id ??
      (await tx
        .select({ id: e.usuario.id })
        .from(e.usuario)
        .where(eq(e.usuario.correo, envars.SUPERADMIN_EMAIL))
        .then((x) => x[0]?.id))

    if (!usuarioAdminId) return

    const credencialesExistentes = await tx
      .select({ id: e.baUser.id })
      .from(e.baUser)
      .where(eq(e.baUser.email, envars.SUPERADMIN_EMAIL))
      .limit(1)

    if (credencialesExistentes[0]) {
      logger.info('El superadministrador ya tiene credenciales; no se tocan')
      return
    }

    const contrasenaHash = await hash(envars.SUPERADMIN_CONTRASENA_INICIAL, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })

    await tx.insert(e.baUser).values({
      id: usuarioAdminId,
      name: 'Administrador Agora',
      email: envars.SUPERADMIN_EMAIL,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await tx.insert(e.baAccount).values({
      id: usuarioAdminId,
      accountId: usuarioAdminId,
      providerId: 'credential',
      issuer: createLocalAccountIssuer('credential'),
      userId: usuarioAdminId,
      password: contrasenaHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info({ correo: envars.SUPERADMIN_EMAIL }, 'Credenciales del superadministrador creadas')
  })

  /* ------------------- crear cursos, planes, matriculas y asignaciones ------------------ */
  await conContextoRLS(db, CONTEXTO_SIEMBRA, async (tx) => {
    const cursoIds = await crearCursosYPlanes(tx, anioId, cicloIds, jornadaIds, asignaturaIds)
    await matricularLista(tx, anioId, cursoIds)
    await asignarDocentes(tx, anioId, cursoIds)
  })

  await sembrarPerfilesDePrueba()
  await conContextoRLS(db, CONTEXTO_SIEMBRA, async (tx) => {
    // Si AGORA_SIEMBRA_LISTA=true, sembrar lista completa (personas, usuarios y relaciones)
    if (process.env['AGORA_SIEMBRA_LISTA'] === 'true') {
      logger.info('Ejecutando sembrarListaAlumnos() porque AGORA_SIEMBRA_LISTA=true')
      // la función sembrarListaAlumnos crea/usuario/estudiante_familiar; la llamamos dentro del contexto
      for (const [alumnoNombre, acudienteNombre, profesorNombre] of LISTA_ALUMNOS) {
        try {
          // Alumnos
          const alumnoParsed = parseNombreCompleto(alumnoNombre)
          const alumnoEmail = generarEmail(alumnoParsed.primerNombre, alumnoParsed.primerApellido, process.env.SEMILLA_PERFILES_DOMINIO ?? 'demo.local')
          const alumnoPersonaId = await getOrCreatePersonaTx(tx, alumnoNombre, alumnoEmail)
          if (alumnoPersonaId) await getOrCreateUsuarioTx(tx, alumnoPersonaId, alumnoEmail, 'estudiante')

          // Acudientes
          const acudienteParsed = parseNombreCompleto(acudienteNombre)
          const acudienteEmail = generarEmail(acudienteParsed.primerNombre, acudienteParsed.primerApellido, process.env.SEMILLA_PERFILES_DOMINIO ?? 'demo.local')
          const acudientePersonaId = await getOrCreatePersonaTx(tx, acudienteNombre, acudienteEmail)
          if (acudientePersonaId) {
            await getOrCreateUsuarioTx(tx, acudientePersonaId, acudienteEmail, 'acudiente')
            if (alumnoPersonaId) await getOrCreateEstudianteFamiliarTx(tx, alumnoPersonaId, acudientePersonaId, 'acudiente')
          }

          // Profesores opcionales
          if (profesorNombre) {
            const profParsed = parseNombreCompleto(profesorNombre)
            const profEmail = generarEmail(profParsed.primerNombre, profParsed.primerApellido, process.env.SEMILLA_PERFILES_DOMINIO ?? 'demo.local')
            const profesorPersonaId = await getOrCreatePersonaTx(tx, profesorNombre, profEmail)
            if (profesorPersonaId) await getOrCreateUsuarioTx(tx, profesorPersonaId, profEmail, 'docente')
          }

          logger.info({ alumno: alumnoNombre, acudiente: acudienteNombre, profesor: profesorNombre }, 'Fila semillada (lista)')
        } catch (err) {
          logger.error({ err, alumnoNombre, acudienteNombre, profesorNombre }, 'Error semillando fila (lista)')
        }
      }
    } else {
      logger.info('AGORA_SIEMBRA_LISTA != true → no se ejecuta la siembra detallada de la lista (solo se crearon cursos/matriculas/asignaciones).')
    }
  })

  logger.info('Siembra completada correctamente')
}

sembrar()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Error en la siembra')
    process.exit(1)
  })