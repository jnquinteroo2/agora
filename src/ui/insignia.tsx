import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const insignia = cva(
  'inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-menudo font-medium whitespace-nowrap [&_svg]:size-3.5',
  {
    variants: {
      tono: {
        neutra: 'border-borde-control text-texto-secundario',
        acento: 'border-acento-texto/40 text-acento-texto',
        exito: 'border-exito/40 text-exito',
        alerta: 'border-alerta/40 text-alerta',
        error: 'border-error/40 text-error',
        info: 'border-info/40 text-info',
      },
    },
    defaultVariants: { tono: 'neutra' },
  }
)

export function Insignia({
  tono,
  className,
  ...resto
}: React.ComponentPropsWithoutRef<'span'> & VariantProps<typeof insignia>) {
  return <span className={cn(insignia({ tono }), className)} {...resto} />
}

export function Cifra({ className, ...resto }: React.ComponentPropsWithoutRef<'span'>) {
  return <span className={cn('font-mono font-tnum', className)} {...resto} />
}
