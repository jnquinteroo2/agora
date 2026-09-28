import type { Metadata } from 'next'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { PantallaCuentas } from '../../_cuentas/pantalla'

export const metadata: Metadata = { title: 'Cuentas' }

export default async function CuentasAdmin() {
  const usuarioActual = await obtenerUsuarioActual()
  if (!usuarioActual || usuarioActual.rol !== 'superadmin') return null
  return <PantallaCuentas contexto={{ usuarioId: usuarioActual.id, rol: 'superadmin' }} />
}
