import pino from 'pino'
import { env } from './env'

const PATRONES_PII = [
  /\b\d{6,10}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b3\d{9}\b/g,
  /("password"|"contrasena"|"token"|"secret")["\s:]+[^\s,}]+/gi,
]

function redactarPII(valor: string): string {
  let resultado = valor
  for (const patron of PATRONES_PII) {
    resultado = resultado.replace(patron, '[REDACTADO]')
  }
  return resultado
}

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
  },
  redact: {
    paths: ['*.password', '*.contrasena', '*.token', '*.secret', '*.authorization'],
    censor: '[REDACTADO]',
  },
  hooks: {
    logMethod(args, method) {
      if (typeof args[0] === 'string') {
        args[0] = redactarPII(args[0])
      }
      method.apply(this, args)
    },
  },
})
