import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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
            <p
              aria-hidden="true"
              className="font-mono text-[clamp(4.5rem,3rem+7vw,8.5rem)] leading-none font-medium tracking-tight text-texto font-tnum"
            >
              404
            </p>
            <p className="sr-only">Error 404</p>
            <h1 className="equilibrado font-titulo text-portada font-medium text-texto">
              Esta página no existe
            </h1>
            <p className="prosa max-w-medida text-guia leading-relaxed text-texto-secundario">
              La dirección puede estar mal escrita, o la página se movió o se retiró. Desde el
              inicio, o desde cualquiera de las secciones de la lista, puede seguir navegando.
            </p>
            <EnlaceBoton href="/inicio" tono="primario" talla="lg">
              Ir al inicio
            </EnlaceBoton>
          </div>

          <nav aria-labelledby="titulo-secciones" className="flex flex-col gap-5 lg:col-span-5">
            <h2 id="titulo-secciones" className="text-nota font-medium text-texto-secundario">
              Secciones del sitio
            </h2>
            <ul className="flex flex-col divide-y divide-borde overflow-hidden rounded-tarjeta border border-borde shadow-sutil">
              {NAVEGACION_PRINCIPAL.map((enlace) => (
                <li key={enlace.href}>
                  <Link
                    href={enlace.href as Route}
                    className="group transicion-ui flex min-h-12 items-center justify-between gap-4 px-5 py-3 font-titulo text-rubro text-texto"
                  >
                    <span className="decoration-acento-texto decoration-2 underline-offset-4 group-hover:underline">
                      {enlace.etiqueta}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className="size-5 shrink-0 text-texto-secundario transition-transform duration-150 ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-menudo text-texto-secundario">
              {NAVEGACION_LEGAL.map((enlace) => (
                <li key={enlace.href}>
                  <Link
                    href={enlace.href as Route}
                    className="transicion-ui rounded-[2px] underline-offset-4 hover:text-texto hover:underline"
                  >
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
