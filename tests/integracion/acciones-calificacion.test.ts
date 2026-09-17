import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'path'
import * as e from '../../src/datos/esquema'
import type { DB } from '../../src/datos/cliente'

const MIGRATIONS_DIR = join(__dirname, '../../src/datos/migraciones')

interface Actor {
  id: string
  rol: 'superadmin' | 'docente' | 'estudiante'
}

let _dbApp: DB | undefined = undefined
let actorActual: Actor = { id: '', rol: 'superadmin' }

vi.mock('../../src/datos/cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/datos/cliente')>()
  return {
    ...original,
    db: {} as DB,
    conContextoRLS: async <T>(
      _base: DB,
      ctx: Parameters<typeof original.conContextoRLS>[1],
      fn: Parameters<typeof original.conContextoRLS>[2]
    ) =>
      original.conContextoRLS(
        _dbApp!,
        ctx,
        fn as (tx: Parameters<typeof original.conContextoRLS>[2] extends (tx: infer TX) => unknown ? TX : never) => Promise<T>
      ),
  }
})

vi.mock('../../src/auth/sesion', () => ({
  obtenerSesion: vi.fn(async () => ({
    user: { id: actorActual.id, email: `${actorActual.rol}@test.com`, name: 'Test' },
  })),
  obtenerUsuarioActual: vi.fn(async () => ({
    id: actorActual.id,
    personaId: actorActual.id,
    correo: `${actorActual.rol}@test.com`,
    rol: actorActual.rol,
    activo: true,
    primerIngreso: false,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  })),
}))

let _sqlRoot: Sql
let _sqlApp: Sql
let _contenedor: StartedPostgreSqlContainer

let ids: {
  anioId: string
  periodoAbiertoId: string
  periodoCerradoId: string
  asignaturaId: string
  otraAsignaturaId: string
  matriculaId: string
  docenteAsignadoId: string
  docenteNoAsignadoId: string
  superadminId: string
}

async function ins<T>(promesa: Promise<T[]>): Promise<T> {
  const r = await promesa
  if (!r[0]) throw new Error('insert sin retorno')
  return r[0]
}

beforeAll(async () => {
  _contenedor = await new PostgreSqlContainer('postgres:18-alpine')
    .withExposedPorts(5432)
    .start()

  const urlRoot = _contenedor.getConnectionUri()
  _sqlRoot = postgres(urlRoot)

  await _sqlRoot`CREATE ROLE agora_migraciones WITH LOGIN PASSWORD 'test' NOSUPERUSER NOCREATEDB NOCREATEROLE`
  await _sqlRoot`CREATE ROLE agora_app WITH LOGIN PASSWORD 'test' NOSUPERUSER NOCREATEDB NOCREATEROLE`
  await _sqlRoot`GRANT CONNECT ON DATABASE test TO agora_migraciones`
  await _sqlRoot`GRANT CONNECT ON DATABASE test TO agora_app`
  await _sqlRoot`GRANT CREATE ON DATABASE test TO agora_migraciones`
  await _sqlRoot`GRANT USAGE, CREATE ON SCHEMA public TO agora_migraciones`
  await _sqlRoot`GRANT USAGE ON SCHEMA public TO agora_app`
  await _sqlRoot`
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agora_app;
  `
  await _sqlRoot`
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO agora_app;
  `

  const urlMigraciones = urlRoot.replace(/postgres:\/\/[^@]+@/, 'postgres://agora_migraciones:test@')
  const sqlMigraciones = postgres(urlMigraciones)
  const dbMig = drizzle(sqlMigraciones)
  await migrate(dbMig, { migrationsFolder: MIGRATIONS_DIR })
  await sqlMigraciones.end()

  const urlApp = urlRoot.replace(/postgres:\/\/[^@]+@/, 'postgres://agora_app:test@')
  _sqlApp = postgres(urlApp)
  _dbApp = drizzle(_sqlApp, { schema: e }) as DB

  await sembrar()
}, 120_000)

afterAll(async () => {
  await _sqlApp?.end()
  await _sqlRoot?.end()
  await _contenedor?.stop()
})

