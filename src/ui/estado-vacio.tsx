import { Greca } from './greca'
import { cn } from './cn'

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  className,
}: {
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  accion?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-start gap-4 border-t border-niebla py-aire-sm', className)}
    >
      <Greca extension="sello" tono="niebla" />
      <p className="font-display text-rubro text-tinta">{titulo}</p>
      {descripcion ? (
        <p className="prosa max-w-medida text-nota leading-relaxed text-piedra">{descripcion}</p>
      ) : null}
      {accion}
    </div>
  )
}
