import { exigirConfiguracionDelSitio } from './sitio'
import { env } from './env'

export function exigirSecretoDeAdministracionIdp(): void {
  if (env.AUTH_KEYCLOAK_HABILITADO && !env.KEYCLOAK_ADMIN_CLIENTE_SECRETO) {
    throw new Error(
      'Con AUTH_KEYCLOAK_HABILITADO=true este proceso necesita KEYCLOAK_ADMIN_CLIENTE_SECRETO o KEYCLOAK_ADMIN_CLIENTE_SECRETO_FILE'
    )
  }
}

export function verificarArranque(): void {
  try {
    exigirConfiguracionDelSitio()
    exigirSecretoDeAdministracionIdp()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