async function sembrar() {
  const dbRoot = drizzle(_sqlRoot, { schema: e })

  const anio = await ins(dbRoot.insert(e.anioLectivo).values({ nombre: 'CAL-TEST-2025', inicio: '2025-01-01', fin: '2025-12-31', activo: true }).returning())
  const jornada = await ins(dbRoot.insert(e.jornada).values({ codigo: 'D', nombre: 'Diurna' }).returning())
  const ciclo = await ins(dbRoot.insert(e.ciclo).values({ codigo: '4A-CAL', gradoEquivalente: 'Octavo', esquemaPeriodos: 'cuatro' }).returning())
  const area = await ins(dbRoot.insert(e.area).values({ nombre: 'Matemáticas CAL-TEST' }).returning())
  const asig = await ins(dbRoot.insert(e.asignatura).values({ areaId: area.id, nombre: 'Álgebra CAL-TEST' }).returning())
  const otraAsig = await ins(dbRoot.insert(e.asignatura).values({ areaId: area.id, nombre: 'Geometría CAL-TEST' }).returning())
  const curso = await ins(dbRoot.insert(e.curso).values({ anioLectivoId: anio.id, cicloId: ciclo.id, jornadaId: jornada.id, nombre: 'Curso CAL-TEST' }).returning())

  const periodoAbierto = await ins(dbRoot.insert(e.periodo).values({ anioLectivoId: anio.id, numero: 1, esquema: 'cuatro', inicio: '2025-01-01', fin: '2025-03-31', notasAbiertas: true }).returning())
  const periodoCerrado = await ins(dbRoot.insert(e.periodo).values({ anioLectivoId: anio.id, numero: 2, esquema: 'cuatro', inicio: '2025-04-01', fin: '2025-06-30', notasAbiertas: false, cerradoEn: new Date() }).returning())

  await dbRoot.insert(e.escalaValoracion).values([
    { anioLectivoId: anio.id, nivel: 'Bajo', desde: '1.0', hasta: '2.9', orden: 1 },
    { anioLectivoId: anio.id, nivel: 'Básico', desde: '3.0', hasta: '3.9', orden: 2 },
    { anioLectivoId: anio.id, nivel: 'Alto', desde: '4.0', hasta: '4.5', orden: 3 },
    { anioLectivoId: anio.id, nivel: 'Superior', desde: '4.6', hasta: '5.0', orden: 4 },
  ])

  const pDocenteAsignado = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '30000001', primerNombre: 'Docente', primerApellido: 'Asignado' }).returning())
  const uDocenteAsignado = await ins(dbRoot.insert(e.usuario).values({ personaId: pDocenteAsignado.id, correo: 'docente_asignado@cal-test.com', rol: 'docente' }).returning())
  await dbRoot.insert(e.asignacionDocente).values({ anioLectivoId: anio.id, docenteId: uDocenteAsignado.id, asignaturaId: asig.id, cursoId: curso.id })

  const pDocenteNoAsignado = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '30000002', primerNombre: 'Docente', primerApellido: 'SinAsignar' }).returning())
  const uDocenteNoAsignado = await ins(dbRoot.insert(e.usuario).values({ personaId: pDocenteNoAsignado.id, correo: 'docente_sin_asignar@cal-test.com', rol: 'docente' }).returning())

  const pSuperadmin = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '30000003', primerNombre: 'Super', primerApellido: 'Admin' }).returning())
  const uSuperadmin = await ins(dbRoot.insert(e.usuario).values({ personaId: pSuperadmin.id, correo: 'superadmin@cal-test.com', rol: 'superadmin' }).returning())

  const pEst = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'TI', numeroDocumento: '40000001', primerNombre: 'Estudiante', primerApellido: 'CAL-TEST' }).returning())
  const matricula = await ins(dbRoot.insert(e.matricula).values({ anioLectivoId: anio.id, estudianteId: pEst.id, cursoId: curso.id, estado: 'activo' }).returning())

  ids = {
    anioId: anio.id,
    periodoAbiertoId: periodoAbierto.id,
    periodoCerradoId: periodoCerrado.id,
    asignaturaId: asig.id,
    otraAsignaturaId: otraAsig.id,
    matriculaId: matricula.id,
    docenteAsignadoId: uDocenteAsignado.id,
    docenteNoAsignadoId: uDocenteNoAsignado.id,
    superadminId: uSuperadmin.id,
  }
}

