import { cn } from './cn'
import { estiloBoton } from './boton'
import { estiloControl } from './campo'

export const campo = cn(estiloControl, 'h-10 text-nota')

export const etiqueta = 'flex flex-col gap-1.5 text-menudo font-medium text-texto'

export const boton = estiloBoton({ tono: 'primario', talla: 'sm' })

export const botonSecundario = estiloBoton({ tono: 'secundario', talla: 'sm' })

export const tarjeta = 'rounded-tarjeta border border-borde p-5 shadow-sutil sm:p-6'

export const tituloTarjeta = 'mb-4 font-titulo text-rubro font-medium text-texto'

export const encabezadoTabla =
  'border-b border-borde-fuerte text-left text-menudo font-semibold text-texto-secundario [&_th]:py-2 [&_th]:pr-3'

export const filaTabla = 'border-b border-borde'
