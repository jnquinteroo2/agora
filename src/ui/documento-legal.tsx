import Link from 'next/link'
import type { Route } from 'next'
import type { VersionDocumento } from '@/src/legal/versiones'
import type { ConfiguracionInstitucion } from '@/src/datos/configuracion-publica'
import { direccionCompleta } from '@/src/datos/configuracion-publica'
import { Contenedor } from './contenedor'
import { Seccion } from './seccion'
import { fechaLarga } from './fecha'
import { cn } from './cn'

export interface ApartadoLegal {
  id: string
  titulo: string
  contenido: React.ReactNode
}

function fechaDeVigencia(version: VersionDocumento): Date {
  return new Date(`${version.vigenteDesde}T12:00:00-05:00`)
}

export function DocumentoLegal({
  migas,
  titulo,
  entrada,
  version,
  apartados,
}: {
  migas: React.ReactNode
  titulo: string
  entrada?: string
  version: VersionDocumento
  apartados: ApartadoLegal[]
}) {
  return (
    <>
      <Seccion aire="md" className="print:py-0">
        <Contenedor ancho="amplio" className="flex flex-col gap-5">
          <div className="print:hidden">{migas}</div>
          <h1 className="equilibrado font-display text-portada font-medium text-tinta">{titulo}</h1>
          {entrada ? (
            <p className="prosa max-w-medida text-guia leading-relaxed text-piedra">{entrada}</p>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 pt-1 text-nota">
            <div className="flex items-baseline gap-2">
              <dt className="text-piedra">Versión</dt>
              <dd className="font-mono font-tnum text-tinta">{version.version}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-piedra">Vigente desde el</dt>
              <dd className="text-tinta">
                <time dateTime={version.vigenteDesde}>{fechaLarga(fechaDeVigencia(version))}</time>
              </dd>
            </div>
          </dl>
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba" className="print:border-0 print:py-6">
        <Contenedor ancho="amplio" className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <nav aria-labelledby="titulo-indice" className="print:hidden lg:col-span-3">
            <div className="flex flex-col gap-4 lg:sticky lg:top-8">
              <h2 id="titulo-indice" className="versalitas text-menudo text-piedra">
                En este documento
              </h2>
              <ol className="flex flex-col border-l border-niebla">
                {apartados.map((apartado) => (
                  <li key={apartado.id}>
                    <a
                      href={`#${apartado.id}`}
                      className="transicion-ui -ml-px block border-l border-transparent py-1.5 pl-4 text-nota leading-snug text-piedra hover:border-tinta hover:text-tinta"
                    >
                      {apartado.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="flex min-w-0 flex-col gap-14 lg:col-span-8 lg:col-start-5 print:gap-8">
            {apartados.map((apartado) => (
              <section
                key={apartado.id}
                id={apartado.id}
                aria-labelledby={`${apartado.id}-titulo`}
                className="flex scroll-mt-8 flex-col gap-5 border-t border-niebla pt-8 first:border-t-0 first:pt-0 print:break-inside-auto"
              >
                <h2
                  id={`${apartado.id}-titulo`}
                  className="equilibrado font-display text-titulo font-medium text-tinta print:break-after-avoid"
                >
                  {apartado.titulo}
                </h2>
                <div className="flex max-w-[62ch] flex-col gap-[1.1em] font-display text-[1.25rem] leading-[1.65] text-tinta print:text-[11pt]">
                  {apartado.contenido}
                </div>
              </section>
            ))}
          </div>
        </Contenedor>
      </Seccion>
    </>
  )
}

export function Parrafo({ children }: { children: React.ReactNode }) {
  return <p className="prosa">{children}</p>
}

export function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 font-display text-rubro leading-snug font-medium text-tinta print:break-after-avoid">
      {children}
    </h3>
  )
}

export function Lista({
  children,
  ordenada = false,
}: {
  children: React.ReactNode
  ordenada?: boolean
}) {
  const Elemento = ordenada ? 'ol' : 'ul'
  return (
    <Elemento
      className={cn(
        'flex flex-col gap-2 pl-6 marker:text-piedra',
        ordenada ? 'list-decimal' : 'list-disc'
      )}
    >
      {children}
    </Elemento>
  )
}

export function Norma({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-[0.8em] text-piedra">({children})</span>
}

export function EnlaceLegal({ href, children }: { href: string; children: React.ReactNode }) {
  const clase =
    'transicion-ui underline decoration-piedra decoration-1 underline-offset-4 hover:decoration-tinta'
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href as Route} className={clase}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={clase}>
      {children}
    </a>
  )
}

export function datosDeContacto(config: ConfiguracionInstitucion | null) {
  const direccion = direccionCompleta(config)
  return [
    direccion
      ? { termino: 'Dirección', valor: <address className="not-italic">{direccion}</address> }
      : null,
    config?.telefono
      ? {
          termino: 'Teléfono',
          valor: (
            <EnlaceLegal href={`tel:${config.telefono.replace(/\s+/g, '')}`}>
              <span className="font-mono font-tnum text-[0.85em]">{config.telefono}</span>
            </EnlaceLegal>
          ),
        }
      : null,
    config?.correo
      ? {
          termino: 'Correo electrónico',
          valor: (
            <EnlaceLegal href={`mailto:${config.correo}`}>
              <span className="break-all">{config.correo}</span>
            </EnlaceLegal>
          ),
        }
      : null,
  ].filter((dato) => dato !== null)
}

export function ListaDeDatos({ datos }: { datos: { termino: string; valor: React.ReactNode }[] }) {
  if (datos.length === 0) return null
  return (
    <dl className="grid gap-x-6 gap-y-3 border-y border-niebla py-5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      {datos.map((dato) => (
        <div key={dato.termino} className="contents">
          <dt className="font-sans text-nota text-piedra sm:pt-1.5">{dato.termino}</dt>
          <dd className="min-w-0">{dato.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
