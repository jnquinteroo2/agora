import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'path'
import { eq } from 'drizzle-orm'
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
    user: { id: actorActual.id, email: `${actorActual.rol}@cms-test.com`, name: 'Test' },
  })),
  obtenerUsuarioActual: vi.fn(async () => ({
    id: actorActual.id,
    personaId: actorActual.id,
    correo: `${actorActual.rol}@cms-test.com`,
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

let ids: { superadminId: string; docenteId: string; archivoFotoId: string }

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

  const pSuper = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '90000001', primerNombre: 'Super', primerApellido: 'CMS' }).returning())
  const uSuper = await ins(dbRoot.insert(e.usuario).values({ personaId: pSuper.id, correo: 'super@cms-test.com', rol: 'superadmin' }).returning())

  const pDocente = await ins(dbRoot.insert(e.persona).values({ tipoDocumento: 'CC', numeroDocumento: '90000002', primerNombre: 'Docente', primerApellido: 'CMS' }).returning())
  const uDocente = await ins(dbRoot.insert(e.usuario).values({ personaId: pDocente.id, correo: 'docente@cms-test.com', rol: 'docente' }).returning())

  const archivoFoto = await ins(
    dbRoot
      .insert(e.archivo)
      .values({
        nombreOrig: 'foto.jpg',
        nombreStor: 'foto-test.jpg',
        bucket: 'galeria',
        mime: 'image/jpeg',
        bytes: 100,
        hashSha256: 'x'.repeat(64),
        subidoPor: uSuper.id,
      })
      .returning()
  )

  ids = { superadminId: uSuper.id, docenteId: uDocente.id, archivoFotoId: archivoFoto.id }
}

describe('CMS — Server Actions reales → conContextoRLS → BD', () => {
  it('el superadmin crea una entrada en borrador, invisible para el público', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { crearEntradaCMS } = await import('../../src/acciones/cms/entrada')

    const creada = await crearEntradaCMS({ tipo: 'noticia', slug: 'noticia-cms-test', titulo: 'Noticia de prueba' })
    expect(creada?.serverError, creada?.serverError).toBeUndefined()
    expect(creada?.data?.estado).toBe('borrador')

    const visiblesAnonimo = await conContextoRLSReal(_dbApp!, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
      tx.select().from(e.cmsEntrada)
    )
    expect(visiblesAnonimo).toHaveLength(0)
  })

  it('un docente no puede crear una entrada CMS (rechazado por el gate de rol de la Server Action)', async () => {
    actorActual = { id: ids.docenteId, rol: 'docente' }
    const { crearEntradaCMS } = await import('../../src/acciones/cms/entrada')

    const resultado = await crearEntradaCMS({ tipo: 'noticia', slug: 'intento-docente', titulo: 'Intento no autorizado' })
    expect(resultado?.serverError).toBeDefined()
  })

  it('publicarEntradaCMS hace visible la entrada para el público', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { crearEntradaCMS, publicarEntradaCMS } = await import('../../src/acciones/cms/entrada')

    const creada = await crearEntradaCMS({ tipo: 'album', slug: 'album-cms-test', titulo: 'Álbum de prueba' })
    expect(creada?.serverError, creada?.serverError).toBeUndefined()

    const publicada = await publicarEntradaCMS({ id: creada!.data!.id, publicado: true })
    expect(publicada?.serverError, publicada?.serverError).toBeUndefined()
    expect(publicada?.data?.estado).toBe('publicado')

    const visiblesAnonimo = await conContextoRLSReal(_dbApp!, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
      tx.select().from(e.cmsEntrada)
    )
    const slugs = visiblesAnonimo.map((v) => v.slug)
    expect(slugs).toContain('album-cms-test')
    expect(slugs).not.toContain('noticia-cms-test')
  })

  it('agregarFotoAlbum enlaza una foto y el público puede ver el archivo vía archivo_cms_publica', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { crearEntradaCMS, publicarEntradaCMS } = await import('../../src/acciones/cms/entrada')
    const { agregarFotoAlbum, eliminarFotoAlbum } = await import('../../src/acciones/cms/album-foto')

    const album = await crearEntradaCMS({ tipo: 'album', slug: 'album-con-fotos', titulo: 'Álbum con fotos' })
    await publicarEntradaCMS({ id: album!.data!.id, publicado: true })

    const foto = await agregarFotoAlbum({ albumId: album!.data!.id, archivoId: ids.archivoFotoId, alt: 'Foto de prueba' })
    expect(foto?.serverError, foto?.serverError).toBeUndefined()

    const archivoVisible = await conContextoRLSReal(_dbApp!, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
      tx.select().from(e.archivo).where(eq(e.archivo.id, ids.archivoFotoId))
    )
    expect(archivoVisible).toHaveLength(1)

    const eliminada = await eliminarFotoAlbum({ id: foto!.data!.id })
    expect(eliminada?.serverError, eliminada?.serverError).toBeUndefined()

    const archivoTrasEliminar = await conContextoRLSReal(_dbApp!, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
      tx.select().from(e.archivo).where(eq(e.archivo.id, ids.archivoFotoId))
    )
    expect(archivoTrasEliminar).toHaveLength(0)
  })

  it('eliminarEntradaCMS (baja lógica) la retira de lo que ve el público', async () => {
    actorActual = { id: ids.superadminId, rol: 'superadmin' }
    const { crearEntradaCMS, publicarEntradaCMS, eliminarEntradaCMS } = await import('../../src/acciones/cms/entrada')

    const creada = await crearEntradaCMS({ tipo: 'pagina', slug: 'pagina-a-eliminar', titulo: 'Página temporal' })
    await publicarEntradaCMS({ id: creada!.data!.id, publicado: true })

    const eliminada = await eliminarEntradaCMS({ id: creada!.data!.id })
    expect(eliminada?.serverError, eliminada?.serverError).toBeUndefined()

    const visiblesAnonimo = await conContextoRLSReal(_dbApp!, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
      tx.select().from(e.cmsEntrada)
    )
    expect(visiblesAnonimo.map((v) => v.slug)).not.toContain('pagina-a-eliminar')
  })
})
