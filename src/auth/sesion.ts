import { headers } from 'next/headers'
import { cache } from 'react'
import { auth } from './config'
import { db, conContextoRLS } from '../datos/cliente'
import { usuario } from '../datos/esquema'
import { eq } from 'drizzle-orm'

export const obtenerSesion = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

export const obtenerUsuarioActual = cache(async () => {
  const sesion = await obtenerSesion()
  if (!sesion?.user?.id) return null

  const [u] = await conContextoRLS(
    db,
    { usuarioId: sesion.user.id, rol: 'anonimo' },
    async (tx) =>
      tx.select().from(usuario).where(eq(usuario.id, sesion.user.id)).limit(1)
  )

  return u ?? null
})

export type Rol = 'superadmin' | 'docente' | 'estudiante'

export async function exigirSesion() {
  const sesion = await obtenerSesion()
  if (!sesion) throw new Error('No autenticado')
  return sesion
}

export async function exigirRol(rolEsperado: Rol | Rol[]) {
  const u = await obtenerUsuarioActual()
  if (!u || !u.activo) throw new Error('Sin acceso')

  const roles = Array.isArray(rolEsperado) ? rolEsperado : [rolEsperado]
  if (!roles.includes(u.rol as Rol)) throw new Error('Sin permiso para este recurso')

  return u
}
