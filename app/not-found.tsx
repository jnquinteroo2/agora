import Link from 'next/link'
import type { Metadata, Route } from 'next'
import { NAVEGACION_LEGAL, NAVEGACION_PRINCIPAL } from '@/src/ui/navegacion'
import { Contenedor } from '@/src/ui/contenedor'
import { MarcoPublico } from '@/src/ui/marco-publico'
import { EnlaceBoton } from '@/src/ui/boton'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: false },
}

export default async function PaginaNoEncontrada() {
  return (
    <MarcoPublico>
      <div className="flex items-center py-aire">
        <Contenedor ancho="amplio" className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col items-start gap-6 lg:col-span-7">
            <p className="versalitas text-menudo text-piedra">Error 404</p>
            <h1 className="equilibrado font-display text-portada font-medium text-tinta">
              Esta página no existe
            </h1>
            <p className="prosa max-w-medida text-guia leading-relaxed text-piedra">
              La dirección puede estar mal escrita, o la página se movió o se retiró. Desde el
              inicio, o desde cualquiera de las secciones de la lista, puede seguir navegando.
            </p>
            <EnlaceBoton href="/inicio" tono="primario" talla="lg">
              Ir al inicio
            </EnlaceBoton>
          </div>

          <nav aria-labelledby="titulo-secciones" className="flex flex-col gap-5 lg:col-span-5">
            <h2 id="titulo-secciones" className="versalitas text-menudo text-piedra">
              Secciones del sitio
            </h2>
            <ul className="flex flex-col border-t border-niebla">
              {NAVEGACION_PRINCIPAL.map((enlace) => (
                <li key={enlace.href} className="border-b border-niebla">
                  <Link
                    href={enlace.href as Route}
                    className="transicion-ui block py-3 font-display text-rubro text-tinta hover:text-piedra"
                  >
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-menudo text-piedra">
              {NAVEGACION_LEGAL.map((enlace) => (
                <li key={enlace.href}>
                  <Link href={enlace.href as Route} className="transicion-ui hover:text-tinta">
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Contenedor>
      </div>
    </MarcoPublico>
  )
}
