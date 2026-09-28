import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql, type TransactionSql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { prepararRolConsultaRls } from './rol-consulta-rls'

const MIGRATIONS_DIR = join(__dirname, '../../src/datos/migraciones')

interface Contenedor {
  contenedor: StartedPostgreSqlContainer
  root: Sql
  migraciones: Sql
  app: Sql
}

async function levantar(): Promise<Contenedor> {
  const contenedor = await new PostgreSqlContainer('postgres:18-alpine').withExposedPorts(5432).start()
  const urlRoot = contenedor.getConnectionUri()
  const root = postgres(urlRoot, { onnotice: () => {} })
  await root`CREATE ROLE agora_migraciones WITH LOGIN PASSWORD 'test' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
  await root`CREATE ROLE agora_app WITH LOGIN PASSWORD 'test' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
  await root`GRANT CONNECT ON DATABASE test TO agora_migraciones`
  await root`GRANT CONNECT ON DATABASE test TO agora_app`
  await root`GRANT CREATE ON DATABASE test TO agora_migraciones`
  await root`GRANT USAGE, CREATE ON SCHEMA public TO agora_migraciones`
  await root`GRANT USAGE ON SCHEMA public TO agora_app`
  await prepararRolConsultaRls(root)
  await root`
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agora_app;
  `
  await root`
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO agora_app;
  `
  const migraciones = postgres(urlRoot.replace(/postgres:\/\/[^@]+@/, 'postgres://agora_migraciones:test@'), {
    max: 1,
    onnotice: () => {},
  })
  const app = postgres(urlRoot.replace(/postgres:\/\/[^@]+@/, 'postgres://agora_app:test@'))
  return { contenedor, root, migraciones, app }
}

async function cerrar(c: Contenedor) {
  await c.app.end()
  await c.migraciones.end()
  await c.root.end()
  await c.contenedor.stop()
}

let base: Contenedor
const ids: Record<string, { usuario: string; persona: string }> = {}
let documento = 50_000_000

async function sembrarCuenta(nombre: string, rol: string) {
  documento++
  const [p] = await base.root`
    INSERT INTO persona (tipo_documento, numero_documento, primer_nombre, primer_apellido)
    VALUES ('CC', ${String(documento)}, ${nombre}, 'Prueba') RETURNING id`
  const [u] = await base.root`
    INSERT INTO usuario (persona_id, correo, rol) VALUES (${p!.id}, ${`${nombre}@rls-admin.test`}, ${rol}) RETURNING id`
  ids[nombre] = { usuario: u!.id as string, persona: p!.id as string }
}

async function como<T>(rol: string, usuarioId: string, fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
  return base.app.begin(async (tx) => {
    await tx`SELECT set_config('app.role', ${rol}, true)`
    await tx`SELECT set_config('app.user_id', ${usuarioId}, true)`
    return fn(tx)
  }) as Promise<T>
}

beforeAll(async () => {
  base = await levantar()
  await migrate(drizzle(base.migraciones), { migrationsFolder: MIGRATIONS_DIR })
  await sembrarCuenta('super', 'superadmin')
  await sembrarCuenta('admin', 'admin')
  await sembrarCuenta('otroadmin', 'admin')
  await sembrarCuenta('docente', 'docente')
  await sembrarCuenta('contador', 'contador')
}, 120_000)

afterAll(async () => {
  await cerrar(base)
})

