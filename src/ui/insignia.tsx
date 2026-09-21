import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const insignia = cva(
  'versalitas inline-flex items-center rounded-sm border px-2 py-0.5 text-menudo font-medium',
  {
    variants: {
      tono: {
        neutra: 'border-niebla text-piedra',
        tinta: 'border-tinta text-tinta',
        laurel: 'border-laurel text-carmin-hondo',
        clara: 'border-hueso/30 text-hueso/80',
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
