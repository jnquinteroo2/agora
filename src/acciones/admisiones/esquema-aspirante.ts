import { z } from 'zod'
import { CODIGOS_TIPO_DOCUMENTO } from '../../dominio/documentos'
import { esFechaFutura, esFechaValida, problemasDeContacto } from '../../dominio/admision'

export const esqFormularioAspirante = z
  .object({
    primerNombre: z.string().min(1).max(60),
    segundoNombre: z.string().max(60).optional(),
    primerApellido: z.string().min(1).max(60),
    segundoApellido: z.string().max(60).optional(),
    tipoDocumento: z.enum(CODIGOS_TIPO_DOCUMENTO),
    numeroDocumento: z.string().min(4).max(20),
    fechaNacimiento: z
      .string()
      .refine(esFechaValida, 'Fecha de nacimiento inválida')
      .refine(
        (valor) => !esFechaFutura(valor),
        'La fecha de nacimiento no puede ser posterior a hoy'
      ),
    lugarNacimiento: z.string().max(100).optional(),
    genero: z.enum(['M', 'F', 'NB', 'NR']).optional(),
    cicloId: z.string().uuid(),
    jornadaId: z.string().uuid(),
    telefonoAspirante: z
      .string()
      .trim()
      .regex(/^[\d\s()+-]{7,20}$/)
      .optional(),
    correoAspirante: z.string().email().optional(),
    telefonoAcudiente: z
      .string()
      .trim()
      .regex(/^[\d\s()+-]{7,20}$/)
      .optional(),
    nombreAcudiente: z.string().trim().min(2).max(120).optional(),
    correoAcudiente: z.string().email().optional(),
    autorizacionDatos: z.literal(true, {
      error: 'Debe autorizar el tratamiento de datos',
    }),
    sitio: z.string().optional().default(''),
    formularioServido: z.string().min(1),
  })
  .superRefine((datos, contexto) => {
    for (const problema of problemasDeContacto(datos)) {
      contexto.addIssue({ code: 'custom', path: [problema.campo], message: problema.mensaje })
    }
  })
