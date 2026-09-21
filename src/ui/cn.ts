import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const fusionar = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'tinta',
        'hueso',
        'papel',
        'carmin',
        'carmin-hondo',
        'laurel',
        'piedra',
        'niebla',
        'exito',
        'alerta',
        'error',
        'info',
      ],
      text: ['menudo', 'nota', 'cuerpo', 'guia', 'rubro', 'titulo', 'portada', 'lema', 'lambda'],
      spacing: ['aire', 'aire-sm', 'aire-lg', 'margen'],
      container: ['medida', 'texto', 'contenido', 'amplio'],
      font: ['display', 'interfaz', 'mono'],
      tracking: ['versal', 'rotulo'],
      shadow: ['sutil', 'elevado'],
    },
  },
})

export function cn(...clases: ClassValue[]): string {
  return fusionar(clsx(clases))
}
