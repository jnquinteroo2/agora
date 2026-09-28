import { and, asc, eq, sql } from 'drizzle-orm'
import { db, conContextoRLS, type ContextoRLS } from '@/src/datos/cliente'
import { usuario, persona, baAccount } from '@/src/datos/esquema'
import { PROVEEDOR_KEYCLOAK, ROLES_CON_TOTP_OBLIGATORIO, nombreDeUsuarioVisible } from '@/src/auth/idp/cuentas'

export interface CuentaListada {
  id: string
  nombre: string
  acceso: string
  correo: string
  rol: string
  activo: boolean
  sinCorreo: boolean
  enlazadaKeycloak: boolean
  pendienteSincronizar: boolean
  intentos: number
  totpObligatorio: boolean
}

export async function cargarCuentas(contexto: ContextoRLS): Promise<CuentaListada[]> {
  const filas = await conContextoRLS(db, contexto, (tx) =>
    tx
      .select({ usuario, persona, sub: baAccount.accountId })
      .from(usuario)
      .innerJoin(persona, eq(persona.id, usuario.personaId))
      .leftJoin(
        baAccount,
        and(eq(baAccount.userId, sql`${usuario.id}::text`), eq(baAccount.providerId, PROVEEDOR_KEYCLOAK))
      )
      .orderBy(asc(persona.primerApellido), asc(persona.primerNombre))
  )
  return filas.map(({ usuario: u, persona: p, sub }) => ({
    id: u.id,
    nombre: [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
      .filter(Boolean)
      .join(' '),
    acceso: nombreDeUsuarioVisible(u.correo, u.sinCorreo),
    correo: u.correo,
    rol: u.rol,
    activo: u.activo,
    sinCorreo: u.sinCorreo,
    enlazadaKeycloak: Boolean(sub),
    pendienteSincronizar: u.idpPendiente,
    intentos: u.idpIntentos,
    totpObligatorio: ROLES_CON_TOTP_OBLIGATORIO.includes(u.rol),
  }))
}
