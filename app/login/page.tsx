import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { obtenerConfiguracion, nombreCorto, nombreLegal } from '@/src/datos/configuracion-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { MarcaAdaptable } from '@/src/ui/marca'
import { SelectorDeTema } from '@/src/ui/selector-de-tema'
import { EnlaceBoton } from '@/src/ui/boton'
import { PortalDeAcceso } from './portal'
import { env } from '@/src/env'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Portal de acceso',
  robots: { index: false, follow: false },
}

export default async function PaginaLogin() {
  const config = await obtenerConfiguracion()
  const corto = nombreCorto(config)

  return (
    <div className="flex min-h-dvh flex-col bg-superficie text-texto">
      <a
        href="#contenido"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[var(--capa-aviso)] focus-visible:rounded-control focus-visible:bg-texto focus-visible:px-4 focus-visible:py-2.5 focus-visible:text-nota focus-visible:font-medium focus-visible:text-superficie"
      >
        Saltar al contenido
      </a>

      <header className="border-b border-borde">
        <Contenedor ancho="amplio" className="flex h-16 items-center gap-3 lg:h-[4.5rem]">
          <Link
            href="/inicio"
            className="transicion-ui -ml-1 flex items-center gap-3 rounded-control p-1 hover:opacity-85"
          >
            <MarcaAdaptable lado={40} prioridad />
            <span className="font-titulo text-[1.1875rem] font-medium text-texto">{corto}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <SelectorDeTema />
            <EnlaceBoton href="/inicio" tono="fantasma" talla="sm">
              <ArrowLeft aria-hidden="true" strokeWidth={1.75} />
              <span className="hidden sm:inline">Volver al sitio</span>
              <span className="sm:hidden">Sitio</span>
            </EnlaceBoton>
          </div>
        </Contenedor>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 py-aire-sm focus-visible:outline-none">
        <Contenedor ancho="amplio">
          <PortalDeAcceso keycloak={env.AUTH_KEYCLOAK_HABILITADO} />
        </Contenedor>
      </main>

      <footer className="border-t border-borde">
        <Contenedor
          ancho="amplio"
          className="flex flex-col gap-3 py-6 text-menudo text-texto-secundario sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            © {new Date().getFullYear()} {nombreLegal(config)}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link
                href="/privacidad"
                className="transicion-ui rounded-[2px] underline-offset-4 hover:text-texto hover:underline"
              >
                Tratamiento de datos personales
              </Link>
            </li>
            <li>
              <Link
                href="/terminos"
                className="transicion-ui rounded-[2px] underline-offset-4 hover:text-texto hover:underline"
              >
                Términos de uso
              </Link>
            </li>
          </ul>
        </Contenedor>
      </footer>
    </div>
  )
}
