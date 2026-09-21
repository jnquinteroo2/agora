import { cn } from './cn'

export function Cita({
  children,
  atribucion,
  className,
  talla = 'md',
}: {
  children: React.ReactNode
  atribucion?: React.ReactNode
  className?: string
  talla?: 'sm' | 'md' | 'lg'
}) {
  const escala = {
    sm: 'text-cuerpo',
    md: 'text-guia',
    lg: 'text-rubro',
  }[talla]

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <blockquote className={cn('equilibrado font-display leading-snug text-tinta italic', escala)}>
        {children}
      </blockquote>
      {atribucion ? (
        <figcaption className="versalitas text-menudo text-piedra">{atribucion}</figcaption>
      ) : null}
    </figure>
  )
}
