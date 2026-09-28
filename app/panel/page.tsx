import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { perfilPorClave } from '@/src/ui/perfiles'

export default async function PanelPage() {
  const usuario = await obtenerUsuarioActual()
  const perfil = usuario ? perfilPorClave(usuario.rol) : undefined
  redirect((perfil ? perfil.ruta : '/sin-acceso') as Route)
}
