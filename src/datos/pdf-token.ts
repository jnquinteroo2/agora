import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '../env'

const VIGENCIA_MS = 5 * 60 * 1000
const SIN_PERIODO = '-'

export interface IdentidadSolicitante {
  id: string
  rol: 'superadmin' | 'docente'
}

export interface DatosTokenPDF {
  tipo: string
  entidadId: string
  periodoId?: string
  solicitante: IdentidadSolicitante
}

function construirPayload(datos: DatosTokenPDF, expira: number): string {
  return [
    datos.tipo,
    datos.entidadId,
    datos.periodoId ?? SIN_PERIODO,
    datos.solicitante.id,
    datos.solicitante.rol,
    expira,
  ].join(':')
}

export function crearTokenRenderPDF(datos: DatosTokenPDF): string {
  const expira = Date.now() + VIGENCIA_MS
  const payload = construirPayload(datos, expira)
  const firma = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex')
  return `${payload}|${firma}`
}

export function validarTokenRenderPDF(
  token: string,
  esperado: { tipo: string; entidadId: string; periodoId?: string }
): IdentidadSolicitante {
  const sep = token.lastIndexOf('|')
  if (sep === -1) throw new Error('Token de renderizado inválido')

  const payload = token.slice(0, sep)
  const firma = token.slice(sep + 1)
  const firmaEsperada = createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex')

  let valido: boolean
  try {
    valido =
      firma.length === firmaEsperada.length &&
      timingSafeEqual(Buffer.from(firma, 'hex'), Buffer.from(firmaEsperada, 'hex'))
  } catch {
    throw new Error('Token de renderizado inválido')
  }
  if (!valido) throw new Error('Token de renderizado inválido')

  const partes = payload.split(':')
  if (partes.length !== 6) throw new Error('Token de renderizado inválido')

  const [tipoToken, entidadIdToken, periodoIdToken, solicitanteId, solicitanteRol, expiraTexto] = partes as [
    string, string, string, string, string, string,
  ]

  if (tipoToken !== esperado.tipo || entidadIdToken !== esperado.entidadId) {
    throw new Error('El token no corresponde a este documento')
  }
  if (periodoIdToken !== (esperado.periodoId ?? SIN_PERIODO)) {
    throw new Error('El token no corresponde a este periodo')
  }
  if (solicitanteRol !== 'superadmin' && solicitanteRol !== 'docente') {
    throw new Error('Token de renderizado inválido')
  }

  const expira = Number(expiraTexto)
  if (!Number.isFinite(expira) || Date.now() > expira) {
    throw new Error('El token de renderizado expiró')
  }

  return { id: solicitanteId, rol: solicitanteRol }
}
