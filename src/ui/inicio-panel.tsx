import type { LucideIcon } from 'lucide-react'
import { Clock } from 'lucide-react'
import { obtenerSesion } from '@/src/auth/sesion'
import { EnlaceTarjetaMagica } from './tarjeta-magica'
import { Insignia } from './insignia'
import { cn } from './cn'

export interface AccesoDePanel {
  href?: string
  titulo: string
  descripcion: string
  icono: LucideIcon
}

function saludoSegunHora(): string {
  const hora = Number(
    new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Bogota',
    }).format(new Date())
  )
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export async function EncabezadoDeInicio({
  perfil,
  descripcion,
  extra,
}: {
  perfil: string
  descripcion: React.ReactNode
  extra?: React.ReactNode
}) {
  const sesion = await obtenerSesion()
  const nombre = sesion?.user?.name?.trim().split(/\s+/)[0]
  const saludo = saludoSegunHora()

  return (
    <header className="flex flex-col gap-3">
      <p className="text-nota font-medium text-texto-secundario">{perfil}</p>
      <h1 className="equilibrado font-titulo text-portada font-medium text-texto">
        {nombre ? `${saludo}, ${nombre}` : saludo}
      </h1>
      <p className="prosa max-w-medida text-guia text-texto-secundario">{descripcion}</p>
      {extra}
    </header>
  )
}

function ContenidoDeAcceso({ acceso, proximo }: { acceso: AccesoDePanel; proximo: boolean }) {
  const Icono = acceso.icono
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-10 items-center justify-center rounded-control border border-borde text-texto-secundario"
        >
          <Icono className="size-5" strokeWidth={1.75} />
        </span>
        {proximo ? (
          <Insignia>
            <Clock aria-hidden="true" strokeWidth={1.75} />
            Disponible pronto
          </Insignia>
        ) : null}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-titulo text-rubro font-medium text-texto">{acceso.titulo}</span>
        <span className="prosa text-nota text-texto-secundario">{acceso.descripcion}</span>
      </span>
      {proximo ? (
        <span className="mt-auto border-t border-dashed border-borde-control pt-3 text-menudo text-texto-secundario">
          Esta sección estará disponible pronto.
        </span>
      ) : null}
    </>
  )
}

export function AccesosRapidos({
  titulo = 'Accesos rápidos',
  accesos,
}: {
  titulo?: string
  accesos: AccesoDePanel[]
}) {
  return (
    <section aria-labelledby="titulo-accesos" className="flex flex-col gap-4">
      <h2 id="titulo-accesos" className="font-titulo text-rubro font-medium text-texto">
        {titulo}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accesos.map((acceso, indice) => (
          <li
            key={acceso.titulo}
            style={{ ['--indice' as string]: indice }}
            className={
              indice === accesos.length - 1
                ? cn(
                    accesos.length % 2 === 1 && 'sm:col-span-2 xl:col-span-1',
                    accesos.length % 3 === 1 && 'xl:col-span-3',
                    accesos.length % 3 === 2 && 'xl:col-span-2'
                  )
                : undefined
            }
          >
            {acceso.href ? (
              <EnlaceTarjetaMagica href={acceso.href}>
                <ContenidoDeAcceso acceso={acceso} proximo={false} />
              </EnlaceTarjetaMagica>
            ) : (
              <div className="flex h-full flex-col gap-3 rounded-tarjeta border border-dashed border-borde-control p-5 sm:p-6">
                <ContenidoDeAcceso acceso={acceso} proximo />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
