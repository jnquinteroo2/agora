import Link from 'next/link'
import { NAVEGACION_PRINCIPAL } from './navegacion'
import { NavegacionPrincipal } from './navegacion-principal'
import { MenuMovil } from './menu-movil'
import { Contenedor } from './contenedor'
import { MarcaAdaptable } from './marca'
import { EnlaceBoton } from './boton'

export function EncabezadoSitio({
  nombreCorto,
  lugar,
  acciones,
}: {
  nombreCorto: string
  lugar: string | null
  acciones?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-[var(--capa-pegajosa)] border-b border-borde bg-superficie/90 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-superficie print:static print:hidden">
      <Contenedor ancho="amplio" className="flex h-16 items-center gap-4 lg:h-[4.5rem]">
        <Link
          href="/inicio"
          className="transicion-ui -ml-1 flex items-center gap-3 rounded-control p-1 hover:opacity-85"
        >
          <MarcaAdaptable lado={40} prioridad />
          <span className="flex flex-col leading-none">
            <span className="font-titulo text-[1.1875rem] font-medium text-texto">
              {nombreCorto}
            </span>
            {lugar ? <span className="pt-1 text-menudo text-texto-secundario">{lugar}</span> : null}
          </span>
        </Link>

        <NavegacionPrincipal enlaces={NAVEGACION_PRINCIPAL} className="ml-auto hidden xl:block" />

        <div className="ml-auto flex items-center gap-1.5 xl:ml-3">
          {acciones}
          <EnlaceBoton href="/login" tono="secundario" talla="sm" className="hidden sm:inline-flex">
            Ingresar
          </EnlaceBoton>
          <MenuMovil enlaces={NAVEGACION_PRINCIPAL} nombreColegio={nombreCorto} />
        </div>
      </Contenedor>
    </header>
  )
}
