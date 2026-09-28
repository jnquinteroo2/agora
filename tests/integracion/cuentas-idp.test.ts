import { prepararRolConsultaRls } from './rol-consulta-rls'
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'path'
import { and, eq } from 'drizzle-orm'

vi.hoisted(() => {
  process.env['AUTH_KEYCLOAK_HABILITADO'] = 'true'
  process.env['KEYCLOAK_EMISOR'] = 'http://localhost:8082/realms/agora/'
  process.env['KEYCLOAK_URL_INTERNA'] = 'http://keycloak:8080/realms/agora'
  process.env['KEYCLOAK_CLIENTE_ID'] = 'plataforma-agora'
  process.env['KEYCLOAK_CLIENTE_SECRETO'] = 'c'.repeat(40)
  process.env['KEYCLOAK_ADMIN_CLIENTE_SECRETO'] = 'a'.repeat(40)
})

import * as e from '../../src/datos/esquema'
import type * as ModuloCliente from '../../src/datos/cliente'
import type * as ModuloIdp from '../../src/auth/idp/keycloak-admin'
import type { DB } from '../../src/datos/cliente'
import { env } from '../../src/env'
import * as idp from '../../src/auth/idp/keycloak-admin'
import { sincronizarPendientesIdp } from '../../src/auth/idp/cuentas'
import {
  crearUsuario,
  cambiarEstadoUsuario,
  cambiarCorreoUsuario,
  cambiarRolUsuario,
  exigirTotpUsuario,
  reintentarSincronizacion,
} from '../../src/acciones/personas/persona'

const MIGRATIONS_DIR = join(__dirname, '../../src/datos/migraciones')

let _dbApp: DB | undefined = undefined
let superadminId = ''
const actor = { id: '', rol: 'superadmin' }

vi.mock('../../src/datos/cliente', async (importOriginal) => {
  const original = await importOriginal<typeof ModuloCliente>()
  const dbDelegado = new Proxy({} as DB, {
    get: (_objetivo, propiedad) => {
      const valor = (_dbApp as unknown as Record<string | symbol, unknown>)[propiedad]
      return typeof valor === 'function' ? valor.bind(_dbApp) : valor
    },
  })
  return {
    ...original,
    db: dbDelegado,
    conContextoRLS: (
      _base: DB,
      ctx: Parameters<typeof original.conContextoRLS>[1],
      fn: Parameters<typeof original.conContextoRLS>[2]
    ) => original.conContextoRLS(_dbApp!, ctx, fn),
  }
})

vi.mock('../../src/auth/sesion', () => ({
  obtenerSesion: vi.fn(async () => ({
    user: { id: actor.id, email: `${actor.rol}@idp-test.com`, name: 'Actor' },
  })),
  obtenerUsuarioActual: vi.fn(async () => ({
    id: actor.id,
    personaId: actor.id,
    correo: `${actor.rol}@idp-test.com`,
    rol: actor.rol,
    activo: true,
    primerIngreso: false,
    sinCorreo: false,
    idpPendiente: false,
    idpIntentos: 0,
    idpUltimoIntento: null,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  })),
}))

vi.mock('../../src/auth/idp/keycloak-admin', async (importOriginal) => {
  const original = await importOriginal<typeof ModuloIdp>()
  return {
    ...original,
    crearUsuarioIdp: vi.fn(),
    borrarUsuarioIdp: vi.fn(),
    enviarInvitacionIdp: vi.fn(),
    fijarHabilitadoIdp: vi.fn(),
    cerrarSesionesIdp: vi.fn(),
    actualizarCorreoIdp: vi.fn(),
    fijarContrasenaTemporalIdp: vi.fn(),
    agregarAccionRequeridaIdp: vi.fn(),
  }
})

const mocks = vi.mocked(idp)

let _sqlRoot: Sql
let _sqlApp: Sql
let _contenedor: StartedPostgreSqlContainer
let contadorDocumento = 70000000

function subNuevo(): string {
  return crypto.randomUUID()
}

function personaDePrueba(numero?: string) {
  contadorDocumento++
  return {
    tipoDocumento: 'CC' as const,
    numeroDocumento: numero ?? String(contadorDocumento),
    primerNombre: 'Ana',
    primerApellido: 'Prueba',
  }
}

