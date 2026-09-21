import Link from 'next/link'
import type { Route } from 'next'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const boton = cva(
  'transicion-ui inline-flex items-center justify-center gap-2 rounded-sm text-nota font-medium whitespace-nowrap active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      tono: {
        primario: 'bg-carmin text-hueso hover:bg-carmin-hondo',
        secundario: 'border border-tinta bg-transparent text-tinta hover:bg-tinta hover:text-hueso',
        fantasma: 'bg-transparent text-piedra hover:text-tinta',
        claro:
          'border border-hueso/35 bg-transparent text-hueso hover:border-hueso hover:bg-hueso hover:text-tinta',
      },
      talla: {
        sm: 'h-9 px-3',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-cuerpo',
      },
    },
    defaultVariants: { tono: 'primario', talla: 'md' },
  }
)

type VariantesBoton = VariantProps<typeof boton>

export function Boton({
  tono,
  talla,
  className,
  type = 'button',
  ...resto
}: React.ComponentPropsWithoutRef<'button'> & VariantesBoton) {
  return <button type={type} className={cn(boton({ tono, talla }), className)} {...resto} />
}

export function EnlaceBoton({
  href,
  tono,
  talla,
  className,
  ...resto
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'> & VariantesBoton & { href: string }) {
  return <Link href={href as Route} className={cn(boton({ tono, talla }), className)} {...resto} />
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
        'transicion-ui underline decoration-niebla decoration-1 underline-offset-4 hover:decoration-carmin',
        className
      )}
      {...resto}
    />
  )
}
