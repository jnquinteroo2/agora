import { createSafeActionClient } from 'next-safe-action'
import { obtenerSesion, obtenerUsuarioActual, type Rol } from '../auth/sesion'

export const accion = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof Error) return error.message
    return 'Error inesperado en el servidor'
  },
})

export const accionAutenticada = accion.use(async ({ next }) => {
  const sesion = await obtenerSesion()
  if (!sesion?.user) throw new Error('No autenticado')

  const usuario = await obtenerUsuarioActual()
  if (!usuario || !usuario.activo) throw new Error('Cuenta inactiva o sin acceso')

  return next({ ctx: { sesion, usuario } })
})

export const accionSuperadmin = accionAutenticada.use(async ({ ctx, next }) => {
  if (ctx.usuario.rol !== 'superadmin') throw new Error('Se requiere rol superadmin')
  return next({ ctx })
})

export const accionDocente = accionAutenticada.use(async ({ ctx, next }) => {
  if (!['superadmin', 'docente'].includes(ctx.usuario.rol)) {
    throw new Error('Se requiere rol docente o superior')
  }
  return next({ ctx })
})
