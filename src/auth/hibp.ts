import { createHash } from 'crypto'
import { logger } from '../logger'

export async function contraseñaComprometida(password: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
    const prefijo = sha1.slice(0, 5)
    const sufijo = sha1.slice(5)

    const controlador = new AbortController()
    const timeout = setTimeout(() => controlador.abort(), 3_000)

    const respuesta = await fetch(`https://api.pwnedpasswords.com/range/${prefijo}`, {
      signal: controlador.signal,
      headers: { 'Add-Padding': 'true' },
    }).finally(() => clearTimeout(timeout))

    if (!respuesta.ok) {
      logger.warn({ status: respuesta.status }, 'HIBP respondió con error, se permite la contraseña (fail-open)')
      return false
    }

    const cuerpo = await respuesta.text()
    return cuerpo.split('\n').some((linea) => linea.trim().split(':')[0] === sufijo)
  } catch (error) {
    logger.warn({ error }, 'No se pudo verificar la contraseña contra HIBP, se permite (fail-open)')
    return false
  }
}
