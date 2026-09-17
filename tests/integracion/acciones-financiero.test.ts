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
    user: { id: actorActual.id, email: `${actorActual.rol}@fin-test.com`, name: 'Test' },
  })),
  obtenerUsuarioActual: vi.fn(async () => ({
    id: actorActual.id,
    personaId: actorActual.id,
    correo: `${actorActual.rol}@fin-test.com`,
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
  superadminId: string
  docenteId: string
  estudianteAId: string
  estudianteBId: string
  matriculaAId: string
  conceptoId: string
  categoriaId: string
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

  const anio = await ins(dbRoot.insert(e.anioLectivo).values({ nombre: 'FIN-TEST-2025', inicio: '2025-01-01', fin: '2025-12-31', activo: true }).returning())
  const jornada = await ins(dbRoot.insert(e.jornada).values({ codigo: 'D', nombre: 'Diurna' }).returning())
  const ciclo = await ins(dbRoot.insert(e.ciclo).values({ codigo: '4A-FIN', gradoEquivalente: 'Octavo', esquemaPeriodos: 'cuatro' }).returning())
  const curso = await ins(dbRoot.insert(e.curso).values({ anioLectivoId: anio.id, cicloId: ciclo.id, jornadaId: jornada.id, nombre: 'Curso FIN-TEST' }).returning())

  const pSuper = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '70000001', primerNombre: 'Super', primerApellido: 'Admin' }).returning())
  const uSuper = await ins(dbRoot.insert(e.usuario).values({ personaId: pSuper.id, correo: 'super@fin-test.com', rol: 'superadmin' }).returning())

  const pDocente = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '70000002', primerNombre: 'Docente', primerApellido: 'FIN-TEST' }).returning())
  const uDocente = await ins(dbRoot.insert(e.usuario).values({ personaId: pDocente.id, correo: 'docente@fin-test.com', rol: 'docente' }).returning())

  const pEstA = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'TI', numeroDocumento: '80000001', primerNombre: 'Estudiante', primerApellido: 'A' }).returning())
  const uEstA = await ins(dbRoot.insert(e.usuario).values({ personaId: pEstA.id, correo: 'estudiante-a@fin-test.com', rol: 'estudiante' }).returning())
  const matriculaA = await ins(dbRoot.insert(e.matricula).values({ anioLectivoId: anio.id, estudianteId: pEstA.id, cursoId: curso.id, estado: 'activo' }).returning())

  const pEstB = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'TI', numeroDocumento: '80000002', primerNombre: 'Estudiante', primerApellido: 'B' }).returning())
  const uEstB = await ins(dbRoot.insert(e.usuario).values({ personaId: pEstB.id, correo: 'estudiante-b@fin-test.com', rol: 'estudiante' }).returning())

  const concepto = await ins(dbRoot.insert(e.conceptoIngreso).values({ nombre: 'Pensión' }).returning())
  const categoria = await ins(dbRoot.insert(e.categoriaEgreso).values({ nombre: 'Servicios públicos' }).returning())

  ids = {
    anioId: anio.id,
    superadminId: uSuper.id,
    docenteId: uDocente.id,
    estudianteAId: uEstA.id,
    estudianteBId: uEstB.id,
    matriculaAId: matriculaA.id,
    conceptoId: concepto.id,
    categoriaId: categoria.id,
  }
}

