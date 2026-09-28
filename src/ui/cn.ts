import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const fusionar = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'superficie',
        'superficie-elevada',
        'texto',
        'texto-secundario',
        'borde',
        'borde-fuerte',
        'borde-control',
        'acento',
        'acento-hover',
        'acento-texto',
        'sobre-acento',
        'foco',
        'exito',
        'alerta',
        'error',
        'info',
        'laurel',
        'laurel-marca',
        'velo',
      ],
      text: ['menudo', 'nota', 'cuerpo', 'guia', 'rubro', 'titulo', 'portada', 'lema', 'lambda'],
      spacing: ['aire', 'aire-sm', 'aire-lg', 'margen', 'barra'],
      container: ['medida', 'texto', 'contenido', 'amplio'],
      font: ['titulo', 'interfaz', 'mono', 'sans'],
      tracking: ['versal', 'rotulo'],
      shadow: ['sutil', 'elevado', 'flotante'],
      radius: ['control', 'tarjeta'],
    },
  },
})

export function cn(...clases: ClassValue[]): string {
  return fusionar(clsx(clases))
}
