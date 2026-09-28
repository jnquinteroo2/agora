import {
  obtenerConfiguracion,
  nombreCorto,
  nombreLegal,
  direccionCompleta,
  ubicacion,
} from '@/src/datos/configuracion-publica'
import { EncabezadoSitio } from './encabezado-sitio'
import { PieSitio } from './pie-sitio'
import { SelectorDeTema } from './selector-de-tema'

export async function MarcoPublico({ children }: { children: React.ReactNode }) {
  const config = await obtenerConfiguracion()

  return (
    <div className="flex min-h-dvh flex-col bg-superficie text-texto print:min-h-0 print:bg-transparent">
      <a
        href="#contenido"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[var(--capa-aviso)] focus-visible:rounded-control focus-visible:bg-texto focus-visible:px-4 focus-visible:py-2.5 focus-visible:text-nota focus-visible:font-medium focus-visible:text-superficie"
      >
        Saltar al contenido
      </a>

      <EncabezadoSitio
        nombreCorto={nombreCorto(config)}
        lugar={ubicacion(config)}
        acciones={<SelectorDeTema />}
      />

      <main id="contenido" tabIndex={-1} className="flex-1 focus-visible:outline-none">
        {children}
      </main>

      <PieSitio
        datos={{
          nombreLegal: nombreLegal(config),
          lema: config?.lema ?? null,
          nit: config?.nit ?? null,
          direccion: direccionCompleta(config),
          telefono: config?.telefono ?? null,
          correo: config?.correo ?? null,
        }}
      />
    </div>
  )
}
