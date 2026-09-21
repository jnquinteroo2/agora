const CARDINALES = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
]

export function cardinal(valor: number): string {
  return CARDINALES[valor] ?? String(valor)
}

export function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function listaConjuntiva(elementos: string[]): string {
  return new Intl.ListFormat('es-CO', { type: 'conjunction' }).format(elementos)
}
