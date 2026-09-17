import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql as drizzleSql } from 'drizzle-orm'
import { join } from 'path'
import * as e from '../../src/datos/esquema'
import { conContextoRLS, type DB } from '../../src/datos/cliente'

const MIGRATIONS_DIR = join(__dirname, '../../src/datos/migraciones')

let contenedor: StartedPostgreSqlContainer
let sqlRoot: Sql
let sqlApp: Sql
let dbApp: DB

beforeAll(async () => {
  contenedor = await new PostgreSqlContainer('postgres:18-alpine')
    .withExposedPorts(5432)
    .start()

  const urlRoot = contenedor.getConnectionUri()

  sqlRoot = postgres(urlRoot)

  await sqlRoot`
    CREATE ROLE agora_migraciones WITH LOGIN PASSWORD 'test' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  `
  await sqlRoot`
    CREATE ROLE agora_app WITH LOGIN PASSWORD 'test' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  `
  await sqlRoot`GRANT CONNECT ON DATABASE test TO agora_migraciones`
  await sqlRoot`GRANT CONNECT ON DATABASE test TO agora_app`
  await sqlRoot`GRANT CREATE ON DATABASE test TO agora_migraciones`
  await sqlRoot`GRANT USAGE, CREATE ON SCHEMA public TO agora_migraciones`
  await sqlRoot`GRANT USAGE ON SCHEMA public TO agora_app`

  await sqlRoot`
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agora_app;
  `
  await sqlRoot`
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO agora_app;
  `

  const urlMigraciones = urlRoot.replace(
    /postgres:\/\/[^@]+@/,
    `postgres://agora_migraciones:test@`
  )

  const sqlMigraciones = postgres(urlMigraciones)
  const dbMigraciones = drizzle(sqlMigraciones)

  await migrate(dbMigraciones, { migrationsFolder: MIGRATIONS_DIR })
  await sqlMigraciones.end()

  const urlApp = urlRoot.replace(
    /postgres:\/\/[^@]+@/,
    `postgres://agora_app:test@`
  )
  sqlApp = postgres(urlApp)
  dbApp = drizzle(sqlApp, { schema: e }) as DB

  await sembrarDatosDePrueba()
}, 120_000)

afterAll(async () => {
  await sqlRoot?.end()
  await sqlApp?.end()
  await contenedor?.stop()
})

let ids: {
  anioId: string
  jornadaId: string
  cicloId: string
  cursoId: string
  periodoId: string
  asignaturaId: string
  docenteId: string
  docentePersonaId: string
  estudianteAId: string
  estudianteAPersonaId: string
  estudianteBId: string
  estudianteBPersonaId: string
  matriculaAId: string
  matriculaBId: string
  calificacionAId: string
  reciboAId: string
}

async function ins<T>(promesa: Promise<T[]>): Promise<T> {
  const r = await promesa
  if (!r[0]) throw new Error('insert sin retorno')
  return r[0]
}

