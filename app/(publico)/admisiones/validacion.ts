import { z } from 'zod'
import { CODIGOS_TIPO_DOCUMENTO } from '@/src/dominio/documentos'
import { esFechaFutura, problemasDeContacto } from '@/src/dominio/admision'

z.config({ jitless: true })

const opcional = (esquema: z.ZodType<string>) =>
  z.preprocess((valor) => (valor === '' ? undefined : valor), esquema.optional())

const telefono = z
  .string()
  .trim()
  .regex(/^[\d\s()+-]{7,20}$/, 'Escriba un teléfono de 7 a 20 dígitos.')

export const esquemaCliente = z
  .object({
    primerNombre: z
      .string()
      .trim()
      .min(1, 'Escriba el primer nombre.')
      .max(60, 'El primer nombre admite hasta 60 caracteres.'),
    segundoNombre: opcional(z.string().max(60, 'El segundo nombre admite hasta 60 caracteres.')),
    primerApellido: z
      .string()
      .trim()
      .min(1, 'Escriba el primer apellido.')
      .max(60, 'El primer apellido admite hasta 60 caracteres.'),
    segundoApellido: opcional(
      z.string().max(60, 'El segundo apellido admite hasta 60 caracteres.')
    ),
    tipoDocumento: z.enum(CODIGOS_TIPO_DOCUMENTO, {
      error: 'Elija el tipo de documento.',
    }),
    numeroDocumento: z
      .string()
      .trim()
      .min(4, 'El número de documento debe tener al menos 4 caracteres.')
      .max(20, 'El número de documento admite hasta 20 caracteres.'),
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Indique la fecha de nacimiento.')
      .refine((valor) => !esFechaFutura(valor), {
        message: 'La fecha de nacimiento no puede ser posterior a hoy.',
      }),
    lugarNacimiento: opcional(
      z.string().max(100, 'El lugar de nacimiento admite hasta 100 caracteres.')
    ),
    genero: z.preprocess(
      (valor) => (valor === '' ? undefined : valor),
      z.enum(['M', 'F', 'NB', 'NR']).optional()
    ),
    cicloId: z.uuid({ error: 'Elija el ciclo al que aspira.' }),
    jornadaId: z.uuid({ error: 'Elija la jornada.' }),
    telefonoAspirante: opcional(telefono),
    correoAspirante: opcional(z.email('Escriba un correo válido, por ejemplo nombre@dominio.co.')),
    nombreAcudiente: opcional(
      z
        .string()
        .min(2, 'Escriba el nombre completo del acudiente.')
        .max(120, 'El nombre del acudiente admite hasta 120 caracteres.')
    ),
    telefonoAcudiente: opcional(telefono),
    correoAcudiente: opcional(z.email('Escriba un correo válido, por ejemplo nombre@dominio.co.')),
    autorizacionDatos: z.literal(true, {
      error: 'Para enviar la solicitud debe autorizar el tratamiento de datos personales.',
    }),
  })
  .superRefine((datos, contexto) => {
    for (const problema of problemasDeContacto(datos)) {
      contexto.addIssue({ code: 'custom', path: [problema.campo], message: problema.mensaje })
    }
  })

export type CampoFormulario = keyof z.input<typeof esquemaCliente>

export const ORDEN_CAMPOS: CampoFormulario[] = [
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'tipoDocumento',
  'numeroDocumento',
  'fechaNacimiento',
  'lugarNacimiento',
  'genero',
  'cicloId',
  'jornadaId',
  'telefonoAspirante',
  'correoAspirante',
  'nombreAcudiente',
  'telefonoAcudiente',
  'correoAcudiente',
  'autorizacionDatos',
]

export type ErroresFormulario = Partial<Record<CampoFormulario, string>>

export function validarFormulario(datos: Record<string, unknown>): ErroresFormulario {
  const resultado = esquemaCliente.safeParse(datos)
  const errores: ErroresFormulario = {}
  const texto = (campo: string) =>
    typeof datos[campo] === 'string' ? (datos[campo] as string) : ''
  for (const problema of problemasDeContacto({
    fechaNacimiento: texto('fechaNacimiento'),
    nombreAcudiente: texto('nombreAcudiente'),
    telefonoAcudiente: texto('telefonoAcudiente'),
    telefonoAspirante: texto('telefonoAspirante'),
  })) {
    errores[problema.campo] = problema.mensaje
  }
  if (resultado.success) return errores
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as CampoFormulario
    if (campo && !errores[campo]) errores[campo] = problema.message
  }
  return errores
}

export function erroresDelServidor(validacion: unknown): ErroresFormulario {
  if (!validacion || typeof validacion !== 'object') return {}
  const errores: ErroresFormulario = {}
  for (const campo of ORDEN_CAMPOS) {
    const entrada = (validacion as Record<string, { _errors?: string[] } | undefined>)[campo]
    if (entrada?._errors?.length) errores[campo] = 'Revise este campo.'
  }
  return errores
}

const MENSAJES_PUBLICOS = [
  /^Demasiados intentos\. Espere \d+ minutos antes de reintentar\.$/,
  /^El formulario expiró\. Recargue la página e intente de nuevo\.$/,
  /^El formulario se envió demasiado rápido$/,
]

export function mensajeDelServidor(mensaje: string | undefined): string | undefined {
  if (!mensaje) return undefined
  if (MENSAJES_PUBLICOS.some((patron) => patron.test(mensaje))) return mensaje
  return 'Ocurrió un error al registrar la solicitud. Intente de nuevo en unos minutos; si el problema continúa, comuníquese con la institución.'
}
