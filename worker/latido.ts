import { writeFile } from 'fs/promises'
import type { PgBoss } from 'pg-boss'
import { logger } from '../src/logger'

export const ARCHIVO_LATIDO = process.env['WORKER_LATIDO'] ?? '/tmp/agora-worker-latido'
const INTERVALO_MS = 30_000
const ESPERA_MAXIMA_MS = 10_000

async function conTiempoLimite<T>(promesa: Promise<T>): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error('pg-boss no respondió a tiempo')), ESPERA_MAXIMA_MS)
  })
  try {
    return await Promise.race([promesa, limite])
  } finally {
    clearTimeout(temporizador)
  }
}

export function iniciarLatido(boss: PgBoss, servicio: string): NodeJS.Timeout {
  const latir = async () => {
    try {
      await conTiempoLimite(boss.getQueues())
      await writeFile(ARCHIVO_LATIDO, JSON.stringify({ servicio, momento: Date.now() }))
    } catch (error) {
      logger.warn({ servicio, error: error instanceof Error ? error.message : error }, 'Latido omitido: pg-boss no pudo consultar la base')
    }
  }
  void latir()
  return setInterval(() => void latir(), INTERVALO_MS)
}