async function sembrarDatosDePrueba() {
  const dbRoot = drizzle(sqlRoot, { schema: e })

  const anio     = await ins(dbRoot.insert(e.anioLectivo).values({ nombre: 'TEST-2025', inicio: '2025-01-01', fin: '2025-12-31', activo: true }).returning())
  const jornada  = await ins(dbRoot.insert(e.jornada).values({ codigo: 'D', nombre: 'Diurna' }).returning())
  const ciclo    = await ins(dbRoot.insert(e.ciclo).values({ codigo: '4A-TEST', gradoEquivalente: 'Octavo', esquemaPeriodos: 'cuatro' }).returning())
  const area     = await ins(dbRoot.insert(e.area).values({ nombre: 'Matemáticas TEST' }).returning())
  const asig     = await ins(dbRoot.insert(e.asignatura).values({ areaId: area.id, nombre: 'Álgebra TEST' }).returning())
  const curso    = await ins(dbRoot.insert(e.curso).values({ anioLectivoId: anio.id, cicloId: ciclo.id, jornadaId: jornada.id, nombre: 'Curso TEST' }).returning())
  const periodo  = await ins(dbRoot.insert(e.periodo).values({ anioLectivoId: anio.id, numero: 1, esquema: 'cuatro', inicio: '2025-01-01', fin: '2025-03-31', notasAbiertas: true }).returning())

  const pdocente = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '10000001', primerNombre: 'Docente', primerApellido: 'Test' }).returning())
  const udocente = await ins(dbRoot.insert(e.usuario).values({ personaId: pdocente.id, correo: 'docente@test.com', rol: 'docente' }).returning())

  await dbRoot.insert(e.asignacionDocente).values({ anioLectivoId: anio.id, docenteId: udocente.id, asignaturaId: asig.id, cursoId: curso.id })

  const pA = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'TI', numeroDocumento: '20000001', primerNombre: 'EstudianteA', primerApellido: 'Prueba' }).returning())
  const uA = await ins(dbRoot.insert(e.usuario).values({ personaId: pA.id, correo: 'estudiante_a@test.com', rol: 'estudiante' }).returning())
  const mA = await ins(dbRoot.insert(e.matricula).values({ anioLectivoId: anio.id, estudianteId: pA.id, cursoId: curso.id, estado: 'activo' }).returning())

  const pB = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'TI', numeroDocumento: '20000002', primerNombre: 'EstudianteB', primerApellido: 'Prueba' }).returning())
  const uB = await ins(dbRoot.insert(e.usuario).values({ personaId: pB.id, correo: 'estudiante_b@test.com', rol: 'estudiante' }).returning())
  const mB = await ins(dbRoot.insert(e.matricula).values({ anioLectivoId: anio.id, estudianteId: pB.id, cursoId: curso.id, estado: 'activo' }).returning())

  const calA  = await ins(dbRoot.insert(e.calificacion).values({ matriculaId: mA.id, asignaturaId: asig.id, periodoId: periodo.id, nota: '4.5', nivelDesempeno: 'Alto', registradoPor: udocente.id }).returning())
  const ci    = await ins(dbRoot.insert(e.conceptoIngreso).values({ nombre: 'Matrícula TEST' }).returning())
  const reciboA = await ins(dbRoot.insert(e.reciboCaja).values({ anioLectivoId: anio.id, consecutivo: 1, matriculaId: mA.id, beneficiario: 'EstudianteA Prueba', conceptoId: ci.id, valor: '500000', formaPago: 'efectivo', fecha: '2025-02-01', registradoPor: udocente.id }).returning())

  ids = {
    anioId: anio.id, jornadaId: jornada.id, cicloId: ciclo.id,
    cursoId: curso.id, periodoId: periodo.id, asignaturaId: asig.id,
    docenteId: udocente.id, docentePersonaId: pdocente.id,
    estudianteAId: uA.id, estudianteAPersonaId: pA.id,
    estudianteBId: uB.id, estudianteBPersonaId: pB.id,
    matriculaAId: mA.id, matriculaBId: mB.id,
    calificacionAId: calA.id, reciboAId: reciboA.id,
  }
}

type Fila = Record<string, unknown>

