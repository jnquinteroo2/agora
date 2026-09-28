import { cn } from './cn'
import { MagicCard } from './magicui/magic-card'

export interface PeldanoClei {
  codigo: string
  gradoEquivalente: string
}

export function ordenarCiclos<T extends PeldanoClei>(ciclos: T[]): T[] {
  return [...ciclos].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'))
}

function estiloNivel(indice: number): React.CSSProperties {
  return { ['--nivel' as string]: indice, ['--indice' as string]: indice }
}

export function EscaleraPortada({
  ciclos,
  className,
}: {
  ciclos: PeldanoClei[]
  className?: string
}) {
  const peldanos = ordenarCiclos(ciclos)

  return (
    <ol
      className={cn('aparece-escalonado flex flex-col-reverse items-end', className)}
      style={{ ['--paso' as string]: 'clamp(1.75rem, 6vw, 4.25rem)' }}
    >
      {peldanos.map((peldano, indice) => (
        <li
          key={peldano.codigo}
          style={{
            ...estiloNivel(indice),
            width: `calc(100% - ${indice} * var(--paso))`,
          }}
          className="flex items-baseline justify-between gap-4 border-t-2 border-texto pt-3 pb-4 sm:pb-5"
        >
          <span className="font-mono text-rubro leading-none font-medium text-texto font-tnum sm:text-titulo">
            {peldano.codigo}
          </span>
          <span className="sr-only">equivale a</span>
          <span className="text-nota text-texto-secundario">{peldano.gradoEquivalente}</span>
        </li>
      ))}
    </ol>
  )
}

export function EscaleraCleiCompleta({
  ciclos,
  className,
}: {
  ciclos: PeldanoClei[]
  className?: string
}) {
  const peldanos = ordenarCiclos(ciclos)

  return (
    <ol
      className={cn('aparece-escalonado flex flex-col gap-2', className)}
      style={{ ['--paso' as string]: 'clamp(0.5rem, 2.4vw, 2.75rem)' }}
    >
      {peldanos.map((peldano, indice) => (
        <li
          key={peldano.codigo}
          style={{ ...estiloNivel(indice), marginInlineStart: 'calc(var(--nivel) * var(--paso))' }}
          className="rounded-tarjeta shadow-sutil"
        >
          <MagicCard className="rounded-tarjeta">
            <span className="flex items-center justify-between gap-6 px-5 py-4">
              <span className="flex items-baseline gap-4">
                <span className="w-12 font-mono text-titulo leading-none font-medium text-texto font-tnum">
                  {peldano.codigo}
                </span>
                <span className="sr-only">equivale a</span>
                <span className="font-titulo text-rubro text-texto">
                  {peldano.gradoEquivalente}
                </span>
              </span>
              <span aria-hidden="true" className="hidden items-end gap-0.5 sm:flex">
                {peldanos.map((_, marca) => (
                  <span
                    key={marca}
                    className={cn(
                      'block w-1.5 rounded-[1px]',
                      marca <= indice ? 'bg-texto' : 'bg-borde'
                    )}
                    style={{ height: `${6 + marca * 3}px` }}
                  />
                ))}
              </span>
            </span>
          </MagicCard>
        </li>
      ))}
    </ol>
  )
}
