import { cn } from './cn'

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  icono,
  como: Titulo = 'p',
  className,
}: {
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  accion?: React.ReactNode
  icono?: React.ReactNode
  como?: 'p' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-4 rounded-tarjeta border border-dashed border-borde-control bg-superficie p-6 sm:p-8',
        className
      )}
    >
      <PeldanosDecorativos />
      {icono ? (
        <span aria-hidden="true" className="text-texto-secundario [&_svg]:size-6">
          {icono}
        </span>
      ) : null}
      <Titulo className="font-titulo text-rubro font-medium text-texto">{titulo}</Titulo>
      {descripcion ? (
        <p className="prosa max-w-medida text-nota leading-relaxed text-texto-secundario">
          {descripcion}
        </p>
      ) : null}
      {accion}
    </div>
  )
}

function PeldanosDecorativos() {
  return (
    <span aria-hidden="true" className="flex items-end gap-0.5">
      {[0, 1, 2, 3].map((nivel) => (
        <span
          key={nivel}
          className="block w-2 rounded-[1px] bg-borde-control"
          style={{ height: `${5 + nivel * 4}px` }}
        />
      ))}
    </span>
  )
}
