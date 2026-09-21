import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const seccion = cva('', {
  variants: {
    aire: {
      sm: 'py-aire-sm',
      md: 'py-aire',
      lg: 'py-aire-lg',
      ninguno: '',
    },
    filete: {
      arriba: 'border-t border-niebla',
      ninguno: '',
    },
  },
  defaultVariants: { aire: 'md', filete: 'ninguno' },
})

type PropiedadesSeccion = React.ComponentPropsWithoutRef<'section'> & VariantProps<typeof seccion>

export function Seccion({ aire, filete, className, ...resto }: PropiedadesSeccion) {
  return <section className={cn(seccion({ aire, filete }), className)} {...resto} />
}

export function TituloDeSeccion({ className, ...resto }: React.ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn('equilibrado font-display text-titulo font-medium text-tinta', className)}
      {...resto}
    />
  )
}

export function EncabezadoDePagina({
  titulo,
  entrada,
  migas,
  acciones,
  idTitulo,
  refTitulo,
  className,
}: {
  titulo: React.ReactNode
  idTitulo?: string
  refTitulo?: React.Ref<HTMLHeadingElement>
  entrada?: React.ReactNode
  migas?: React.ReactNode
  acciones?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-5', className)}>
      {migas}
      <h1
        id={idTitulo}
        ref={refTitulo}
        tabIndex={refTitulo ? -1 : undefined}
        className="equilibrado font-display text-portada font-medium text-tinta focus-visible:outline-none"
      >
        {titulo}
      </h1>
      {entrada ? (
        <p className="prosa max-w-medida text-guia leading-relaxed text-piedra">{entrada}</p>
      ) : null}
      {acciones ? <div className="flex flex-wrap items-center gap-4 pt-1">{acciones}</div> : null}
    </header>
  )
}