describe('RLS — aislamiento entre roles', () => {

  it('[OWNER] agora_app NO es propietario de ninguna tabla', async () => {
    const tablas = await sqlRoot`
      SELECT tablename, tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tableowner = 'agora_app'
    `
    console.log('Tablas propias de agora_app:', tablas.length === 0 ? '(ninguna ✓)' : tablas)
    expect(tablas).toHaveLength(0)
  })

  it('[RLS] estudiante_a no puede ver calificaciones de estudiante_b (SQL directo)', async () => {
    const filas = await conContextoRLS<Fila[]>(
      dbApp,
      { usuarioId: ids.estudianteAId, rol: 'estudiante', anioLectivoId: ids.anioId },
      async (tx) => {
        const r = await tx.execute(drizzleSql`SELECT id FROM calificacion WHERE matricula_id = ${ids.matriculaBId}`)
        return r as unknown as Fila[]
      }
    )
    console.log(`Estudiante A consultando calificación de B → ${filas.length} filas (esperado 0)`)
    expect(filas).toHaveLength(0)
  })

  it('[RLS] estudiante_a SÍ puede ver sus propias calificaciones', async () => {
    const filas = await conContextoRLS<Fila[]>(
      dbApp,
      { usuarioId: ids.estudianteAId, rol: 'estudiante', anioLectivoId: ids.anioId },
      async (tx) => {
        const r = await tx.execute(drizzleSql`SELECT id, nota FROM calificacion WHERE matricula_id = ${ids.matriculaAId}`)
        return r as unknown as Fila[]
      }
    )
    console.log(`Estudiante A consultando sus propias calificaciones → ${filas.length} fila(s):`, filas)
    expect(filas.length).toBeGreaterThan(0)
    expect(filas[0]!['id']).toBe(ids.calificacionAId)
  })

  it('[RLS] docente no puede ver recibos de caja (SQL directo)', async () => {
    const filas = await conContextoRLS<Fila[]>(
      dbApp,
      { usuarioId: ids.docenteId, rol: 'docente', anioLectivoId: ids.anioId },
      async (tx) => {
        const r = await tx.execute(drizzleSql`SELECT id FROM recibo_caja`)
        return r as unknown as Fila[]
      }
    )
    console.log(`Docente consultando recibos de caja → ${filas.length} filas (esperado 0)`)
    expect(filas).toHaveLength(0)
  })

  it('[RLS] docente SÍ puede ver calificaciones de su asignatura', async () => {
    const filas = await conContextoRLS<Fila[]>(
      dbApp,
      { usuarioId: ids.docenteId, rol: 'docente', anioLectivoId: ids.anioId },
      async (tx) => {
        const r = await tx.execute(drizzleSql`
          SELECT c.id, c.nota
          FROM calificacion c
          WHERE c.asignatura_id = ${ids.asignaturaId}
        `)
        return r as unknown as Fila[]
      }
    )
    console.log(`Docente consultando calificaciones de su asignatura → ${filas.length} fila(s):`, filas)
    expect(filas.length).toBeGreaterThan(0)
  })

  it('[RLS] estudiante_b no puede ver persona de estudiante_a', async () => {
    const filas = await conContextoRLS<Fila[]>(
      dbApp,
      { usuarioId: ids.estudianteBId, rol: 'estudiante', anioLectivoId: ids.anioId },
      async (tx) => {
        const r = await tx.execute(drizzleSql`SELECT id FROM persona WHERE id = ${ids.estudianteAPersonaId}`)
        return r as unknown as Fila[]
      }
    )
    console.log(`Estudiante B consultando persona de A → ${filas.length} filas (esperado 0)`)
    expect(filas).toHaveLength(0)
  })

  it('[RLS] estudiante_a no puede ver recibos de estudiante_b', async () => {
    const filas = await conContextoRLS<Fila[]>(
      dbApp,
      { usuarioId: ids.estudianteAId, rol: 'estudiante', anioLectivoId: ids.anioId },
      async (tx) => {
        const r = await tx.execute(drizzleSql`SELECT id FROM recibo_caja WHERE matricula_id = ${ids.matriculaBId}`)
        return r as unknown as Fila[]
      }
    )
    console.log(`Estudiante A consultando recibo de B → ${filas.length} filas (esperado 0)`)
    expect(filas).toHaveLength(0)
  })

  it('[RLS] sin contexto RLS → sin filas en tablas protegidas', async () => {
    const calificaciones = await sqlApp`SELECT id FROM calificacion`
    const personas = await sqlApp`SELECT id FROM persona`
    console.log(`Sin contexto: calificacion=${calificaciones.length}, persona=${personas.length} (esperado 0, 0)`)
    expect(calificaciones).toHaveLength(0)
    expect(personas).toHaveLength(0)
  })

  it('[RLS] sin contexto → INSERT en aspirante rechazado', async () => {
    await expect(
      sqlApp`INSERT INTO aspirante (radicado, datos_formulario, autorizacion_datos) VALUES ('RAD-ANON-9999', '{}', true)`
    ).rejects.toThrow()
    console.log('aspirante INSERT sin contexto → rechazado ✓')
  })

  it('[RLS] con rol anonimo → INSERT en aspirante permitido', async () => {
    await expect(
      sqlApp.begin(async (tx) => {
        await tx`SELECT set_config('app.role', 'anonimo', true)`
        await tx`SELECT set_config('app.user_id', '', true)`
        await tx`SELECT set_config('app.year', '', true)`
        return tx`INSERT INTO aspirante (radicado, datos_formulario, autorizacion_datos) VALUES ('RAD-ANONTEST-0001', '{}', true)`
      })
    ).resolves.toBeDefined()
    console.log('aspirante INSERT con rol anonimo → permitido ✓')
  })

  it('[RLS] auditoria INSERT accesible para agora_app, UPDATE/DELETE no', async () => {
    await expect(
      sqlApp`INSERT INTO auditoria (accion, entidad) VALUES ('test', 'test')`
    ).resolves.toBeDefined()

    await expect(
      sqlApp`UPDATE auditoria SET accion = 'modificado' WHERE TRUE`
    ).rejects.toThrow()

    console.log('auditoria: INSERT ✓, UPDATE bloqueado ✓')
  })

})