async function auditoriasDe(entidadId: string) {
  const dbRoot = drizzle(_sqlRoot, { schema: e })
  return dbRoot.select().from(e.auditoria).where(eq(e.auditoria.entidadId, entidadId))
}

async function auditoriasPorAccion(accion: string) {
  const dbRoot = drizzle(_sqlRoot, { schema: e })
  return dbRoot.select().from(e.auditoria).where(eq(e.auditoria.accion, accion))
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
  await prepararRolConsultaRls(_sqlRoot)
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
  await migrate(drizzle(sqlMigraciones), { migrationsFolder: MIGRATIONS_DIR })
  await sqlMigraciones.end()

  const urlApp = urlRoot.replace(/postgres:\/\/[^@]+@/, 'postgres://agora_app:test@')
  _sqlApp = postgres(urlApp)
  _dbApp = drizzle(_sqlApp, { schema: e }) as DB

  const dbRoot = drizzle(_sqlRoot, { schema: e })
  const [p] = await dbRoot.insert(e.persona).values(personaDePrueba()).returning()
  const [u] = await dbRoot
    .insert(e.usuario)
    .values({ personaId: p!.id, correo: 'super@idp-test.com', rol: 'superadmin' })
    .returning()
  superadminId = u!.id
  actor.id = superadminId
}, 120_000)

afterAll(async () => {
  await _sqlApp?.end()
  await _sqlRoot?.end()
  await _contenedor?.stop()
})

beforeEach(() => {
  vi.clearAllMocks()
  actor.id = superadminId
  actor.rol = 'superadmin'
  env.AUTH_KEYCLOAK_HABILITADO = true
  mocks.agregarAccionRequeridaIdp.mockResolvedValue(undefined)
  mocks.crearUsuarioIdp.mockImplementation(async () => subNuevo())
  mocks.borrarUsuarioIdp.mockResolvedValue(undefined)
  mocks.enviarInvitacionIdp.mockResolvedValue(undefined)
  mocks.fijarHabilitadoIdp.mockResolvedValue(undefined)
  mocks.cerrarSesionesIdp.mockResolvedValue(undefined)
  mocks.actualizarCorreoIdp.mockResolvedValue(undefined)
})

