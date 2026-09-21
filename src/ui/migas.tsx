import Link from 'next/link'
import type { Route } from 'next'
import { cn } from './cn'
import { JsonLd } from '@/src/seo/json-ld-script'
import { urlAbsoluta } from '@/src/sitio'

export interface Miga {
  etiqueta: string
  href?: string
}

export function Migas({ ruta, className }: { ruta: Miga[]; className?: string }) {
  if (ruta.length === 0) return null

  const lista = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: ruta.map((miga, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: miga.etiqueta,
      ...(miga.href ? { item: urlAbsoluta(miga.href) } : {}),
    })),
  }

  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <JsonLd datos={lista} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-menudo text-piedra">
        {ruta.map((miga, indice) => {
          const esUltima = indice === ruta.length - 1
          return (
            <li key={miga.etiqueta} className="flex items-center gap-2">
              {indice > 0 ? (
                <span aria-hidden="true" className="text-niebla">
                  /
                </span>
              ) : null}
              {miga.href && !esUltima ? (
                <Link
                  href={miga.href as Route}
                  className={cn('transicion-ui versalitas hover:text-tinta')}
                >
                  {miga.etiqueta}
                </Link>
              ) : (
                <span
                  className="versalitas text-tinta"
                  aria-current={esUltima ? 'page' : undefined}
                >
                  {miga.etiqueta}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
