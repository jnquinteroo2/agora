'use client'

import { useRouter } from 'next/navigation'
import { authClient } from '@/src/auth/cliente'

export function CerrarSesionBoton() {
  const router = useRouter()

  async function cerrarSesion() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={cerrarSesion} className="text-panel-secundario hover:text-carmin">
      Cerrar sesión
    </button>
  )
}