describe('alta de cuentas con Keycloak', () => {
  it('crea en Keycloak, enlaza por sub en una sola transacción y envía la invitación después', async () => {
    let usuarioExistiaAlInvitar = false
    mocks.enviarInvitacionIdp.mockImplementation(async () => {
      const filas = await _sqlRoot`SELECT 1 FROM usuario WHERE correo = 'docente.kc@idp-test.com'`
      usuarioExistiaAlInvitar = filas.length === 1
    })

    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'Docente.KC@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.serverError).toBeUndefined()
    const datos = r!.data!
    expect(datos.proveedor).toBe('keycloak')
    expect(datos.invitacion).toBe('enviada')
    expect(usuarioExistiaAlInvitar).toBe(true)

    const creado = mocks.crearUsuarioIdp.mock.calls[0]![0]
    expect(creado.usuarioId).toBe(datos.usuarioId)
    expect(creado.nombreUsuario).toBe('docente.kc@idp-test.com')
    expect(creado.accionesRequeridas).toEqual(['UPDATE_PASSWORD'])
    expect(creado.contrasenaTemporal).toBeUndefined()
    const sub = await mocks.crearUsuarioIdp.mock.results[0]!.value

    const dbRoot = drizzle(_sqlRoot, { schema: e })
    const cuentas = await dbRoot.select().from(e.baAccount).where(eq(e.baAccount.userId, datos.usuarioId))
    expect(cuentas).toHaveLength(1)
    expect(cuentas[0]).toMatchObject({
      providerId: 'keycloak',
      accountId: sub,
      issuer: 'http://localhost:8082/realms/agora',
      password: null,
    })
    const [baUser] = await dbRoot.select().from(e.baUser).where(eq(e.baUser.id, datos.usuarioId))
    expect(baUser!.email).toBe('docente.kc@idp-test.com')

    const acciones = (await auditoriasDe(datos.usuarioId)).map((a) => a.accion)
    expect(acciones).toEqual(expect.arrayContaining(['crear_usuario', 'invitacion_idp_enviada']))
    const alta = (await auditoriasDe(datos.usuarioId)).find((a) => a.accion === 'crear_usuario')!
    expect(alta.actorId).toBe(superadminId)
    expect(alta.diferencia).toMatchObject({ rol: 'docente', proveedor: 'keycloak' })
  })

  it('pide TOTP al crear un Superadministrador', async () => {
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'superadmin',
      correo: 'super2@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.serverError).toBeUndefined()
    expect(mocks.crearUsuarioIdp.mock.calls[0]![0].accionesRequeridas).toEqual([
      'UPDATE_PASSWORD',
      'CONFIGURE_TOTP',
    ])
    expect(mocks.enviarInvitacionIdp.mock.calls[0]![1]).toEqual(['UPDATE_PASSWORD', 'CONFIGURE_TOTP'])
  })

  it('con 409 de Keycloak muestra un mensaje claro, no reintenta y no escribe en la base', async () => {
    mocks.crearUsuarioIdp.mockRejectedValue(new idp.ErrorIdpConflicto())
    const persona = personaDePrueba()
    const r = await crearUsuario({
      persona,
      rol: 'docente',
      correo: 'repetido@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.serverError).toMatch(/Keycloak ya tiene una cuenta con ese correo/)
    expect(mocks.crearUsuarioIdp).toHaveBeenCalledTimes(1)
    expect(mocks.borrarUsuarioIdp).not.toHaveBeenCalled()
    const filas = await _sqlRoot`SELECT 1 FROM persona WHERE numero_documento = ${persona.numeroDocumento}`
    expect(filas).toHaveLength(0)
  })

  it('si la base falla después de crear en Keycloak, borra el usuario de Keycloak', async () => {
    const repetida = personaDePrueba()
    const primera = await crearUsuario({
      persona: repetida,
      rol: 'docente',
      correo: 'primera@idp-test.com',
      sinCorreo: false,
    })
    expect(primera?.serverError).toBeUndefined()
    vi.clearAllMocks()
    mocks.crearUsuarioIdp.mockImplementation(async () => subNuevo())

    const r = await crearUsuario({
      persona: { ...repetida },
      rol: 'docente',
      correo: 'segunda@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.serverError).toMatch(/Ya existe una persona registrada/)
    const sub = await mocks.crearUsuarioIdp.mock.results[0]!.value
    expect(mocks.borrarUsuarioIdp).toHaveBeenCalledWith(sub)
    expect(mocks.enviarInvitacionIdp).not.toHaveBeenCalled()
    const filas = await _sqlRoot`SELECT 1 FROM usuario WHERE correo = 'segunda@idp-test.com'`
    expect(filas).toHaveLength(0)
    const revertidas = await auditoriasPorAccion('alta_revertida_idp')
    expect(revertidas.some((a) => (a.diferencia as { sub?: string }).sub === sub)).toBe(true)
  })

  it('si también falla el borrado, deja la cuenta huérfana en auditoría', async () => {
    const repetida = personaDePrueba()
    await crearUsuario({ persona: repetida, rol: 'docente', correo: 'h1@idp-test.com', sinCorreo: false })
    vi.clearAllMocks()
    mocks.crearUsuarioIdp.mockImplementation(async () => subNuevo())
    mocks.borrarUsuarioIdp.mockRejectedValue(new idp.ErrorIdp('Keycloak caído', null))

    const r = await crearUsuario({
      persona: { ...repetida },
      rol: 'docente',
      correo: 'h2@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.serverError).toBeDefined()
    const sub = await mocks.crearUsuarioIdp.mock.results[0]!.value
    const huerfanas = await auditoriasPorAccion('cuenta_huerfana_idp')
    const registro = huerfanas.find((a) => (a.diferencia as { sub?: string }).sub === sub)
    expect(registro?.diferencia).toMatchObject({ nombreUsuario: 'h2@idp-test.com', errorBorrado: 'Keycloak caído' })
  })

  it('si la invitación falla, la cuenta queda creada y se informa para reenviarla', async () => {
    mocks.enviarInvitacionIdp.mockRejectedValue(new idp.ErrorIdp('SMTP caído', 500))
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'sin-smtp@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.data?.invitacion).toBe('fallida')
    const acciones = (await auditoriasDe(r!.data!.usuarioId)).map((a) => a.accion)
    expect(acciones).toContain('invitacion_idp_fallida')
  })

  it('estudiante sin correo: usuario generado, contraseña temporal y sin invitación', async () => {
    const r = await crearUsuario({ persona: personaDePrueba(), rol: 'estudiante', sinCorreo: true })
    expect(r?.serverError).toBeUndefined()
    const datos = r!.data!
    expect(datos.invitacion).toBe('no_aplica')
    expect(datos.credencialTemporal?.usuario).toMatch(/^est-[a-z2-9]{8}$/)
    const llamada = mocks.crearUsuarioIdp.mock.calls[0]![0]
    expect(llamada.correo).toBeNull()
    expect(llamada.nombreUsuario).toBe(datos.credencialTemporal!.usuario)
    expect(llamada.contrasenaTemporal).toBe(datos.credencialTemporal!.contrasena)
    expect(mocks.enviarInvitacionIdp).not.toHaveBeenCalled()
    const [fila] = await _sqlRoot`SELECT correo, sin_correo FROM usuario WHERE id = ${datos.usuarioId}`
    expect(fila).toMatchObject({ correo: `${datos.credencialTemporal!.usuario}@sin-correo.invalid`, sin_correo: true })
    const alta = (await auditoriasDe(datos.usuarioId)).find((a) => a.accion === 'crear_usuario')!
    expect(alta.diferencia).toMatchObject({ excepcionSinCorreo: true })
  })

  it('rechaza la excepción sin correo para perfiles distintos de estudiante', async () => {
    const r = await crearUsuario({ persona: personaDePrueba(), rol: 'docente', sinCorreo: true })
    expect(r?.validationErrors).toBeDefined()
    expect(mocks.crearUsuarioIdp).not.toHaveBeenCalled()
  })
})

describe('desactivación, reactivación y sincronización', () => {
  async function cuentaConSesion(correo: string) {
    const r = await crearUsuario({ persona: personaDePrueba(), rol: 'docente', correo, sinCorreo: false })
    const usuarioId = r!.data!.usuarioId
    const sub = await mocks.crearUsuarioIdp.mock.results.at(-1)!.value
    const ahora = new Date()
    await drizzle(_sqlRoot, { schema: e })
      .insert(e.baSession)
      .values({
        id: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 3_600_000),
        token: crypto.randomUUID(),
        createdAt: ahora,
        updatedAt: ahora,
        userId: usuarioId,
      })
    vi.clearAllMocks()
    mocks.fijarHabilitadoIdp.mockResolvedValue(undefined)
    mocks.cerrarSesionesIdp.mockResolvedValue(undefined)
    return { usuarioId, sub }
  }

  it('desactivar borra la sesión de la plataforma y deshabilita y cierra sesiones en Keycloak', async () => {
    const { usuarioId, sub } = await cuentaConSesion('baja@idp-test.com')
    const r = await cambiarEstadoUsuario({ usuarioId, activo: false })
    expect(r?.data).toEqual({ activo: false, sincronizacion: 'sincronizado' })
    expect(await _sqlRoot`SELECT 1 FROM ba_session WHERE user_id = ${usuarioId}`).toHaveLength(0)
    expect(mocks.fijarHabilitadoIdp).toHaveBeenCalledWith(sub, false)
    expect(mocks.cerrarSesionesIdp).toHaveBeenCalledWith(sub)
    const [fila] = await _sqlRoot`SELECT activo, idp_pendiente FROM usuario WHERE id = ${usuarioId}`
    expect(fila).toMatchObject({ activo: false, idp_pendiente: false })

    const reactivar = await cambiarEstadoUsuario({ usuarioId, activo: true })
    expect(reactivar?.data).toEqual({ activo: true, sincronizacion: 'sincronizado' })
    expect(mocks.fijarHabilitadoIdp).toHaveBeenLastCalledWith(sub, true)
  })

  it('si Keycloak falla queda pendiente, y el reintento periódico lo resuelve y deja registro', async () => {
    const { usuarioId, sub } = await cuentaConSesion('caido@idp-test.com')
    mocks.fijarHabilitadoIdp.mockRejectedValue(new idp.ErrorIdp('No fue posible conectar con Keycloak', null))

    const r = await cambiarEstadoUsuario({ usuarioId, activo: false })
    expect(r?.data).toEqual({ activo: false, sincronizacion: 'pendiente' })
    expect(await _sqlRoot`SELECT 1 FROM ba_session WHERE user_id = ${usuarioId}`).toHaveLength(0)
    let [fila] = await _sqlRoot`SELECT activo, idp_pendiente, idp_intentos FROM usuario WHERE id = ${usuarioId}`
    expect(fila).toMatchObject({ activo: false, idp_pendiente: true, idp_intentos: 1 })

    const manual = await reintentarSincronizacion({ usuarioId })
    expect(manual?.data).toBe('pendiente')
    ;[fila] = await _sqlRoot`SELECT idp_intentos FROM usuario WHERE id = ${usuarioId}`
    expect(fila!.idp_intentos).toBe(2)

    mocks.fijarHabilitadoIdp.mockResolvedValue(undefined)
    const resultado = await sincronizarPendientesIdp()
    expect(resultado.sincronizados).toBeGreaterThanOrEqual(1)
    expect(mocks.fijarHabilitadoIdp).toHaveBeenLastCalledWith(sub, false)
    ;[fila] = await _sqlRoot`SELECT idp_pendiente, idp_intentos FROM usuario WHERE id = ${usuarioId}`
    expect(fila).toMatchObject({ idp_pendiente: false, idp_intentos: 0 })

    const intentos = (await auditoriasDe(usuarioId)).filter((a) => a.accion.startsWith('sincronizacion_idp'))
    expect(intentos.map((a) => a.accion)).toEqual([
      'sincronizacion_idp_fallida',
      'sincronizacion_idp_fallida',
      'sincronizacion_idp',
    ])
    expect(intentos.at(-1)!.actorRol).toBe('sistema')
  })

  it('con la bandera apagada deja la baja pendiente para cuando Keycloak vuelva', async () => {
    const { usuarioId } = await cuentaConSesion('apagada@idp-test.com')
    env.AUTH_KEYCLOAK_HABILITADO = false
    const r = await cambiarEstadoUsuario({ usuarioId, activo: false })
    expect(r?.data).toEqual({ activo: false, sincronizacion: 'pendiente' })
    expect(mocks.fijarHabilitadoIdp).not.toHaveBeenCalled()
  })

  it('no permite desactivar la propia cuenta', async () => {
    const r = await cambiarEstadoUsuario({ usuarioId: superadminId, activo: false })
    expect(r?.serverError).toMatch(/propia cuenta/)
  })
})

describe('cambio de correo', () => {
  it('actualiza Keycloak y la plataforma sin tocar el enlace por sub', async () => {
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'viejo@idp-test.com',
      sinCorreo: false,
    })
    const usuarioId = r!.data!.usuarioId
    const sub = await mocks.crearUsuarioIdp.mock.results[0]!.value

    const cambio = await cambiarCorreoUsuario({ usuarioId, correo: 'nuevo@idp-test.com' })
    expect(cambio?.serverError).toBeUndefined()
    expect(mocks.actualizarCorreoIdp).toHaveBeenCalledWith(sub, 'nuevo@idp-test.com')

    const dbRoot = drizzle(_sqlRoot, { schema: e })
    const [cuenta] = await dbRoot
      .select()
      .from(e.baAccount)
      .where(and(eq(e.baAccount.userId, usuarioId), eq(e.baAccount.providerId, 'keycloak')))
    expect(cuenta!.accountId).toBe(sub)
    const [u] = await dbRoot.select().from(e.usuario).where(eq(e.usuario.id, usuarioId))
    const [b] = await dbRoot.select().from(e.baUser).where(eq(e.baUser.id, usuarioId))
    expect(u!.correo).toBe('nuevo@idp-test.com')
    expect(b!.email).toBe('nuevo@idp-test.com')
  })

  it('con 409 de Keycloak no cambia nada', async () => {
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'queda@idp-test.com',
      sinCorreo: false,
    })
    mocks.actualizarCorreoIdp.mockRejectedValue(new idp.ErrorIdpConflicto())
    const cambio = await cambiarCorreoUsuario({ usuarioId: r!.data!.usuarioId, correo: 'ocupado@idp-test.com' })
    expect(cambio?.serverError).toMatch(/Keycloak ya tiene otra cuenta/)
    const [u] = await _sqlRoot`SELECT correo FROM usuario WHERE id = ${r!.data!.usuarioId}`
    expect(u!.correo).toBe('queda@idp-test.com')
  })
})

describe('con la bandera apagada', () => {
  it('crea la cuenta local con contraseña y no llama a Keycloak', async () => {
    env.AUTH_KEYCLOAK_HABILITADO = false
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'local@idp-test.com',
      sinCorreo: false,
      contrasenaInicial: 'una-contrasena-larga-1',
    })
    expect(r?.serverError).toBeUndefined()
    expect(r?.data?.proveedor).toBe('credential')
    expect(mocks.crearUsuarioIdp).not.toHaveBeenCalled()
    const [cuenta] = await _sqlRoot`SELECT provider_id, issuer, password FROM ba_account WHERE user_id = ${r!.data!.usuarioId}`
    expect(cuenta).toMatchObject({ provider_id: 'credential', issuer: 'local:credential' })
    expect(String(cuenta!.password)).toMatch(/^\$argon2id\$/)
  })

  it('exige la contraseña inicial', async () => {
    env.AUTH_KEYCLOAK_HABILITADO = false
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'sin-clave@idp-test.com',
      sinCorreo: false,
    })
    expect(r?.validationErrors).toBeDefined()
  })
})

