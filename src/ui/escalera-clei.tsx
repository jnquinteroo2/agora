import { cn } from './cn'

export interface PeldanoClei {
  codigo: string
  gradoEquivalente: string
}

export function ordenarCiclos<T extends PeldanoClei>(ciclos: T[]): T[] {
  return [...ciclos].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'))
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
      className={cn('flex flex-col', className)}
      style={{ ['--paso' as string]: 'clamp(0.75rem, 2.6vw, 3rem)' }}
    >
      {peldanos.map((peldano, indice) => (
        <li
          key={peldano.codigo}
          className="border-t border-niebla last:border-b"
          style={{ ['--nivel' as string]: indice }}
        >
          <div className="flex items-baseline justify-between gap-6 py-5">
            <span
              className="flex items-baseline gap-4 sm:gap-8"
              style={{ marginInlineStart: 'calc(var(--nivel) * var(--paso))' }}
            >
              <span aria-hidden="true" className="w-6 shrink-0 border-t border-tinta sm:w-10" />
              <span className="font-display text-titulo leading-none font-medium text-tinta tabular-nums">
                {peldano.codigo}
              </span>
            </span>
            <span className="sr-only">equivale a</span>
            <span className="font-display text-rubro leading-none text-piedra">
              {peldano.gradoEquivalente}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function EscaleraCleiCompacta({
  ciclos,
  className,
}: {
  ciclos: PeldanoClei[]
  className?: string
}) {
  const peldanos = ordenarCiclos(ciclos)

  return (
    <ol
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-0 sm:border-b sm:border-niebla',
        className
      )}
      style={{
        ['--paso-x' as string]: 'clamp(1.25rem, 7vw, 2.5rem)',
        ['--paso-y' as string]: 'clamp(0.875rem, 1.8vw, 1.75rem)',
      }}
    >
      {peldanos.map((peldano, indice) => (
        <li
          key={peldano.codigo}
          className="relative ms-[calc(var(--nivel)*var(--paso-x))] flex w-[min(11rem,55%)] flex-col gap-1 border-t-2 border-tinta pt-2 sm:ms-0 sm:w-auto sm:min-w-0 sm:flex-1 sm:pr-3 sm:pb-[calc(1.25rem+var(--nivel)*var(--paso-y))]"
          style={{ ['--nivel' as string]: indice }}
        >
          {indice > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 left-0 hidden h-[calc(var(--paso-y)+2px)] w-0.5 bg-tinta sm:block"
            />
          ) : null}
          <span className="pt-2 font-display text-rubro leading-none font-medium text-tinta tabular-nums sm:ps-3">
            {peldano.codigo}
          </span>
          <span className="sr-only">equivale a</span>
          <span className="text-menudo text-piedra sm:ps-3">{peldano.gradoEquivalente}</span>
        </li>
      ))}
    </ol>
  )
}
