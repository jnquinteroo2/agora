import Link from 'next/link'
import type { Route } from 'next'
import { NAVEGACION_LEGAL, NAVEGACION_PRINCIPAL } from './navegacion'
import { Contenedor } from './contenedor'
import { MarcaAdaptable } from './marca'

export interface DatosDelPie {
  nombreLegal: string
  lema: string | null
  nit: string | null
  direccion: string | null
  telefono: string | null
  correo: string | null
}

const estiloEnlace =
  'transicion-ui rounded-[2px] text-nota text-texto-secundario hover:text-texto hover:underline underline-offset-4'

export function PieSitio({ datos }: { datos: DatosDelPie }) {
  const hayContacto = Boolean(datos.direccion || datos.telefono || datos.correo)

  return (
    <footer className="border-t border-borde bg-superficie print:hidden">
      <Contenedor ancho="amplio" className="py-aire-sm">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="flex flex-col gap-4 md:col-span-5">
            <MarcaAdaptable lado={56} />
            <p className="font-titulo text-rubro font-medium text-texto">{datos.nombreLegal}</p>
            {datos.lema ? (
              <p className="max-w-[36ch] font-titulo text-cuerpo text-texto-secundario italic">
                {datos.lema}
              </p>
            ) : null}
          </div>

          <nav aria-labelledby="pie-mapa" className="md:col-span-4">
            <h2 id="pie-mapa" className="text-menudo font-semibold text-texto">
              Mapa del sitio
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {NAVEGACION_PRINCIPAL.map((enlace) => (
                <li key={enlace.href}>
                  <Link href={enlace.href as Route} className={estiloEnlace}>
                    {enlace.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-4 md:col-span-3">
            <h2 className="text-menudo font-semibold text-texto">Contacto</h2>
            {hayContacto ? (
              <ul className="flex flex-col gap-2.5 text-nota text-texto-secundario">
                {datos.direccion ? <li>{datos.direccion}</li> : null}
                {datos.telefono ? (
                  <li>
                    <a
                      href={`tel:${datos.telefono.replace(/\s+/g, '')}`}
                      className={`${estiloEnlace} font-mono font-tnum`}
                    >
                      {datos.telefono}
                    </a>
                  </li>
                ) : null}
                {datos.correo ? (
                  <li>
                    <a href={`mailto:${datos.correo}`} className={`${estiloEnlace} break-all`}>
                      {datos.correo}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <Link href="/contacto" className={`${estiloEnlace} w-fit font-medium text-texto`}>
              {hayContacto ? 'Ver todos los canales' : 'Cómo comunicarse con la institución'}
            </Link>
          </div>
        </div>

        <div className="mt-aire-sm flex flex-col gap-4 border-t border-borde pt-6 text-menudo text-texto-secundario md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {datos.nombreLegal}
            {datos.nit ? (
              <>
                . NIT <span className="font-mono font-tnum">{datos.nit}</span>
              </>
            ) : null}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {NAVEGACION_LEGAL.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href as Route}
                  className="transicion-ui rounded-[2px] hover:text-texto hover:underline underline-offset-4"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Contenedor>
    </footer>
  )
}
