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
      arriba: 'border-t border-borde',
      ninguno: '',
    },
    fondo: {
      base: '',
      elevado: 'bg-superficie-elevada',
    },
  },
  defaultVariants: { aire: 'md', filete: 'ninguno', fondo: 'base' },
})

type PropiedadesSeccion = React.ComponentPropsWithoutRef<'section'> & VariantProps<typeof seccion>

export function Seccion({ aire, filete, fondo, className, ...resto }: PropiedadesSeccion) {
  return <section className={cn(seccion({ aire, filete, fondo }), className)} {...resto} />
}

export function TituloDeSeccion({ className, ...resto }: React.ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn('equilibrado font-titulo text-titulo font-medium text-texto', className)}
      {...resto}
    />
  )
}

export function EntradaDeSeccion({ className, ...resto }: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      className={cn(
        'prosa max-w-medida text-cuerpo leading-relaxed text-texto-secundario',
        className
      )}
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
        className="equilibrado max-w-[22ch] font-titulo text-portada font-medium text-texto focus-visible:outline-none"
      >
        {titulo}
      </h1>
      {entrada ? (
        <p className="prosa max-w-medida text-guia text-texto-secundario">{entrada}</p>
      ) : null}
      {acciones ? <div className="flex flex-wrap items-center gap-3 pt-1">{acciones}</div> : null}
    </header>
  )
}
