import { hash } from '@node-rs/argon2'
import { createLocalAccountIssuer } from 'better-auth/db'
import { db, conContextoRLS } from './cliente'
import * as e from './esquema'
import { eq, and } from 'drizzle-orm'
import { logger } from '../logger'

const CONTEXTO_SIEMBRA = {
  usuarioId: '00000000-0000-0000-0000-000000000000',
  rol: 'superadmin' as const,
}

async function upsert<T extends { id: string }>(
  tabla: Parameters<typeof db.insert>[0],
  valores: Record<string, unknown>,
  condicion: Parameters<typeof db.select>[0]
): Promise<string> {
  const existentes = await (db.select({ id: (tabla as any).id }).from(tabla as any).where(condicion as any).limit(1)) as T[]
  if (existentes[0]) return existentes[0].id
  const insertados = await db.insert(tabla as any).values(valores).returning({ id: (tabla as any).id })
  const insertado = insertados[0]
  if (!insertado) throw new Error('Insert falló sin retornar id')
  return (insertado as { id: string }).id
}

async function sembrar() {
  logger.info('Iniciando siembra de datos...')

  const [anio] = await db
    .insert(e.anioLectivo)
    .values({ nombre: '2025', inicio: '2025-02-01', fin: '2025-11-30', activo: true })
    .onConflictDoNothing()
    .returning()

  const anioId = anio?.id ?? (
    await db.select({ id: e.anioLectivo.id })
      .from(e.anioLectivo)
      .where(eq(e.anioLectivo.nombre, '2025'))
      .then(r => r[0]?.id)
  )
  if (!anioId) throw new Error('No se pudo crear el año lectivo')

  const jornadas = [
    { codigo: 'D' as const, nombre: 'Diurna', detalle: 'Lunes a viernes en la mañana' },
    { codigo: 'N' as const, nombre: 'Nocturna', detalle: null },
    { codigo: 'S' as const, nombre: 'Semipresencial sabatina', detalle: null },
  ]
  const jornadaIds: Record<string, string> = {}
  for (const j of jornadas) {
    const [r] = await db.insert(e.jornada).values(j).onConflictDoNothing().returning()
    const id = r?.id ?? (await db.select({ id: e.jornada.id }).from(e.jornada).where(eq(e.jornada.codigo, j.codigo)).then(x => x[0]?.id))
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
    const id = r?.id ?? (await db.select({ id: e.ciclo.id }).from(e.ciclo).where(eq(e.ciclo.codigo, c.codigo)).then(x => x[0]?.id))
    if (!id) throw new Error(`Ciclo ${c.codigo} no encontrado`)
    cicloIds[c.codigo] = id
  }

  const nivelesEscala = [
    { nivel: 'Bajo', desde: '1.0', hasta: '2.9', orden: 1 },
    { nivel: 'Básico', desde: '3.0', hasta: '3.9', orden: 2 },
    { nivel: 'Alto', desde: '4.0', hasta: '4.5', orden: 3 },
    { nivel: 'Superior', desde: '4.6', hasta: '5.0', orden: 4 },
  ]
  for (const n of nivelesEscala) {
    await db.insert(e.escalaValoracion).values({ anioLectivoId: anioId, ...n }).onConflictDoNothing()
  }

  const periodos4 = [1, 2, 3, 4]
  for (const num of periodos4) {
    const inicio = `2025-${String(num * 2 + 1).padStart(2, '0')}-01`
    const fin = `2025-${String(num * 2 + 2).padStart(2, '0')}-28`
    await db.insert(e.periodo).values({
      anioLectivoId: anioId, numero: num, esquema: 'cuatro',
      inicio, fin, notasAbiertas: num === 1,
    }).onConflictDoNothing()
  }
  for (const num of [1, 2]) {
    await db.insert(e.periodo).values({
      anioLectivoId: anioId, numero: num, esquema: 'media',
      inicio: num === 1 ? '2025-02-01' : '2025-07-01',
      fin: num === 1 ? '2025-06-30' : '2025-11-30',
      notasAbiertas: num === 1,
    }).onConflictDoNothing()
  }

  const areasAsignaturas: Array<{ area: string; asignaturas: string[] }> = [
    { area: 'Ciencias Naturales y Educación Ambiental', asignaturas: ['Biología', 'Química', 'Física'] },
    { area: 'Ciencias Sociales, Constitución Política y Democracia', asignaturas: ['Ciencias Sociales', 'Democracia', 'Estudios del Poder'] },
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
    const [areaR] = await db.insert(e.area).values({ nombre: nombreArea }).onConflictDoNothing().returning()
    const areaId = areaR?.id ?? (await db.select({ id: e.area.id }).from(e.area).where(eq(e.area.nombre, nombreArea)).then(x => x[0]?.id))
    if (!areaId) continue
    for (const nombreAsig of asignaturas) {
      const [asigR] = await db.insert(e.asignatura).values({ areaId, nombre: nombreAsig }).onConflictDoNothing().returning()
      const asigId = asigR?.id ?? (await db.select({ id: e.asignatura.id }).from(e.asignatura).where(eq(e.asignatura.nombre, nombreAsig)).then(x => x[0]?.id))
      if (asigId) asignaturaIds[nombreAsig] = asigId
    }
  }

  const nivelesDesc = ['Bajo', 'Básico', 'Alto', 'Superior'] as const
  const descriptoresBase: Record<string, Record<string, string>> = {
    'Matemáticas': {
      'Bajo': 'Presenta dificultades para comprender y aplicar los conceptos matemáticos básicos del ciclo.',
      'Básico': 'Comprende y aplica los conceptos matemáticos mínimos requeridos para el ciclo.',
      'Alto': 'Comprende y aplica con solidez los conceptos matemáticos, resolviendo situaciones con lógica.',
      'Superior': 'Domina con profundidad los conceptos matemáticos y los aplica en situaciones complejas con autonomía.',
    },
    'Español': {
      'Bajo': 'Presenta dificultades en la comprensión lectora y en la producción textual básica.',
      'Básico': 'Lee y produce textos sencillos con comprensión aceptable del nivel.',
      'Alto': 'Lee con sentido crítico y produce textos coherentes con propiedad lingüística.',
      'Superior': 'Demuestra excelente comprensión lectora y produce textos elaborados con riqueza argumentativa.',
    },
  }
  for (const [asignatura, descriptores] of Object.entries(descriptoresBase)) {
    const asigId = asignaturaIds[asignatura]
    if (!asigId) continue
    for (const nivel of nivelesDesc) {
      const texto = descriptores[nivel]
      if (texto) {
        await db.insert(e.descriptor).values({ asignaturaId: asigId, nivel, texto }).onConflictDoNothing()
      }
    }
  }

  const conceptos = ['Matrícula', 'Pensión mensual', 'Certificados y constancias', 'Otros ingresos']
  for (const nombre of conceptos) {
    await db.insert(e.conceptoIngreso).values({ nombre }).onConflictDoNothing()
  }

  const categorias = [
    'Arriendo', 'Servicios públicos', 'Nómina docente', 'Nómina administrativa',
    'Refrigerios y cocina', 'Papelería e insumos', 'Publicidad y mercadeo',
    'Mantenimiento y arreglos locativos', 'Plataformas y software', 'Caja menor',
  ]
  for (const nombre of categorias) {
    await db.insert(e.categoriaEgreso).values({ nombre }).onConflictDoNothing()
  }

  await conContextoRLS(db, CONTEXTO_SIEMBRA, (tx) =>
    tx.insert(e.cmsEntrada).values({
      tipo: 'noticia',
      slug: 'bienvenida',
      titulo: 'Bienvenidos al Colegio Ágora',
      subtitulo: 'La plataforma institucional ya está en línea',
      cuerpo:
        'A partir de esta primera versión, aspirantes, estudiantes, acudientes y docentes ' +
        'pueden encontrar aquí la información y los trámites del colegio: admisiones, oferta ' +
        'de ciclos y jornadas, y el acceso al panel académico.',
      estado: 'publicado',
    }).onConflictDoNothing()
  )

  await db.insert(e.configuracionInstitucional).values({
    nombreLegal: 'Institución Educativa Ágora Funza',
    nombreCorto: 'Colegio Ágora',
    lema: 'El fundamento de un Estado es la educación de sus jóvenes',
    municipio: 'Funza',
    departamento: 'Cundinamarca',
    rectorNombre: 'William Ricardo Hernández Garzón',
    dirAdmNombre: 'Emma Gamboa',
  }).onConflictDoNothing()

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

    const personaAdminId = personaAdmin[0]?.id ?? (
      await tx.select({ id: e.persona.id }).from(e.persona)
        .where(eq(e.persona.numeroDocumento, '00000000'))
        .then(x => x[0]?.id)
    )

    if (!personaAdminId) return

    const usuarioInsertado = await tx.insert(e.usuario).values({
      personaId: personaAdminId,
      correo: envars.SUPERADMIN_EMAIL,
      rol: 'superadmin',
      primerIngreso: true,
    }).onConflictDoNothing().returning()

    const usuarioAdminId = usuarioInsertado[0]?.id ?? (
      await tx.select({ id: e.usuario.id }).from(e.usuario)
        .where(eq(e.usuario.correo, envars.SUPERADMIN_EMAIL))
        .then(x => x[0]?.id)
    )

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

  logger.info('Siembra completada correctamente')
}

sembrar()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Error en la siembra')
    process.exit(1)
  })
