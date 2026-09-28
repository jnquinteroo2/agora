import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const tarjeta = cva('relative rounded-tarjeta border', {
  variants: {
    tono: {
      elevada: 'border-borde bg-superficie-elevada shadow-sutil',
      plana: 'border-borde bg-superficie',
    },
    relleno: {
      ninguno: '',
      sm: 'p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    },
  },
  defaultVariants: { tono: 'elevada', relleno: 'md' },
})

export type VariantesTarjeta = VariantProps<typeof tarjeta>

export function Tarjeta({
  tono,
  relleno,
  className,
  como: Elemento = 'div',
  ...resto
}: React.ComponentPropsWithoutRef<'div'> &
  VariantesTarjeta & { como?: 'div' | 'article' | 'section' }) {
  return <Elemento className={cn(tarjeta({ tono, relleno }), className)} {...resto} />
}

export function TituloDeTarjeta({
  como: Elemento = 'h3',
  className,
  ...resto
}: React.ComponentPropsWithoutRef<'h3'> & { como?: 'h2' | 'h3' | 'h4' | 'p' }) {
  return (
    <Elemento
      className={cn('font-titulo text-rubro font-medium text-texto', className)}
      {...resto}
    />
  )
}

export function DescripcionDeTarjeta({ className, ...resto }: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      className={cn('prosa text-nota leading-relaxed text-texto-secundario', className)}
      {...resto}
    />
  )
}
