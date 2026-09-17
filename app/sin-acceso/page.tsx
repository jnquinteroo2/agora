import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sin acceso' }

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel-fondo px-6 text-panel-texto">
      <div className="flex max-w-md flex-col gap-4">
        <p className="font-mono text-xs uppercase tracking-widest text-panel-secundario">
          Acceso restringido
        </p>
        <h1 className="font-display text-3xl">Esta sección no corresponde a su rol</h1>
        <p className="text-sm leading-relaxed text-panel-secundario">
          Su cuenta está activa, pero no tiene permiso para ver esta parte del panel. Si cree que
          se trata de un error, comuníquelo a la dirección administrativa.
        </p>
        <Link href="/panel" className="text-sm text-carmin underline underline-offset-4">
          Volver a mi panel
        </Link>
      </div>
    </div>
  )
}
