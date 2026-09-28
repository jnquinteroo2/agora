import Link from 'next/link'
import type { Route } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { MagicCard } from './magicui/magic-card'
import { cn } from './cn'

const estiloContenedor =
  'group/tarjeta block rounded-tarjeta shadow-sutil transition-shadow duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-elevado'

export function TarjetaMagica({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(estiloContenedor, className)}>
      <MagicCard className="h-full rounded-tarjeta">
        <div className="flex h-full flex-col gap-3 p-5 sm:p-6">{children}</div>
      </MagicCard>
    </div>
  )
}

export function EnlaceTarjetaMagica({
  href,
  className,
  children,
  ...resto
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'> & {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href as Route}
      className={cn(estiloContenedor, 'presionable relative h-full', className)}
      {...resto}
    >
      <MagicCard className="h-full rounded-tarjeta">
        <div className="flex h-full flex-col gap-3 p-5 pr-12 sm:p-6 sm:pr-14">{children}</div>
      </MagicCard>
      <ArrowUpRight
        aria-hidden="true"
        strokeWidth={1.75}
        className="absolute top-5 right-5 z-50 size-5 text-texto-secundario transition-colors duration-150 group-hover/tarjeta:text-acento-texto sm:top-6 sm:right-6"
      />
    </Link>
  )
}
