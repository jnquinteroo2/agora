import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const greca = cva('greca', {
  variants: {
    tono: {
      laurel: 'text-laurel-marca',
      niebla: 'text-borde',
      piedra: 'text-texto-secundario',
      hueso: 'text-superficie/45',
    },
    extension: {
      completa: 'w-full',
      sello: 'w-24',
    },
  },
  defaultVariants: { tono: 'laurel', extension: 'completa' },
})

export function Greca({
  tono,
  extension,
  className,
}: VariantProps<typeof greca> & { className?: string }) {
  return <div aria-hidden="true" className={cn(greca({ tono, extension }), className)} />
}

export function FileteLaurel({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('h-[3px] w-full bg-laurel-marca', className)} />
}
