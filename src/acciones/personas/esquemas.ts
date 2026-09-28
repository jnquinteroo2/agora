import { z } from 'zod'
import { CODIGOS_TIPO_DOCUMENTO } from '../../dominio/documentos'

export const esqPersona = z.object({
  tipoDocumento: z.enum(CODIGOS_TIPO_DOCUMENTO),
  numeroDocumento: z.string().min(4).max(20),
  primerNombre: z.string().min(1).max(60),
  segundoNombre: z.string().max(60).optional(),
  primerApellido: z.string().min(1).max(60),
  segundoApellido: z.string().max(60).optional(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  lugarNacimiento: z.string().max(100).optional(),
  genero: z.enum(['M', 'F', 'NB', 'NR']).optional(),
  telefono: z.string().max(20).optional(),
  correo: z.string().email().optional(),
  direccion: z.string().max(200).optional(),
  eps: z.string().max(100).optional(),
})
