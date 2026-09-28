import Link from 'next/link'
import type { Route } from 'next'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

export const estiloBoton = cva(
  'presionable inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-[1.125em] [&_svg]:shrink-0',
  {
    variants: {
      tono: {
        primario: 'bg-acento text-sobre-acento shadow-sutil hover:bg-acento-hover',
        secundario:
          'border border-borde-fuerte bg-transparent text-texto hover:bg-texto hover:text-superficie',
        fantasma:
          'border border-transparent bg-transparent text-texto-secundario hover:border-borde hover:text-texto',
        claro:
          'border border-superficie/40 bg-transparent text-superficie hover:border-superficie hover:bg-superficie hover:text-texto',
        peligro:
          'border border-error/60 bg-transparent text-error hover:bg-error hover:text-superficie',
      },
      talla: {
        sm: 'h-9 px-3 text-nota',
        md: 'h-11 px-5 text-nota',
        lg: 'h-12 px-6 text-cuerpo',
        icono: 'size-11 p-0',
      },
    },
    defaultVariants: { tono: 'primario', talla: 'md' },
  }
)

export type VariantesBoton = VariantProps<typeof estiloBoton>

export function Boton({
  tono,
  talla,
  className,
  type = 'button',
  ...resto
}: React.ComponentPropsWithoutRef<'button'> & VariantesBoton) {
  return <button type={type} className={cn(estiloBoton({ tono, talla }), className)} {...resto} />
}

export function EnlaceBoton({
  href,
  tono,
  talla,
  className,
  ...resto
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'> & VariantesBoton & { href: string }) {
  return (
    <Link href={href as Route} className={cn(estiloBoton({ tono, talla }), className)} {...resto} />
  )
}

export function EnlaceSubrayado({
  href,
  className,
  ...resto
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'> & { href: string }) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'transicion-ui rounded-[2px] font-medium text-texto underline decoration-borde-control decoration-1 underline-offset-[5px] hover:text-acento-texto hover:decoration-acento-texto',
        className
      )}
      {...resto}
    />
  )
}
