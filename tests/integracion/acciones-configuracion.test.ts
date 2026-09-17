import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'path'
import * as e from '../../src/datos/esquema'
import type { DB } from '../../src/datos/cliente'

const MIGRATIONS_DIR = join(__dirname, '../../src/datos/migraciones')
const ACTOR_ID = '01900000-0000-7000-0000-000000000001'

let _dbApp: DB | undefined = undefined

vi.mock('../../src/datos/cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/datos/cliente')>()
  return {
    ...original,
    db: {} as DB,
    conContextoRLS: async <T>(base: DB, ctx: Parameters<typeof original.conContextoRLS>[1], fn: Parameters<typeof original.conContextoRLS>[2]) =>
      original.conContextoRLS(_dbApp!, ctx, fn as (tx: Parameters<typeof original.conContextoRLS>[2] extends (tx: infer TX) => unknown ? TX : never) => Promise<T>),
  }
})

vi.mock('../../src/auth/sesion', () => ({
  obtenerSesion: vi.fn(async () => ({
    user: { id: ACTOR_ID, email: 'admin@test.com', name: 'Admin Test' },
  })),
  obtenerUsuarioActual: vi.fn(async () => ({
    id: ACTOR_ID,
    personaId: ACTOR_ID,
    correo: 'admin@test.com',
    rol: 'superadmin',
    activo: true,
    primerIngreso: false,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  })),
}))

let _sqlRoot: Sql
let _sqlApp: Sql
let _contenedor: StartedPostgreSqlContainer

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
}, 120_000)

afterAll(async () => {
  await _sqlApp?.end()
  await _sqlRoot?.end()
  await _contenedor?.stop()
})

describe('crearAnioLectivo — flujo completo Server Action → conContextoRLS → BD', () => {

  it('crea un año lectivo, confirma fila en BD y registra auditoría', async () => {
    const { crearAnioLectivo } = await import('../../src/acciones/configuracion/anio-lectivo')

    const resultado = await crearAnioLectivo({
      nombre: 'TEST-2026',
      inicio: '2026-01-15',
      fin: '2026-11-30',
      activo: false,
    })

    expect(resultado?.data, 'la acción debe devolver data').toBeDefined()
    expect(resultado?.data?.nombre).toBe('TEST-2026')
    expect(resultado?.data?.id).toBeTypeOf('string')
    expect(resultado?.serverError).toBeUndefined()

    const [fila] = await _sqlRoot`
      SELECT id, nombre, activo FROM anio_lectivo WHERE nombre = 'TEST-2026'
    `
    expect(fila, 'la fila debe existir en la BD').toBeDefined()
    expect(fila!['activo']).toBe(false)
    console.log(`[ACCIÓN] crearAnioLectivo → BD confirmada: id=${fila!['id']}, nombre=${fila!['nombre']}`)

    const [audRow] = await _sqlRoot`
      SELECT accion, entidad, actor_rol FROM auditoria WHERE entidad = 'anio_lectivo' ORDER BY creado_en DESC LIMIT 1
    `
    expect(audRow!['accion']).toBe('crear')
    expect(audRow!['actor_rol']).toBe('superadmin')
    console.log(`[AUDITORIA] ${audRow!['accion']} / ${audRow!['entidad']} / actor_rol=${audRow!['actor_rol']} ✓`)
  })

  it('rechaza input inválido con validationErrors sin tocar la BD', async () => {
    const { crearAnioLectivo } = await import('../../src/acciones/configuracion/anio-lectivo')

    const resultado = await crearAnioLectivo({
      nombre: 'X',
      inicio: 'no-es-fecha',
      fin: '2026-11-30',
      activo: false,
    })

    expect(resultado?.validationErrors, 'debe haber errores de validación').toBeDefined()
    expect(resultado?.data).toBeUndefined()
    console.log('[ZOD] validationErrors capturados por next-safe-action ✓')

    const [total] = await _sqlRoot`SELECT COUNT(*) AS n FROM anio_lectivo WHERE nombre = 'X'`
    expect(Number(total!['n'])).toBe(0)
  })

  it('activarAnioLectivo desactiva los demás y activa el seleccionado', async () => {
    const { crearAnioLectivo, activarAnioLectivo } = await import('../../src/acciones/configuracion/anio-lectivo')

    const r1 = await crearAnioLectivo({ nombre: 'ACT-2025', inicio: '2025-01-01', fin: '2025-12-31', activo: false })
    const r2 = await crearAnioLectivo({ nombre: 'ACT-2026', inicio: '2026-01-01', fin: '2026-12-31', activo: false })
    const id2025 = r1!.data!.id
    const id2026 = r2!.data!.id

    await activarAnioLectivo({ id: id2025 })
    const actResult = await activarAnioLectivo({ id: id2026 })

    expect(actResult?.data?.activo).toBe(true)
    expect(actResult?.data?.id).toBe(id2026)

    const activos = await _sqlRoot`SELECT id FROM anio_lectivo WHERE activo = true`
    expect(activos).toHaveLength(1)
    expect(activos[0]!['id']).toBe(id2026)
    console.log(`[ACCIÓN] activarAnioLectivo → único activo confirmado: ${id2026} ✓`)
  })

})