describe('la contraseña temporal solo se muestra una vez', () => {
  async function textoDeToda(): Promise<string> {
    const tablas = await _sqlRoot`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    let texto = ''
    for (const { tablename } of tablas) {
      const filas = await _sqlRoot.unsafe(`SELECT to_jsonb(t)::text AS fila FROM public."${tablename}" t`)
      texto += filas.map((f) => f.fila).join('\n')
    }
    return texto
  }

  for (const conKeycloak of [true, false]) {
    it(`no queda en los logs, la auditoría ni ninguna tabla (Keycloak ${conKeycloak ? 'activo' : 'apagado'})`, async () => {
      env.AUTH_KEYCLOAK_HABILITADO = conKeycloak
      const { logger } = await import('../../src/logger')
      const registrado: unknown[] = []
      const espias = (['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const).map((nivel) =>
        vi.spyOn(logger, nivel).mockImplementation(((...args: unknown[]) => {
          registrado.push(args)
        }) as never)
      )
      const consola = (['log', 'info', 'warn', 'error', 'debug'] as const).map((nivel) =>
        vi.spyOn(console, nivel).mockImplementation((...args: unknown[]) => {
          registrado.push(args)
        })
      )
      try {
        const r = await crearUsuario({ persona: personaDePrueba(), rol: 'estudiante', sinCorreo: true })
        const contrasena = r!.data!.credencialTemporal!.contrasena
        expect(contrasena.length).toBeGreaterThanOrEqual(12)

        const { restablecerContrasenaCuenta } = await import('../../src/acciones/personas/persona')
        const nueva = await restablecerContrasenaCuenta({ usuarioId: r!.data!.usuarioId })
        const contrasenaNueva = nueva!.data!.contrasena

        const logs = JSON.stringify(registrado)
        const base = await textoDeToda()
        for (const secreto of [contrasena, contrasenaNueva]) {
          expect(logs).not.toContain(secreto)
          expect(base).not.toContain(secreto)
        }
      } finally {
        for (const espia of [...espias, ...consola]) espia.mockRestore()
      }
    })
  }

  it('pino redacta las credenciales si alguna vez llegan a un log', async () => {
    const pino = (await import('pino')).default
    const { RUTAS_REDACTADAS } = await import('../../src/logger')
    const lineas: string[] = []
    const prueba = pino({ redact: { paths: RUTAS_REDACTADAS, censor: '[REDACTADO]' } }, {
      write: (linea: string) => {
        lineas.push(linea)
      },
    })
    prueba.info({ resultado: { credencialTemporal: { usuario: 'est-abc', contrasena: 'SECRETO-123456' } } })
    prueba.info({ datos: { contrasenaTemporal: 'SECRETO-123456', contrasenaInicial: 'SECRETO-123456' } })
    expect(lineas.join('')).not.toContain('SECRETO-123456')
  })
})

describe('quién crea cuentas y qué perfiles asigna', () => {
  async function cuentaDirecta(rol: string, correo: string) {
    const dbRoot = drizzle(_sqlRoot, { schema: e })
    const [p] = await dbRoot.insert(e.persona).values(personaDePrueba()).returning()
    const [u] = await dbRoot.insert(e.usuario).values({ personaId: p!.id, correo, rol }).returning()
    return u!.id
  }

  function comoActor(id: string, rol: string) {
    actor.id = id
    actor.rol = rol
  }

  for (const conKeycloak of [true, false]) {
    describe(`con Keycloak ${conKeycloak ? 'activo' : 'apagado'}`, () => {
      beforeEach(() => {
        env.AUTH_KEYCLOAK_HABILITADO = conKeycloak
      })

      it('el Administrador crea un Contador y la auditoría registra quién lo creó', async () => {
        const adminId = await cuentaDirecta('admin', `admin.${conKeycloak}@idp-test.com`)
        comoActor(adminId, 'admin')
        const r = await crearUsuario({
          persona: personaDePrueba(),
          rol: 'contador',
          correo: `contador.${conKeycloak}@idp-test.com`,
          sinCorreo: false,
          contrasenaInicial: conKeycloak ? undefined : 'una-contrasena-larga-1',
        })
        expect(r?.serverError).toBeUndefined()
        const alta = (await auditoriasDe(r!.data!.usuarioId)).find((a) => a.accion === 'crear_usuario')!
        expect(alta).toMatchObject({ actorId: adminId, actorRol: 'admin' })
        expect(alta.diferencia).toMatchObject({ rol: 'contador' })
        if (conKeycloak) {
          expect(mocks.crearUsuarioIdp.mock.calls[0]![0].accionesRequeridas).toEqual([
            'UPDATE_PASSWORD',
            'CONFIGURE_TOTP',
          ])
        }
      })

      it('el Administrador no puede crear un Superadministrador ni otro Administrador', async () => {
        const adminId = await cuentaDirecta('admin', `admin2.${conKeycloak}@idp-test.com`)
        comoActor(adminId, 'admin')
        for (const rol of ['superadmin', 'admin'] as const) {
          const r = await crearUsuario({
            persona: personaDePrueba(),
            rol,
            correo: `intento.${rol}.${conKeycloak}@idp-test.com`,
            sinCorreo: false,
            contrasenaInicial: 'una-contrasena-larga-1',
          })
          expect(r?.serverError).toBe('Su perfil no puede crear cuentas con ese perfil.')
        }
        expect(mocks.crearUsuarioIdp).not.toHaveBeenCalled()
        const filas = await _sqlRoot`SELECT 1 FROM usuario WHERE correo LIKE ${`intento.%.${conKeycloak}@idp-test.com`}`
        expect(filas).toHaveLength(0)
      })

      it('el Administrador no asciende a nadie a Administrador y sí cambia entre los cinco perfiles', async () => {
        const adminId = await cuentaDirecta('admin', `admin3.${conKeycloak}@idp-test.com`)
        const docenteId = await cuentaDirecta('docente', `docente3.${conKeycloak}@idp-test.com`)
        comoActor(adminId, 'admin')
        for (const rol of ['admin', 'superadmin'] as const) {
          const r = await cambiarRolUsuario({ usuarioId: docenteId, rol })
          expect(r?.serverError).toBe('Su perfil no puede asignar ese perfil.')
        }
        const permitido = await cambiarRolUsuario({ usuarioId: docenteId, rol: 'secretaria' })
        expect(permitido?.serverError).toBeUndefined()
        const [fila] = await _sqlRoot`SELECT rol FROM usuario WHERE id = ${docenteId}`
        expect(fila!.rol).toBe('secretaria')
        const cambio = (await auditoriasDe(docenteId)).find((a) => a.accion === 'cambiar_rol')!
        expect(cambio).toMatchObject({ actorId: adminId, actorRol: 'admin' })
        expect(cambio.diferencia).toMatchObject({ anterior: 'docente', nuevo: 'secretaria' })
      })

      it('el Administrador no toca cuentas de Administrador ni de Superadministrador', async () => {
        const adminId = await cuentaDirecta('admin', `admin4.${conKeycloak}@idp-test.com`)
        const otroAdmin = await cuentaDirecta('admin', `admin5.${conKeycloak}@idp-test.com`)
        comoActor(adminId, 'admin')
        for (const objetivo of [otroAdmin, superadminId]) {
          const baja = await cambiarEstadoUsuario({ usuarioId: objetivo, activo: false })
          expect(baja?.serverError).toMatch(/su perfil no puede gestionarla/)
          const degradar = await cambiarRolUsuario({ usuarioId: objetivo, rol: 'docente' })
          expect(degradar?.serverError).toMatch(/su perfil no puede gestionarla/)
          const correo = await cambiarCorreoUsuario({ usuarioId: objetivo, correo: `otro.${conKeycloak}@idp-test.com` })
          expect(correo?.serverError).toMatch(/su perfil no puede gestionarla/)
        }
        const filas = await _sqlRoot`SELECT activo, rol FROM usuario WHERE id IN (${otroAdmin}, ${superadminId})`
        expect(filas.every((f) => f.activo === true)).toBe(true)
        expect(filas.map((f) => f.rol).sort()).toEqual(['admin', 'superadmin'])
      })

      it('ningún otro perfil puede crear cuentas', async () => {
        for (const rol of ['docente', 'estudiante', 'acudiente', 'secretaria', 'contador']) {
          const id = await cuentaDirecta(rol, `${rol}.creador.${conKeycloak}@idp-test.com`)
          comoActor(id, rol)
          const r = await crearUsuario({
            persona: personaDePrueba(),
            rol: 'estudiante',
            correo: `creado.por.${rol}.${conKeycloak}@idp-test.com`,
            sinCorreo: false,
            contrasenaInicial: 'una-contrasena-larga-1',
          })
          expect(r?.serverError).toBe('Solo el Administrador y el Superadministrador gestionan cuentas')
          const cambio = await cambiarRolUsuario({ usuarioId: id, rol: 'admin' })
          expect(cambio?.serverError).toBe('Solo el Administrador y el Superadministrador gestionan cuentas')
        }
        expect(mocks.crearUsuarioIdp).not.toHaveBeenCalled()
      })

      it('el Superadministrador asigna cualquiera de los siete perfiles y un ascenso exige TOTP', async () => {
        const r = await crearUsuario({
          persona: personaDePrueba(),
          rol: 'acudiente',
          correo: `acudiente.super.${conKeycloak}@idp-test.com`,
          sinCorreo: false,
          contrasenaInicial: conKeycloak ? undefined : 'una-contrasena-larga-1',
        })
        expect(r?.serverError).toBeUndefined()
        const ascenso = await cambiarRolUsuario({ usuarioId: r!.data!.usuarioId, rol: 'admin' })
        expect(ascenso?.data).toEqual({ rol: 'admin', totp: conKeycloak ? 'agregado' : 'no_aplica' })
        if (conKeycloak) {
          const sub = await mocks.crearUsuarioIdp.mock.results[0]!.value
          expect(mocks.agregarAccionRequeridaIdp).toHaveBeenCalledWith(sub, 'CONFIGURE_TOTP')
        }
        const cambio = (await auditoriasDe(r!.data!.usuarioId)).find((a) => a.accion === 'cambiar_rol')!
        expect(cambio).toMatchObject({ actorId: superadminId, actorRol: 'superadmin' })
      })
    })
  }
})

describe('verificación en dos pasos pedida desde el panel', () => {
  it('agrega CONFIGURE_TOTP en Keycloak y lo audita', async () => {
    const r = await crearUsuario({
      persona: personaDePrueba(),
      rol: 'docente',
      correo: 'totp.panel@idp-test.com',
      sinCorreo: false,
    })
    const usuarioId = r!.data!.usuarioId
    const sub = await mocks.crearUsuarioIdp.mock.results[0]!.value
    const pedido = await exigirTotpUsuario({ usuarioId })
    expect(pedido?.data).toEqual({ exigido: true })
    expect(mocks.agregarAccionRequeridaIdp).toHaveBeenCalledWith(sub, 'CONFIGURE_TOTP')
    const acciones = (await auditoriasDe(usuarioId)).map((a) => a.accion)
    expect(acciones).toContain('totp_idp_exigido')
  })

  it('con Keycloak apagado se rechaza', async () => {
    env.AUTH_KEYCLOAK_HABILITADO = false
    const r = await exigirTotpUsuario({ usuarioId: superadminId })
    expect(r?.serverError).toMatch(/Keycloak activo/)
  })
})
