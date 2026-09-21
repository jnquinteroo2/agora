import Link from 'next/link'
import type { Route } from 'next'
import {
  obtenerConfiguracion,
  nombreCorto,
  nombreLegal,
  direccionCompleta,
  ubicacion,
} from '@/src/datos/configuracion-publica'
import { NAVEGACION_PRINCIPAL, NAVEGACION_LEGAL } from './navegacion'
import { MenuMovil } from './menu-movil'
import { Contenedor } from './contenedor'
import { FileteLaurel } from './greca'
import { Marca } from './marca'
import { EnlaceBoton } from './boton'

export async function MarcoPublico({ children }: { children: React.ReactNode }) {
  const config = await obtenerConfiguracion()
  const corto = nombreCorto(config)
  const legal = nombreLegal(config)
  const direccion = direccionCompleta(config)
  const lugar = ubicacion(config)
  const hayContacto = Boolean(direccion || config?.telefono || config?.correo)

  return (
    <div className="flex min-h-dvh flex-col bg-hueso text-tinta print:min-h-0 print:bg-transparent">
      <a
        href="#contenido"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-[var(--capa-aviso)] focus-visible:rounded-sm focus-visible:bg-tinta focus-visible:px-4 focus-visible:py-2 focus-visible:text-nota focus-visible:text-hueso"
      >
        Saltar al contenido
      </a>

      <FileteLaurel className="shrink-0 print:hidden" />

      <header className="border-b border-niebla print:hidden">
        <Contenedor ancho="amplio" className="flex h-20 items-center justify-between gap-6">
          <Link
            href="/inicio"
            className="transicion-ui flex items-center gap-3 rounded-sm hover:opacity-80"
          >
            <Marca variante="color" lado={48} prioridad />
            <span className="flex flex-col leading-none">
              <span className="font-display text-rubro font-medium">{corto}</span>
              {lugar ? (
                <span className="versalitas pt-1 text-menudo text-piedra">{lugar}</span>
              ) : null}
            </span>
          </Link>

          <nav aria-label="Navegación principal" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-x-5 xl:gap-x-7">
              {NAVEGACION_PRINCIPAL.map((enlace) => (
                <li key={enlace.href}>
                  <Link
                    href={enlace.href as Route}
                    className="transicion-ui text-menudo text-piedra hover:text-tinta"
                  >
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 lg:ml-8">
            <EnlaceBoton
              href="/login"
              tono="secundario"
              talla="sm"
              className="hidden lg:inline-flex"
            >
              Ingresar
            </EnlaceBoton>
            <MenuMovil enlaces={NAVEGACION_PRINCIPAL} nombreColegio={corto} />
          </div>
        </Contenedor>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 focus-visible:outline-none">
        {children}
      </main>

      <footer className="border-t border-niebla bg-tinta text-hueso print:hidden">
        <Contenedor ancho="amplio" className="py-aire">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="flex flex-col gap-4 md:col-span-4">
              <Marca variante="blanco" lado={80} />
              <p className="font-display text-rubro text-hueso">{legal}</p>
              {config?.lema ? (
                <p className="max-w-[34ch] font-display text-cuerpo text-niebla italic">
                  {config.lema}
                </p>
              ) : null}
            </div>

            <nav
              aria-label="Mapa del sitio"
              className={hayContacto ? 'md:col-span-4' : 'md:col-span-4 md:col-start-9'}
            >
              <h2 className="versalitas text-menudo text-panel-secundario">Mapa del sitio</h2>
              <ul className="mt-4 grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-6 gap-y-2.5">
                {NAVEGACION_PRINCIPAL.map((enlace) => (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href as Route}
                      className="transicion-ui text-nota text-niebla hover:text-hueso"
                    >
                      {enlace.etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {hayContacto ? (
              <div className="flex flex-col gap-4 md:col-span-4">
                <h2 className="versalitas text-menudo text-panel-secundario">Contacto</h2>
                <ul className="flex flex-col gap-2.5 text-nota text-niebla">
                  {direccion ? <li>{direccion}</li> : null}
                  {config?.telefono ? (
                    <li>
                      <a
                        href={`tel:${config.telefono.replace(/\s+/g, '')}`}
                        className="transicion-ui hover:text-hueso"
                      >
                        {config.telefono}
                      </a>
                    </li>
                  ) : null}
                  {config?.correo ? (
                    <li>
                      <a
                        href={`mailto:${config.correo}`}
                        className="transicion-ui break-all hover:text-hueso"
                      >
                        {config.correo}
                      </a>
                    </li>
                  ) : null}
                </ul>
                <Link
                  href="/contacto"
                  className="transicion-ui mt-1 w-fit text-nota text-hueso underline decoration-piedra underline-offset-4 hover:decoration-hueso"
                >
                  Ver todos los canales
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-aire-sm flex flex-col gap-4 border-t border-panel-borde pt-6 text-menudo text-panel-secundario md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} {legal}
              {config?.nit ? `. NIT ${config.nit}` : ''}
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAVEGACION_LEGAL.map((enlace) => (
                <li key={enlace.href}>
                  <Link href={enlace.href as Route} className="transicion-ui hover:text-hueso">
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Contenedor>
      </footer>
    </div>
  )
}
