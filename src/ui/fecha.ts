const FORMATO_LARGO = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeZone: 'America/Bogota',
})

const FORMATO_CORTO = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
})

export function fechaLarga(valor: Date): string {
  return FORMATO_LARGO.format(valor)
}

export function fechaCorta(valor: Date): string {
  return FORMATO_CORTO.format(valor)
}

const FORMATO_MAQUINA = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Bogota',
})

export function fechaMaquina(valor: Date): string {
  return FORMATO_MAQUINA.format(valor)
}
