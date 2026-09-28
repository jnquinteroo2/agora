import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const carpeta = join(__dirname, '../../infra/keycloak/realm')
const realm = JSON.parse(readFileSync(join(carpeta, 'agora-realm.json'), 'utf8'))
const perfilSuelto = JSON.parse(readFileSync(join(carpeta, 'perfil-usuario.json'), 'utf8'))
const perfilDelRealm = JSON.parse(
  realm.components['org.keycloak.userprofile.UserProfileProvider'][0].config['kc.user.profile.config'][0]
)

interface Atributo {
  name: string
  permissions: { view: string[]; edit: string[] }
}

describe('realm agora', () => {
  it('importa y actualiza el mismo perfil de usuario', () => {
    expect(perfilDelRealm).toEqual(perfilSuelto)
  })

  it('agora_usuario_id solo lo ven y editan los administradores', () => {
    const atributo = (perfilDelRealm.attributes as Atributo[]).find((a) => a.name === 'agora_usuario_id')
    expect(atributo?.permissions).toEqual({ view: ['admin'], edit: ['admin'] })
  })

  it('la persona no edita su usuario, correo ni nombres desde la consola de su cuenta', () => {
    for (const atributo of perfilDelRealm.attributes as Atributo[]) {
      expect(atributo.permissions.edit).toEqual(['admin'])
    }
  })

  it('pone agora_usuario_id solo en el token de ID', () => {
    const cliente = realm.clients.find((c: { clientId: string }) => c.clientId === 'plataforma-agora')
    const mapper = cliente.protocolMappers.find((m: { name: string }) => m.name === 'agora_usuario_id')
    expect(mapper.config).toMatchObject({
      'user.attribute': 'agora_usuario_id',
      'id.token.claim': 'true',
      'access.token.claim': 'false',
      'userinfo.token.claim': 'false',
    })
  })

  it('el cliente de administración solo tiene cuenta de servicio con permisos sobre usuarios', () => {
    const cliente = realm.clients.find((c: { clientId: string }) => c.clientId === 'plataforma-admin')
    expect(cliente).toMatchObject({
      serviceAccountsEnabled: true,
      standardFlowEnabled: false,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      publicClient: false,
    })
    const cuenta = realm.users.find(
      (u: { serviceAccountClientId?: string }) => u.serviceAccountClientId === 'plataforma-admin'
    )
    expect(cuenta.clientRoles).toEqual({ 'realm-management': ['manage-users', 'view-users'] })
    expect(cuenta.realmRoles).toBeUndefined()
  })

  it('no permite registrarse ni borrar credenciales desde la consola', () => {
    expect(realm.registrationAllowed).toBe(false)
    const alias = (realm.requiredActions as Array<{ alias: string }>).map((a) => a.alias)
    expect(alias).not.toContain('delete_credential')
  })

  it('ninguna página de Keycloak se puede enmarcar', () => {
    const csp: string = realm.browserSecurityHeaders.contentSecurityPolicy
    expect(csp).toContain("frame-ancestors 'none'")
    expect(realm.browserSecurityHeaders.xFrameOptions).toBe('DENY')
  })

  it('la consola de cuenta está deshabilitada', () => {
    for (const clientId of ['account', 'account-console']) {
      const cliente = realm.clients.find((c: { clientId: string }) => c.clientId === clientId)
      expect(cliente?.enabled).toBe(false)
    }
  })
})
