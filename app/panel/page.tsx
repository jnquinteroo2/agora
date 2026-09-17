import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { obtenerUsuarioActual } from '@/src/auth/sesion'

const INICIO_POR_ROL: Record<string, string> = {
  superadmin: '/panel/admin',
  docente: '/panel/docente',
  estudiante: '/panel/estudiante',
}

export default async function PanelPage() {
  const usuario = await obtenerUsuarioActual()
  redirect((usuario ? (INICIO_POR_ROL[usuario.rol] ?? '/login') : '/login') as Route)
}
