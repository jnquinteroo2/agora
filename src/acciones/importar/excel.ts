"use server"

import * as XLSX from 'xlsx'
import { z } from 'zod'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { persona } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esqFilaPersona = z.object({
  tipoDocumento: z.enum(['CC', 'TI', 'CE', 'RC', 'PA', 'NIP']),
  numeroDocumento: z.string().min(4).max(20),
  primerNombre: z.string().min(1).max(60),
  segundoNombre: z.string().max(60).optional(),
  primerApellido: z.string().min(1).max(60),
  segundoApellido: z.string().max(60).optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).transform(v => v || undefined),
  genero: z.enum(['M', 'F', 'NB', 'NR']).optional(),
  telefono: z.string().max(20).optional(),
  correo: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  direccion: z.string().max(200).optional(),
  eps: z.string().max(100).optional(),
})

export type PersonaImportInput = z.infer<typeof esqFilaPersona>

export type ResultadoImport = {
  creadas: number
  actualizadas: number
  errores: Array<{ fila: number; mensaje: string }>
}

export function parsearExcelPersonas(buffer: Buffer): PersonaImportInput[] {
  const libro = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const hoja = libro.Sheets[libro.SheetNames[0]!]
  if (!hoja) throw new Error('El archivo no contiene hojas')

  const filas = XLSX.utils.sheet_to_json(hoja, { raw: false, defval: '' }) as Record<string, string>[]

  return filas.map((fila, idx) => {
    const normalizado = {
      tipoDocumento: String(fila['tipo_documento'] ?? fila['tipoDocumento'] ?? '').toUpperCase(),
      numeroDocumento: String(fila['numero_documento'] ?? fila['numeroDocumento'] ?? ''),
      primerNombre: String(fila['primer_nombre'] ?? fila['primerNombre'] ?? ''),
      segundoNombre: String(fila['segundo_nombre'] ?? fila['segundoNombre'] ?? '') || undefined,
      primerApellido: String(fila['primer_apellido'] ?? fila['primerApellido'] ?? ''),
      segundoApellido: String(fila['segundo_apellido'] ?? fila['segundoApellido'] ?? '') || undefined,
      fechaNacimiento: String(fila['fecha_nacimiento'] ?? fila['fechaNacimiento'] ?? ''),
      genero: String(fila['genero'] ?? '').toUpperCase() || undefined,
      telefono: String(fila['telefono'] ?? '') || undefined,
      correo: String(fila['correo'] ?? '') || undefined,
      direccion: String(fila['direccion'] ?? '') || undefined,
      eps: String(fila['eps'] ?? '') || undefined,
    }
    const resultado = esqFilaPersona.safeParse(normalizado)
    if (!resultado.success) {
      throw new Error(`Fila ${idx + 2}: ${resultado.error.issues.map(i => i.message).join('; ')}`)
    }
    return resultado.data
  })
}

const esqImportar = z.object({
  filas: z.array(esqFilaPersona).min(1).max(500),
})

export const importarPersonas = accionSuperadmin
  .schema(esqImportar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        let creadas = 0
        let actualizadas = 0
        const errores: ResultadoImport['errores'] = []

        for (let i = 0; i < parsedInput.filas.length; i++) {
          const fila = parsedInput.filas[i]!
          try {
            const resultado = await tx
              .insert(persona)
              .values(fila)
              .onConflictDoUpdate({
                target: [persona.tipoDocumento, persona.numeroDocumento],
                set: {
                  primerNombre: fila.primerNombre,
                  segundoNombre: fila.segundoNombre,
                  primerApellido: fila.primerApellido,
                  segundoApellido: fila.segundoApellido,
                  fechaNacimiento: fila.fechaNacimiento,
                  genero: fila.genero,
                  telefono: fila.telefono,
                  correo: fila.correo,
                  direccion: fila.direccion,
                  eps: fila.eps,
                },
              })
              .returning()

            if (resultado[0]) creadas++
            else actualizadas++
          } catch (err) {
            errores.push({ fila: i + 2, mensaje: err instanceof Error ? err.message : 'Error desconocido' })
          }
        }

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'importar_personas', entidad: 'persona',
          diferencia: { creadas, actualizadas, errores: errores.length },
        })

        return { creadas, actualizadas, errores }
      }
    )
  })