describe('registrarCalificacion — Server Action real → conContextoRLS → BD', () => {
  it('un docente asignado registra una nota en un periodo abierto y el nivel de desempeño se calcula en el servidor', async () => {
    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarCalificacion } = await import('../../src/acciones/calificaciones/calificacion')

    const resultado = await registrarCalificacion({
      matriculaId: ids.matriculaId,
      asignaturaId: ids.asignaturaId,
      periodoId: ids.periodoAbiertoId,
      nota: 4.2,
      fallas: 1,
    })

    expect(resultado?.serverError, resultado?.serverError).toBeUndefined()
    expect(resultado?.data?.nota).toBe('4.2')
    expect(resultado?.data?.nivelDesempeno).toBe('Alto')
    expect(resultado?.data?.fallas).toBe(1)

    const [fila] = await _sqlRoot`SELECT nota, nivel_desempeno FROM calificacion WHERE matricula_id = ${ids.matriculaId} AND asignatura_id = ${ids.asignaturaId} AND periodo_id = ${ids.periodoAbiertoId}`
    expect(fila!['nota']).toBe('4.2')
    console.log(`[ACCIÓN] registrarCalificacion (docente asignado) → nota=${fila!['nota']} nivel=${fila!['nivel_desempeno']} ✓`)
  })

  it('actualizar una nota existente escribe calificacion_historial con la nota anterior', async () => {
    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarCalificacion } = await import('../../src/acciones/calificaciones/calificacion')

    const resultado = await registrarCalificacion({
      matriculaId: ids.matriculaId,
      asignaturaId: ids.asignaturaId,
      periodoId: ids.periodoAbiertoId,
      nota: 3.8,
      fallas: 2,
      razon: 'Corrección de digitación',
    })

    expect(resultado?.serverError, resultado?.serverError).toBeUndefined()
    expect(resultado?.data?.nota).toBe('3.8')

    const historial = await _sqlRoot`
      SELECT nota_anterior, nota_nueva, razon FROM calificacion_historial
      WHERE calificacion_id = ${resultado!.data!.id}
      ORDER BY modificado_en DESC LIMIT 1
    `
    expect(historial[0]!['nota_anterior']).toBe('4.2')
    expect(historial[0]!['nota_nueva']).toBe('3.8')
    expect(historial[0]!['razon']).toBe('Corrección de digitación')
    console.log(`[HISTORIAL] ${historial[0]!['nota_anterior']} → ${historial[0]!['nota_nueva']} ✓`)
  })

  it('un docente NO asignado a la asignatura no puede registrar la nota (rechazado por RLS)', async () => {
    actorActual = { id: ids.docenteNoAsignadoId, rol: 'docente' }
    const { registrarCalificacion } = await import('../../src/acciones/calificaciones/calificacion')

    const resultado = await registrarCalificacion({
      matriculaId: ids.matriculaId,
      asignaturaId: ids.otraAsignaturaId,
      periodoId: ids.periodoAbiertoId,
      nota: 5.0,
      fallas: 0,
    })

    expect(resultado?.serverError).toBeDefined()
    console.log(`[RLS] docente sin asignación → rechazado: ${resultado?.serverError} ✓`)

    const filas = await _sqlRoot`SELECT id FROM calificacion WHERE asignatura_id = ${ids.otraAsignaturaId}`
    expect(filas).toHaveLength(0)
  })

  it('un periodo cerrado rechaza el registro con un mensaje claro, antes de tocar la BD', async () => {
    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarCalificacion } = await import('../../src/acciones/calificaciones/calificacion')

    const resultado = await registrarCalificacion({
      matriculaId: ids.matriculaId,
      asignaturaId: ids.asignaturaId,
      periodoId: ids.periodoCerradoId,
      nota: 4.0,
      fallas: 0,
    })

    expect(resultado?.serverError).toBe('El periodo está cerrado: no se pueden registrar ni modificar notas')

    const filas = await _sqlRoot`SELECT id FROM calificacion WHERE periodo_id = ${ids.periodoCerradoId}`
    expect(filas).toHaveLength(0)
  })

  it('una calificación bloqueada por el superadmin ya no se puede modificar, ni siquiera por el docente asignado', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { bloquearCalificacion } = await import('../../src/acciones/calificaciones/calificacion')

    const [filaActual] = await _sqlRoot`SELECT id FROM calificacion WHERE matricula_id = ${ids.matriculaId} AND asignatura_id = ${ids.asignaturaId} AND periodo_id = ${ids.periodoAbiertoId}`
    const bloqueo = await bloquearCalificacion({ calificacionId: filaActual!['id'] as string, bloqueado: true })
    expect(bloqueo?.serverError, bloqueo?.serverError).toBeUndefined()

    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarCalificacion } = await import('../../src/acciones/calificaciones/calificacion')
    const resultado = await registrarCalificacion({
      matriculaId: ids.matriculaId,
      asignaturaId: ids.asignaturaId,
      periodoId: ids.periodoAbiertoId,
      nota: 1.0,
      fallas: 0,
    })

    expect(resultado?.serverError).toBe('Esta calificación está bloqueada y no se puede modificar')
    console.log('[BLOQUEO] docente asignado intenta modificar nota bloqueada → rechazado ✓')
  })
})
