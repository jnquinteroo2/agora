import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'path'
import * as e from '../../src/datos/esquema'
import { conContextoRLS as conContextoRLSReal, type DB } from '../../src/datos/cliente'

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
    user: { id: actorActual.id, email: `${actorActual.rol}@obs-test.com`, name: 'Test' },
  })),
  obtenerUsuarioActual: vi.fn(async () => ({
    id: actorActual.id,
    personaId: actorActual.id,
    correo: `${actorActual.rol}@obs-test.com`,
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
  matriculaId: string
  docenteAsignadoId: string
  docenteNoAsignadoId: string
  estudianteId: string
}

async function ins<T>(promesa: Promise<T[]>): Promise<T> {
  const r = await promesa
  if (!r[0]) throw new Error('insert sin retorno')
  return r[0]
}

beforeAll(async () => {
  _contenedor = await new PostgreSqlContainer('postgres:18-alpine').withExposedPorts(5432).start()

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

  const anio = await ins(dbRoot.insert(e.anioLectivo).values({ nombre: 'OBS-TEST-2025', inicio: '2025-01-01', fin: '2025-12-31', activo: true }).returning())
  const jornada = await ins(dbRoot.insert(e.jornada).values({ codigo: 'D', nombre: 'Diurna' }).returning())
  const ciclo = await ins(dbRoot.insert(e.ciclo).values({ codigo: '4A-OBS', gradoEquivalente: 'Octavo', esquemaPeriodos: 'cuatro' }).returning())
  const curso = await ins(dbRoot.insert(e.curso).values({ anioLectivoId: anio.id, cicloId: ciclo.id, jornadaId: jornada.id, nombre: 'Curso OBS-TEST' }).returning())

  const pDocenteAsignado = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '50000001', primerNombre: 'Docente', primerApellido: 'Asignado' }).returning())
  const uDocenteAsignado = await ins(dbRoot.insert(e.usuario).values({ personaId: pDocenteAsignado.id, correo: 'docente_asignado@obs-test.com', rol: 'docente' }).returning())

  const area = await ins(dbRoot.insert(e.area).values({ nombre: 'Área OBS-TEST' }).returning())
  const asig = await ins(dbRoot.insert(e.asignatura).values({ areaId: area.id, nombre: 'Asignatura OBS-TEST' }).returning())
  await dbRoot.insert(e.asignacionDocente).values({ anioLectivoId: anio.id, docenteId: uDocenteAsignado.id, asignaturaId: asig.id, cursoId: curso.id })

  const pDocenteNoAsignado = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '50000002', primerNombre: 'Docente', primerApellido: 'SinAsignar' }).returning())
  const uDocenteNoAsignado = await ins(dbRoot.insert(e.usuario).values({ personaId: pDocenteNoAsignado.id, correo: 'docente_sin_asignar@obs-test.com', rol: 'docente' }).returning())

  const pEst = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'TI', numeroDocumento: '60000001', primerNombre: 'Estudiante', primerApellido: 'OBS-TEST' }).returning())
  const uEst = await ins(dbRoot.insert(e.usuario).values({ personaId: pEst.id, correo: 'estudiante@obs-test.com', rol: 'estudiante' }).returning())
  const matricula = await ins(dbRoot.insert(e.matricula).values({ anioLectivoId: anio.id, estudianteId: pEst.id, cursoId: curso.id, estado: 'activo' }).returning())

  ids = {
    anioId: anio.id,
    matriculaId: matricula.id,
    docenteAsignadoId: uDocenteAsignado.id,
    docenteNoAsignadoId: uDocenteNoAsignado.id,
    estudianteId: uEst.id,
  }
}

describe('observador del estudiante — Server Actions reales → conContextoRLS → BD', () => {
  it('un docente asignado registra una observación convivencial', async () => {
    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarObservacion } = await import('../../src/acciones/observador/observador')

    const resultado = await registrarObservacion({
      matriculaId: ids.matriculaId,
      anioLectivoId: ids.anioId,
      tipo: 'convivencial',
      descripcion: 'Llamado de atención por llegada tarde reiterada.',
    })

    expect(resultado?.serverError, resultado?.serverError).toBeUndefined()
    expect(resultado?.data?.tipo).toBe('convivencial')
  })

  it('un docente NO asignado al curso no puede registrar una observación (rechazado por RLS)', async () => {
    actorActual = { id: ids.docenteNoAsignadoId, rol: 'docente' }
    const { registrarObservacion } = await import('../../src/acciones/observador/observador')

    const resultado = await registrarObservacion({
      matriculaId: ids.matriculaId,
      anioLectivoId: ids.anioId,
      tipo: 'academica',
      descripcion: 'Intento de un docente sin asignación.',
    })

    expect(resultado?.serverError).toBeDefined()
  })

  it('el estudiante puede leer una observación de tipo compromiso, pero no una convivencial/académica', async () => {
    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarObservacion } = await import('../../src/acciones/observador/observador')
    await registrarObservacion({
      matriculaId: ids.matriculaId,
      anioLectivoId: ids.anioId,
      tipo: 'compromiso',
      descripcion: 'Compromiso de mejora firmado con el estudiante.',
    })

    const filasVisibles = await conContextoRLSReal(
      _dbApp!,
      { usuarioId: ids.estudianteId, rol: 'estudiante', anioLectivoId: ids.anioId },
      async (tx) => tx.select().from(e.observadorRegistro)
    )

    const tipos = filasVisibles.map((f) => f.tipo)
    expect(tipos).toContain('compromiso')
    expect(tipos).not.toContain('convivencial')
    expect(tipos).not.toContain('academica')
  })

  it('marcarFirmaObservador actualiza las banderas de firma', async () => {
    actorActual = { id: ids.docenteAsignadoId, rol: 'docente' }
    const { registrarObservacion, marcarFirmaObservador } = await import('../../src/acciones/observador/observador')

    const creada = await registrarObservacion({
      matriculaId: ids.matriculaId,
      anioLectivoId: ids.anioId,
      tipo: 'academica',
      descripcion: 'Nota académica de prueba para firmar.',
    })
    expect(creada?.serverError, creada?.serverError).toBeUndefined()

    const firmada = await marcarFirmaObservador({
      observacionId: creada!.data!.id,
      anioLectivoId: ids.anioId,
      firmadoEstudiante: true,
      firmadoAcudiente: true,
    })

    expect(firmada?.serverError, firmada?.serverError).toBeUndefined()
    expect(firmada?.data?.firmadoEstudiante).toBe(true)
    expect(firmada?.data?.firmadoAcudiente).toBe(true)
  })
})
