import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '../env'

export function crearTokenFormulario(): string {
  const marca = new Date().toISOString()
  const firma = createHmac('sha256', env.BETTER_AUTH_SECRET).update(marca).digest('hex')
  return `${marca}|${firma}`
}

export function validarTokenFormulario(token: string): void {
  const sep = token.indexOf('|')
  if (sep === -1) throw new Error('Token de formulario inválido')

  const marca = token.slice(0, sep)
  const firma = token.slice(sep + 1)

  const firmaEsperada = createHmac('sha256', env.BETTER_AUTH_SECRET).update(marca).digest('hex')

  let valido: boolean
  try {
    valido =
      firma.length === firmaEsperada.length &&
      timingSafeEqual(Buffer.from(firma, 'hex'), Buffer.from(firmaEsperada, 'hex'))
  } catch {
    throw new Error('Token de formulario inválido')
  }

  if (!valido) throw new Error('Token de formulario inválido')

  const servido = new Date(marca).getTime()
  if (isNaN(servido)) throw new Error('Token de formulario inválido')

  const ahora = Date.now()
  if (ahora - servido < 3_000) throw new Error('El formulario se envió demasiado rápido')
  if (ahora - servido > 2 * 60 * 60 * 1_000) throw new Error('El formulario expiró. Recargue la página e intente de nuevo.')
}
