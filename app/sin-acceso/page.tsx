import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldAlert } from 'lucide-react'
import { Contenedor } from '@/src/ui/contenedor'
import { MarcaAdaptable } from '@/src/ui/marca'
import { SelectorDeTema } from '@/src/ui/selector-de-tema'
import { EnlaceBoton, EnlaceSubrayado } from '@/src/ui/boton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sin acceso',
  robots: { index: false, follow: false },
}

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-superficie text-texto">
      <header className="border-b border-borde">
        <Contenedor ancho="amplio" className="flex h-16 items-center gap-3">
          <Link
            href="/inicio"
            className="transicion-ui -ml-1 flex items-center gap-3 rounded-control p-1 hover:opacity-85"
          >
            <MarcaAdaptable lado={36} />
            <span className="font-titulo text-[1.125rem] font-medium">Colegio Ágora</span>
          </Link>
          <SelectorDeTema className="ml-auto" />
        </Contenedor>
      </header>
      <main id="contenido" className="flex flex-1 items-center py-aire">
        <Contenedor ancho="amplio" className="flex max-w-2xl flex-col items-start gap-6">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-control border border-borde text-texto-secundario"
          >
            <ShieldAlert className="size-6" strokeWidth={1.75} />
          </span>
          <h1 className="equilibrado font-titulo text-portada font-medium text-texto">
            Esta sección no corresponde a su perfil
          </h1>
          <p className="prosa max-w-medida text-guia text-texto-secundario">
            Su cuenta está activa, pero no tiene permiso para ver esta parte de la plataforma. Si
            cree que se trata de un error, comuníquelo a la dirección administrativa.
          </p>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <EnlaceBoton href="/panel" tono="primario" talla="lg">
              Volver a mi panel
            </EnlaceBoton>
            <EnlaceSubrayado href="/inicio" className="text-nota">
              Ir al sitio público
            </EnlaceSubrayado>
          </div>
        </Contenedor>
      </main>
    </div>
  )
}
