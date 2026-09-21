import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const contenedor = cva('mx-auto w-full px-margen', {
  variants: {
    ancho: {
      medida: 'max-w-medida',
      texto: 'max-w-texto',
      contenido: 'max-w-contenido',
      amplio: 'max-w-amplio',
      completo: 'max-w-none',
    },
  },
  defaultVariants: { ancho: 'contenido' },
})

type PropiedadesContenedor = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof contenedor> & {
    como?: 'div' | 'section' | 'header' | 'footer' | 'nav' | 'article'
  }

export function Contenedor({
  ancho,
  como: Elemento = 'div',
  className,
  ...resto
}: PropiedadesContenedor) {
  return <Elemento className={cn(contenedor({ ancho }), className)} {...resto} />
}
