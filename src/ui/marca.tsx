import Image from 'next/image'
import { cn } from './cn'

const ARCHIVOS = {
  color: '/marca/logo-agora.png',
  blanco: '/marca/logo-agora-blanco.png',
  negro: '/marca/logo-agora-negro.png',
  carmin: '/marca/logo-agora-carmin.png',
  escudo: '/marca/escudo-agora-completo.png',
} as const

export type VarianteMarca = keyof typeof ARCHIVOS

export function Marca({
  variante = 'color',
  lado,
  className,
  prioridad = false,
  alt = '',
}: {
  variante?: VarianteMarca
  lado: number
  className?: string
  prioridad?: boolean
  alt?: string
}) {
  return (
    <Image
      src={ARCHIVOS[variante]}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      width={lado}
      height={lado}
      sizes={`${lado}px`}
      priority={prioridad}
      className={cn('shrink-0 select-none', className)}
    />
  )
}

export function EscudoDeVirtudes({
  lado,
  className,
  alt,
}: {
  lado: number
  className?: string
  alt: string
}) {
  return (
    <Image
      src={ARCHIVOS.escudo}
      alt={alt}
      width={lado}
      height={lado}
      sizes={`(max-width: 768px) 60vw, ${lado}px`}
      className={cn('h-auto w-full max-w-full select-none', className)}
    />
  )
}
