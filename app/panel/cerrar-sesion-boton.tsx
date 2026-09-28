'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, LogOut } from 'lucide-react'
import { authClient } from '@/src/auth/cliente'
import { cn } from '@/src/ui/cn'

export function CerrarSesionBoton({ className }: { className?: string }) {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)

  async function cerrarSesion() {
    setSaliendo(true)
    let destinoExterno: string | undefined
    try {
      const { data } = await authClient.signOut()
      destinoExterno = data && 'url' in data && typeof data.url === 'string' ? data.url : undefined
    } finally {
      if (destinoExterno) {
        window.location.assign(destinoExterno)
      } else {
        router.push('/login')
        router.refresh()
      }
    }
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      disabled={saliendo}
      className={cn(
        'presionable inline-flex min-h-11 w-full items-center gap-3 rounded-control border border-transparent px-3 text-nota text-texto-secundario hover:border-borde hover:text-texto disabled:opacity-60',
        className
      )}
    >
      {saliendo ? (
        <LoaderCircle aria-hidden="true" className="size-[1.125rem] animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
      )}
      {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  )
}
