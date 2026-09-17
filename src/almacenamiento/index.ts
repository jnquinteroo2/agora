import { createReadStream, createWriteStream } from 'fs'
import { mkdir, unlink, access } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { env } from '../env'

export type Bucket = 'escudo' | 'firmas' | 'galeria' | 'soportes' | 'pdf' | 'temp'

export interface OpcionesGuardar {
  bucket: Bucket
  nombre: string
  datos: Buffer
  mime: string
}

export interface Almacenamiento {
  guardar(opciones: OpcionesGuardar): Promise<string>
  leer(bucket: Bucket, nombre: string): Promise<Buffer>
  borrar(bucket: Bucket, nombre: string): Promise<void>
  existe(bucket: Bucket, nombre: string): Promise<boolean>
  rutaFisica(bucket: Bucket, nombre: string): string
}

class AlmacenamientoLocal implements Almacenamiento {
  private base: string

  constructor(base: string) {
    this.base = base
  }

  rutaFisica(bucket: Bucket, nombre: string): string {
    return join(this.base, bucket, nombre)
  }

  async guardar({ bucket, nombre, datos }: OpcionesGuardar): Promise<string> {
    const dir = join(this.base, bucket)
    await mkdir(dir, { recursive: true })
    const ruta = join(dir, nombre)
    await import('fs/promises').then((fs) => fs.writeFile(ruta, datos))
    return nombre
  }

  async leer(bucket: Bucket, nombre: string): Promise<Buffer> {
    const ruta = this.rutaFisica(bucket, nombre)
    const fs = await import('fs/promises')
    return fs.readFile(ruta)
  }

  async borrar(bucket: Bucket, nombre: string): Promise<void> {
    const ruta = this.rutaFisica(bucket, nombre)
    await unlink(ruta)
  }

  async existe(bucket: Bucket, nombre: string): Promise<boolean> {
    const ruta = this.rutaFisica(bucket, nombre)
    try {
      await access(ruta)
      return true
    } catch {
      return false
    }
  }
}

export const almacenamiento: Almacenamiento = new AlmacenamientoLocal(env.STORAGE_PATH)

export function nombreSeguro(extension: string): string {
  const { randomUUID } = require('crypto')
  return `${randomUUID()}.${extension}`
}

export const TIPOS_PERMITIDOS = {
  imagen: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  documento: ['application/pdf'],
  soporte: ['application/pdf', 'image/jpeg', 'image/png'],
} as const

export const BYTES_MAGICOS: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
}

export function verificarBytesMagicos(datos: Buffer, mime: string): boolean {
  const firmas = BYTES_MAGICOS[mime]
  if (!firmas) return false
  return firmas.some((firma) =>
    firma.every((byte, i) => datos[i] === byte)
  )
}

export const LIMITES_TAMANO: Record<string, number> = {
  imagen: 5 * 1024 * 1024,
  soporte: 10 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
}
