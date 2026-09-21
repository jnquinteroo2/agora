import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const greca = cva('greca', {
  variants: {
    tono: {
      laurel: 'text-laurel',
      niebla: 'text-niebla',
      piedra: 'text-piedra',
      hueso: 'text-hueso/45',
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
  return <div aria-hidden="true" className={cn('h-[3px] w-full bg-laurel', className)} />
}

export function Lambda({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block font-display leading-none select-none', className)}
    >
      Λ
    </span>
  )
}