describe('RLS con app.role = admin', () => {
  it('no lee cuentas de Administrador ni de Superadministrador, sí las de los cinco perfiles', async () => {
    const filas = await como('admin', ids['admin']!.usuario, (tx) => tx`SELECT rol FROM usuario WHERE id <> ${ids['admin']!.usuario}`)
    const roles = filas.map((f) => f.rol as string).sort()
    expect(roles).toEqual(['contador', 'docente'])
  })

  it('lee su propia cuenta y su propia persona', async () => {
    const propia = await como('admin', ids['admin']!.usuario, (tx) => tx`SELECT id FROM usuario WHERE id = ${ids['admin']!.usuario}`)
    expect(propia).toHaveLength(1)
    const persona = await como('admin', ids['admin']!.usuario, (tx) => tx`SELECT id FROM persona WHERE id = ${ids['admin']!.persona}`)
    expect(persona).toHaveLength(1)
  })

  it('no lee la persona de otro Administrador ni la del Superadministrador', async () => {
    const filas = await como(
      'admin',
      ids['admin']!.usuario,
      (tx) => tx`SELECT id FROM persona WHERE id IN (${ids['super']!.persona}, ${ids['otroadmin']!.persona})`
    )
    expect(filas).toHaveLength(0)
  })

  it('no inserta un usuario con rol admin ni superadmin', async () => {
    for (const rol of ['admin', 'superadmin']) {
      documento++
      await expect(
        como('admin', ids['admin']!.usuario, async (tx) => {
          const [p] = await tx`
            INSERT INTO persona (tipo_documento, numero_documento, primer_nombre, primer_apellido)
            VALUES ('CC', ${String(documento)}, 'Ascenso', 'Prueba') RETURNING id`
          await tx`INSERT INTO usuario (persona_id, correo, rol) VALUES (${p!.id}, ${`ascenso.${rol}@rls-admin.test`}, ${rol})`
        })
      ).rejects.toThrow(/row-level security/)
    }
  })

  it('no actualiza el rol de nadie a admin ni a superadmin', async () => {
    for (const rol of ['admin', 'superadmin']) {
      await expect(
        como('admin', ids['admin']!.usuario, (tx) => tx`UPDATE usuario SET rol = ${rol} WHERE id = ${ids['docente']!.usuario}`)
      ).rejects.toThrow(/row-level security/)
    }
    const [fila] = await base.root`SELECT rol FROM usuario WHERE id = ${ids['docente']!.usuario}`
    expect(fila!.rol).toBe('docente')
  })

  it('no modifica ni desactiva una cuenta de Administrador o Superadministrador', async () => {
    for (const nombre of ['otroadmin', 'super']) {
      const cambio = await como(
        'admin',
        ids['admin']!.usuario,
        (tx) => tx`UPDATE usuario SET activo = false, correo = 'cambiado@rls-admin.test' WHERE id = ${ids[nombre]!.usuario}`
      )
      expect(cambio.count).toBe(0)
      const persona = await como(
        'admin',
        ids['admin']!.usuario,
        (tx) => tx`UPDATE persona SET primer_nombre = 'Cambiado' WHERE id = ${ids[nombre]!.persona}`
      )
      expect(persona.count).toBe(0)
    }
    const filas = await base.root`SELECT activo FROM usuario WHERE id IN (${ids['otroadmin']!.usuario}, ${ids['super']!.usuario})`
    expect(filas.every((f) => f.activo === true)).toBe(true)
  })

  it('no borra cuentas', async () => {
    const borrado = await como('admin', ids['admin']!.usuario, (tx) => tx`DELETE FROM usuario WHERE id = ${ids['contador']!.usuario}`)
    expect(borrado.count).toBe(0)
  })

  it('crea y edita un Contador y un Profesor', async () => {
    for (const rol of ['contador', 'docente']) {
      documento++
      const usuarioId = await como('admin', ids['admin']!.usuario, async (tx) => {
        const [p] = await tx`
          INSERT INTO persona (tipo_documento, numero_documento, primer_nombre, primer_apellido)
          VALUES ('CC', ${String(documento)}, 'Nuevo', ${rol}) RETURNING id`
        const [u] = await tx`
          INSERT INTO usuario (persona_id, correo, rol) VALUES (${p!.id}, ${`nuevo.${rol}@rls-admin.test`}, ${rol}) RETURNING id, persona_id`
        return u!
      })
      const edicion = await como('admin', ids['admin']!.usuario, async (tx) => {
        const u = await tx`UPDATE usuario SET activo = false WHERE id = ${usuarioId.id}`
        const p = await tx`UPDATE persona SET primer_nombre = 'Editado' WHERE id = ${usuarioId.persona_id}`
        const cambioDeRol = await tx`UPDATE usuario SET rol = 'secretaria' WHERE id = ${usuarioId.id}`
        return [u.count, p.count, cambioDeRol.count]
      })
      expect(edicion).toEqual([1, 1, 1])
    }
  })
})

describe('RLS con app.role = superadmin, igual que antes', () => {
  it('lee todas las cuentas y personas', async () => {
    const usuarios = await como('superadmin', ids['super']!.usuario, (tx) => tx`SELECT rol FROM usuario`)
    expect(new Set(usuarios.map((u) => u.rol))).toEqual(
      new Set(['superadmin', 'admin', 'docente', 'contador', 'secretaria'])
    )
    const personas = await como('superadmin', ids['super']!.usuario, (tx) => tx`SELECT id FROM persona`)
    expect(personas.length).toBeGreaterThanOrEqual(5)
  })

  it('crea un Administrador, asciende y modifica cualquier cuenta', async () => {
    documento++
    await como('superadmin', ids['super']!.usuario, async (tx) => {
      const [p] = await tx`
        INSERT INTO persona (tipo_documento, numero_documento, primer_nombre, primer_apellido)
        VALUES ('CC', ${String(documento)}, 'Nuevo', 'Admin') RETURNING id`
      await tx`INSERT INTO usuario (persona_id, correo, rol) VALUES (${p!.id}, 'nuevo.admin@rls-admin.test', 'admin')`
      await tx`UPDATE usuario SET rol = 'admin' WHERE id = ${ids['contador']!.usuario}`
      await tx`UPDATE usuario SET activo = false WHERE id = ${ids['otroadmin']!.usuario}`
    })
    const [fila] = await base.root`SELECT rol FROM usuario WHERE id = ${ids['contador']!.usuario}`
    expect(fila!.rol).toBe('admin')
  })
})