describe('financiero — Server Actions reales → conContextoRLS → BD', () => {
  it('el superadmin registra un recibo de caja con consecutivo autoincremental', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { registrarRecibo } = await import('../../src/acciones/financiero/recibo')

    const primero = await registrarRecibo({
      matriculaId: ids.matriculaAId,
      beneficiario: 'Acudiente Estudiante A',
      conceptoId: ids.conceptoId,
      valor: 150000,
      formaPago: 'efectivo',
      fecha: '2025-03-01',
    })
    expect(primero?.serverError, primero?.serverError).toBeUndefined()
    expect(primero?.data?.consecutivo).toBe(1)

    const segundo = await registrarRecibo({
      beneficiario: 'Un tercero cualquiera',
      conceptoId: ids.conceptoId,
      valor: 50000,
      formaPago: 'transferencia',
      fecha: '2025-03-02',
    })
    expect(segundo?.serverError, segundo?.serverError).toBeUndefined()
    expect(segundo?.data?.consecutivo).toBe(2)
  })

  it('un docente no puede registrar un recibo de caja (rechazado por el gate de rol / RLS)', async () => {
    actorActual = { id: ids.docenteId, rol: 'docente' }
    const { registrarRecibo } = await import('../../src/acciones/financiero/recibo')

    const resultado = await registrarRecibo({
      beneficiario: 'Intento no autorizado',
      conceptoId: ids.conceptoId,
      valor: 10000,
      formaPago: 'efectivo',
      fecha: '2025-03-03',
    })

    expect(resultado?.serverError).toBeDefined()
  })

  it('el estudiante A ve su propio recibo pero no ve el recibo del tercero', async () => {
    const visibles = await conContextoRLSReal(
      _dbApp!,
      { usuarioId: ids.estudianteAId, rol: 'estudiante' },
      async (tx) => tx.select().from(e.reciboCaja)
    )

    expect(visibles).toHaveLength(1)
    expect(visibles[0]?.matriculaId).toBe(ids.matriculaAId)
  })

  it('anularRecibo anula un recibo vigente y rechaza una segunda anulación', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { registrarRecibo, anularRecibo } = await import('../../src/acciones/financiero/recibo')

    const creado = await registrarRecibo({
      beneficiario: 'Recibo a anular',
      conceptoId: ids.conceptoId,
      valor: 20000,
      formaPago: 'efectivo',
      fecha: '2025-03-04',
    })
    expect(creado?.serverError, creado?.serverError).toBeUndefined()

    const anulado = await anularRecibo({ reciboId: creado!.data!.id, motivo: 'Error de digitación' })
    expect(anulado?.serverError, anulado?.serverError).toBeUndefined()
    expect(anulado?.data?.anulado).toBe(true)

    const segundaAnulacion = await anularRecibo({ reciboId: creado!.data!.id, motivo: 'Otra vez' })
    expect(segundaAnulacion?.serverError).toBeDefined()
  })

  it('el superadmin registra un egreso con consecutivo autoincremental propio', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { registrarEgreso } = await import('../../src/acciones/financiero/egreso')

    const primero = await registrarEgreso({
      categoriaId: ids.categoriaId,
      beneficiario: 'Empresa de energía',
      valor: 300000,
      fecha: '2025-03-05',
    })
    expect(primero?.serverError, primero?.serverError).toBeUndefined()
    expect(primero?.data?.consecutivo).toBe(1)
  })

  it('un docente no puede registrar un egreso (rechazado por el gate de rol / RLS)', async () => {
    actorActual = { id: ids.docenteId, rol: 'docente' }
    const { registrarEgreso } = await import('../../src/acciones/financiero/egreso')

    const resultado = await registrarEgreso({
      categoriaId: ids.categoriaId,
      beneficiario: 'Intento no autorizado',
      valor: 10000,
      fecha: '2025-03-06',
    })

    expect(resultado?.serverError).toBeDefined()
  })

  it('un estudiante no tiene ningún acceso a egreso (ninguna política lo permite)', async () => {
    const visibles = await conContextoRLSReal(
      _dbApp!,
      { usuarioId: ids.estudianteBId, rol: 'estudiante' },
      async (tx) => tx.select().from(e.egreso)
    )

    expect(visibles).toHaveLength(0)
  })

  it('anularEgreso anula un egreso vigente y rechaza una segunda anulación', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { registrarEgreso, anularEgreso } = await import('../../src/acciones/financiero/egreso')

    const creado = await registrarEgreso({
      categoriaId: ids.categoriaId,
      beneficiario: 'Egreso a anular',
      valor: 15000,
      fecha: '2025-03-07',
    })
    expect(creado?.serverError, creado?.serverError).toBeUndefined()

    const anulado = await anularEgreso({ egresoId: creado!.data!.id, motivo: 'Duplicado' })
    expect(anulado?.serverError, anulado?.serverError).toBeUndefined()
    expect(anulado?.data?.anulado).toBe(true)

    const segundaAnulacion = await anularEgreso({ egresoId: creado!.data!.id, motivo: 'Otra vez' })
    expect(segundaAnulacion?.serverError).toBeDefined()
  })

  it('crearPlanCobro registra un plan de cobro para una matrícula', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { crearPlanCobro } = await import('../../src/acciones/financiero/plan-cobro')

    const resultado = await crearPlanCobro({
      matriculaId: ids.matriculaAId,
      conceptoId: ids.conceptoId,
      mes: 3,
      valorProgramado: 150000,
    })

    expect(resultado?.serverError, resultado?.serverError).toBeUndefined()
    expect(resultado?.data?.matriculaId).toBe(ids.matriculaAId)
  })
})
