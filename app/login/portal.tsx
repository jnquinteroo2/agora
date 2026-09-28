import { Suspense } from 'react'
import { Tarjeta } from '@/src/ui/tarjeta'
import { FormularioLogin } from './formulario'

export function PortalDeAcceso({ keycloak }: { keycloak: boolean }) {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-14">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <h1 className="equilibrado font-titulo text-portada font-medium text-texto">
          Portal de acceso
        </h1>
        <p className="prosa max-w-[52ch] text-guia text-texto-secundario">
          Ingrese a la plataforma académica y administrativa con la cuenta que le entregó el
          colegio.
        </p>
      </div>

      <div className="lg:col-span-5 lg:col-start-8">
        <Tarjeta relleno="lg">
          <Suspense
            fallback={<p className="text-nota text-texto-secundario">Cargando el formulario…</p>}
          >
            <FormularioLogin keycloak={keycloak} />
          </Suspense>
        </Tarjeta>
      </div>
    </div>
  )
}
