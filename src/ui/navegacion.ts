export interface EnlaceSitio {
  href: string
  etiqueta: string
}

export const NAVEGACION_PRINCIPAL: EnlaceSitio[] = [
  { href: '/inicio', etiqueta: 'Inicio' },
  { href: '/institucion', etiqueta: 'Institución' },
  { href: '/modelo-clei', etiqueta: 'Modelo CLEI' },
  { href: '/oferta', etiqueta: 'Oferta educativa' },
  { href: '/admisiones', etiqueta: 'Admisiones' },
  { href: '/galeria', etiqueta: 'Galería' },
  { href: '/blog', etiqueta: 'Noticias' },
  { href: '/aliados', etiqueta: 'Aliados' },
  { href: '/contacto', etiqueta: 'Contacto' },
]

export const NAVEGACION_LEGAL: EnlaceSitio[] = [
  { href: '/privacidad', etiqueta: 'Tratamiento de datos personales' },
  { href: '/cookies', etiqueta: 'Cookies' },
  { href: '/terminos', etiqueta: 'Términos de uso' },
  { href: '/accesibilidad', etiqueta: 'Accesibilidad' },
]
