export const EDAD_DE_MAYORIA = 18

const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/

export function fechaDeHoyEnBogota(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

export function esFechaValida(fecha: string): boolean {
  const partes = FORMATO_FECHA.exec(fecha)
  if (!partes) return false
  const [, anio, mes, dia] = partes.map(Number)
  const d = new Date(Date.UTC(anio!, mes! - 1, dia!))
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes! - 1 && d.getUTCDate() === dia
}

export function esFechaFutura(fecha: string, ahora: Date = new Date()): boolean {
  return esFechaValida(fecha) && fecha > fechaDeHoyEnBogota(ahora)
}

function fechaDeMayoria(fechaNacimiento: string): string {
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number)
  const cumple = new Date(Date.UTC(anio! + EDAD_DE_MAYORIA, mes! - 1, dia!))
  return cumple.toISOString().slice(0, 10)
}

export function esMenorDeEdad(fechaNacimiento: string, ahora: Date = new Date()): boolean | null {
  if (!esFechaValida(fechaNacimiento) || esFechaFutura(fechaNacimiento, ahora)) return null
  return fechaDeHoyEnBogota(ahora) < fechaDeMayoria(fechaNacimiento)
}

export function requiereAcudiente(fechaNacimiento: string, ahora: Date = new Date()): boolean {
  return esMenorDeEdad(fechaNacimiento, ahora) !== false
}

export function requiereTelefonoDelAspirante(
  fechaNacimiento: string,
  ahora: Date = new Date()
): boolean {
  return esMenorDeEdad(fechaNacimiento, ahora) === false
}

export interface ContactosDeAdmision {
  fechaNacimiento: string
  nombreAcudiente?: string
  telefonoAcudiente?: string
  telefonoAspirante?: string
}

export interface ProblemaDeContacto {
  campo: 'nombreAcudiente' | 'telefonoAcudiente' | 'telefonoAspirante'
  mensaje: string
}

export function problemasDeContacto(
  datos: ContactosDeAdmision,
  ahora: Date = new Date()
): ProblemaDeContacto[] {
  const problemas: ProblemaDeContacto[] = []
  if (requiereAcudiente(datos.fechaNacimiento, ahora)) {
    if (!datos.nombreAcudiente?.trim()) {
      problemas.push({
        campo: 'nombreAcudiente',
        mensaje: 'El aspirante es menor de 18 años: escriba el nombre completo del acudiente.',
      })
    }
    if (!datos.telefonoAcudiente?.trim()) {
      problemas.push({
        campo: 'telefonoAcudiente',
        mensaje: 'El aspirante es menor de 18 años: escriba el teléfono del acudiente.',
      })
    }
  }
  if (requiereTelefonoDelAspirante(datos.fechaNacimiento, ahora) && !datos.telefonoAspirante?.trim()) {
    problemas.push({
      campo: 'telefonoAspirante',
      mensaje: 'Escriba un teléfono de contacto del aspirante.',
    })
  }
  return problemas
}