describe('restricción de los siete perfiles', () => {
  it('rechaza un rol fuera de la lista', async () => {
    await expect(
      como('superadmin', ids['super']!.usuario, (tx) => tx`UPDATE usuario SET rol = 'rector' WHERE id = ${ids['docente']!.usuario}`)
    ).rejects.toThrow(/usuario_rol_valido/)
  })

  it('la migración falla con un mensaje claro si ya existe un rol fuera de la lista, sin tocar datos', async () => {
    const aislada = await levantar()
    try {
      const carpeta = mkdtempSync(join(tmpdir(), 'migraciones-'))
      cpSync(MIGRATIONS_DIR, carpeta, { recursive: true })
      const diario = JSON.parse(readFileSync(join(carpeta, 'meta/_journal.json'), 'utf8'))
      const completo = structuredClone(diario)
      diario.entries = diario.entries.filter((e: { tag: string }) => e.tag < '0012')
      writeFileSync(join(carpeta, 'meta/_journal.json'), JSON.stringify(diario))
      await migrate(drizzle(aislada.migraciones), { migrationsFolder: carpeta })

      const [p] = await aislada.root`
        INSERT INTO persona (tipo_documento, numero_documento, primer_nombre, primer_apellido)
        VALUES ('CC', '12345678', 'Viejo', 'Rol') RETURNING id`
      await aislada.root`INSERT INTO usuario (persona_id, correo, rol) VALUES (${p!.id}, 'viejo@rls-admin.test', 'rector')`

      writeFileSync(join(carpeta, 'meta/_journal.json'), JSON.stringify(completo))
      const fallo = await migrate(drizzle(aislada.migraciones), { migrationsFolder: carpeta }).then(
        () => null,
        (error: unknown) => error as { cause?: { message?: string } }
      )
      expect(fallo?.cause?.message).toMatch(/usuario\.rol tiene valores fuera de los siete perfiles: rector/)
      const [fila] = await aislada.root`SELECT rol FROM usuario WHERE correo = 'viejo@rls-admin.test'`
      expect(fila!.rol).toBe('rector')
    } finally {
      await cerrar(aislada)
    }
  }, 120_000)

  it('la migración de catálogos únicos se detiene si hay conceptos repetidos, sin tocar datos', async () => {
    const aislada = await levantar()
    try {
      const carpeta = mkdtempSync(join(tmpdir(), 'migraciones-'))
      cpSync(MIGRATIONS_DIR, carpeta, { recursive: true })
      const diario = JSON.parse(readFileSync(join(carpeta, 'meta/_journal.json'), 'utf8'))
      const completo = structuredClone(diario)
      diario.entries = diario.entries.filter((e: { tag: string }) => e.tag < '0013')
      writeFileSync(join(carpeta, 'meta/_journal.json'), JSON.stringify(diario))
      await migrate(drizzle(aislada.migraciones), { migrationsFolder: carpeta })

      await aislada.root`INSERT INTO concepto_ingreso (nombre) VALUES ('Matrícula'), ('Matrícula')`
      writeFileSync(join(carpeta, 'meta/_journal.json'), JSON.stringify(completo))
      const fallo = await migrate(drizzle(aislada.migraciones), { migrationsFolder: carpeta }).then(
        () => null,
        (error: unknown) => error as { cause?: { message?: string } }
      )
      expect(fallo?.cause?.message).toMatch(/Hay conceptos o categorías repetidos \(Matrícula\)/)
      const filas = await aislada.root`SELECT count(*)::int AS n FROM concepto_ingreso WHERE nombre = 'Matrícula'`
      expect(filas[0]!.n).toBe(2)

      const unaConexion = postgres(aislada.contenedor.getConnectionUri(), { max: 1, onnotice: () => {} })
      await unaConexion.unsafe(
        readFileSync(join(__dirname, '../../infra/postgres/deduplicar-catalogos-financieros.sql'), 'utf8')
      )
      await unaConexion.end()
      await migrate(drizzle(aislada.migraciones), { migrationsFolder: carpeta })
      await expect(aislada.root`INSERT INTO concepto_ingreso (nombre) VALUES ('Matrícula')`).rejects.toThrow(
        /concepto_ingreso_nombre_vigente/
      )
    } finally {
      await cerrar(aislada)
    }
  }, 120_000)
})
