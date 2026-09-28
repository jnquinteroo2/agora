'use client'

import { useEffect, useRef, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { registrarAspirante } from '@/src/acciones/admisiones/aspirante'
import { cn } from '@/src/ui/cn'
import {
  esMenorDeEdad,
  requiereAcudiente,
  requiereTelefonoDelAspirante,
} from '@/src/dominio/admision'
import { Boton, EnlaceBoton, EnlaceSubrayado } from '@/src/ui/boton'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { estiloControl, MensajeDeError } from '@/src/ui/campo'
import {
  CODIGOS_TIPO_DOCUMENTO,
  etiquetaTipoDocumento,
  type TipoDocumento,
} from '@/src/dominio/documentos'
import {
  ORDEN_CAMPOS,
  erroresDelServidor,
  mensajeDelServidor,
  validarFormulario,
  type CampoFormulario,
  type ErroresFormulario,
} from './validacion'

export interface OpcionCiclo {
  id: string
  etiqueta: string
}

export interface OpcionJornada {
  id: string
  nombre: string
  detalle: string | null
}

const ETIQUETAS: Record<CampoFormulario, string> = {
  primerNombre: 'Primer nombre',
  segundoNombre: 'Segundo nombre',
  primerApellido: 'Primer apellido',
  segundoApellido: 'Segundo apellido',
  tipoDocumento: 'Tipo de documento',
  numeroDocumento: 'Número de documento',
  fechaNacimiento: 'Fecha de nacimiento',
  lugarNacimiento: 'Lugar de nacimiento',
  genero: 'Género',
  cicloId: 'Ciclo al que aspira',
  jornadaId: 'Jornada',
  telefonoAspirante: 'Teléfono del aspirante',
  correoAspirante: 'Correo del aspirante',
  nombreAcudiente: 'Nombre del acudiente',
  telefonoAcudiente: 'Teléfono del acudiente',
  correoAcudiente: 'Correo del acudiente',
  autorizacionDatos: 'Autorización de tratamiento de datos',
}

const campoBase = cn(estiloControl, 'h-11')

function idCampo(campo: CampoFormulario) {
  return `campo-${campo}`
}

function idError(campo: CampoFormulario) {
  return `error-${campo}`
}

function MensajeError({ campo, errores }: { campo: CampoFormulario; errores: ErroresFormulario }) {
  const mensaje = errores[campo]
  if (!mensaje) return null
  return <MensajeDeError id={idError(campo)}>{mensaje}</MensajeDeError>
}

function Campo({
  campo,
  errores,
  opcional = false,
  ayuda,
  className,
  children,
}: {
  campo: CampoFormulario
  errores: ErroresFormulario
  opcional?: boolean
  ayuda?: string
  className?: string
  children: (props: {
    id: string
    name: CampoFormulario
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
    'aria-required': boolean | undefined
    className: string
  }) => React.ReactNode
}) {
  const invalido = Boolean(errores[campo])
  const idAyuda = ayuda ? `ayuda-${campo}` : undefined
  const describe =
    [invalido ? idError(campo) : null, idAyuda].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={idCampo(campo)} className="text-nota font-medium text-texto">
        {ETIQUETAS[campo]}
        {opcional ? <span className="font-normal text-texto-secundario"> (opcional)</span> : null}
      </label>
      {ayuda ? (
        <p id={idAyuda} className="text-menudo text-texto-secundario">
          {ayuda}
        </p>
      ) : null}
      {children({
        id: idCampo(campo),
        name: campo,
        'aria-invalid': invalido || undefined,
        'aria-describedby': describe,
        'aria-required': opcional ? undefined : true,
        className: campoBase,
      })}
      <MensajeError campo={campo} errores={errores} />
    </div>
  )
}

function Bloque({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="grid gap-x-10 gap-y-6 border-t border-texto pt-6 md:grid-cols-12">
      <legend className="float-left w-full md:col-span-4 md:w-auto">
        <span className="block font-titulo text-rubro font-medium text-texto">{titulo}</span>
        {descripcion ? (
          <span className="prosa mt-2 block max-w-[34ch] text-nota leading-relaxed text-texto-secundario">
            {descripcion}
          </span>
        ) : null}
      </legend>
      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 md:col-span-8">{children}</div>
    </fieldset>
  )
}

function articuloDe(nombre: string): string {
  return /^(Institución|Corporación|Fundación|Asociación)\b/.test(nombre) ? 'la ' : ''
}

function leer(form: FormData, campo: string): string {
  return String(form.get(campo) ?? '').trim()
}

export function FormularioAdmision({
  ciclos,
  jornadas,
  formularioServido,
  migas,
  titulo,
  entrada,
  responsable,
  canalDerechos,
}: {
  ciclos: OpcionCiclo[]
  jornadas: OpcionJornada[]
  formularioServido: string
  migas: React.ReactNode
  titulo: string
  entrada: string
  responsable: string
  canalDerechos: string | null
}) {
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const menor = esMenorDeEdad(fechaNacimiento)
  const acudienteObligatorio = requiereAcudiente(fechaNacimiento)
  const telefonoAspiranteObligatorio = requiereTelefonoDelAspirante(fechaNacimiento)
  const [intento, setIntento] = useState(0)
  const resumen = useRef<HTMLDivElement>(null)
  const exito = useRef<HTMLHeadingElement>(null)
  const accion = useAction(registrarAspirante, {
    onError: ({ error }) => {
      const delServidor = erroresDelServidor(error.validationErrors)
      if (Object.keys(delServidor).length > 0) {
        setErrores(delServidor)
        setIntento((n) => n + 1)
      }
    },
  })

  const listaErrores = ORDEN_CAMPOS.filter((campo) => errores[campo])
  const radicado = accion.hasSucceeded ? accion.result.data?.radicado : undefined

  useEffect(() => {
    if (intento > 0) resumen.current?.focus()
  }, [intento])

  useEffect(() => {
    if (radicado) exito.current?.focus()
  }, [radicado])

  if (radicado) {
    return (
      <>
        <Seccion aire="md">
          <Contenedor ancho="amplio">
            <EncabezadoDePagina
              migas={migas}
              titulo="Solicitud recibida"
              idTitulo="titulo-exito"
              refTitulo={exito}
            />
          </Contenedor>
        </Seccion>
        <Seccion aire="md" filete="arriba" className="pt-aire-sm">
          <Contenedor ancho="amplio">
            <div className="flex flex-col gap-6 border-t border-texto pt-8">
              <div className="flex flex-col gap-2">
                <p className="text-nota font-medium text-texto-secundario">Número de radicado</p>
                <p
                  id="radicado"
                  className="font-mono font-tnum text-[clamp(2rem,1.2rem+4vw,3.25rem)] leading-none font-medium tracking-tight break-all text-texto"
                >
                  {radicado}
                </p>
              </div>
              <p className="prosa max-w-medida leading-relaxed text-texto-secundario">
                Anote este número o tome una captura de pantalla: con él la institución identifica
                la solicitud. El siguiente paso lo da la institución, que se comunica con el
                aspirante o, si es menor de edad, con su acudiente para continuar el proceso.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <EnlaceBoton href="/inicio" tono="secundario">
                  Volver al inicio
                </EnlaceBoton>
                <EnlaceBoton href="/modelo-clei" tono="fantasma">
                  Conocer el modelo CLEI
                </EnlaceBoton>
              </div>
            </div>
          </Contenedor>
        </Seccion>
      </>
    )
  }

  const errorServidor = accion.hasErrored
    ? mensajeDelServidor(accion.result.serverError)
    : undefined

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina migas={migas} titulo={titulo} entrada={entrada} />
        </Contenedor>
      </Seccion>
      <Seccion aire="md" filete="arriba" className="pt-aire-sm">
        <Contenedor ancho="amplio">
          <form
            noValidate
            aria-describedby="nota-obligatorios"
            onChange={(e) => {
              const objetivo = e.target
              if (!(objetivo instanceof HTMLInputElement || objetivo instanceof HTMLSelectElement))
                return
              const nombre = objetivo.name as CampoFormulario
              if (nombre === 'fechaNacimiento') setFechaNacimiento(objetivo.value)
              if (errores[nombre]) {
                setErrores((previos) => {
                  const siguientes = { ...previos }
                  delete siguientes[nombre]
                  return siguientes
                })
              }
            }}
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const datos = {
                primerNombre: leer(form, 'primerNombre'),
                segundoNombre: leer(form, 'segundoNombre'),
                primerApellido: leer(form, 'primerApellido'),
                segundoApellido: leer(form, 'segundoApellido'),
                tipoDocumento: leer(form, 'tipoDocumento'),
                numeroDocumento: leer(form, 'numeroDocumento'),
                fechaNacimiento: leer(form, 'fechaNacimiento'),
                lugarNacimiento: leer(form, 'lugarNacimiento'),
                genero: leer(form, 'genero'),
                cicloId: leer(form, 'cicloId'),
                jornadaId: leer(form, 'jornadaId'),
                telefonoAspirante: leer(form, 'telefonoAspirante'),
                correoAspirante: leer(form, 'correoAspirante'),
                nombreAcudiente: leer(form, 'nombreAcudiente'),
                telefonoAcudiente: leer(form, 'telefonoAcudiente'),
                correoAcudiente: leer(form, 'correoAcudiente'),
                autorizacionDatos: form.get('autorizacionDatos') === 'si',
              }

              const encontrados = validarFormulario(datos)
              setErrores(encontrados)
              if (Object.keys(encontrados).length > 0) {
                setIntento((n) => n + 1)
                return
              }

              accion.execute({
                primerNombre: datos.primerNombre,
                segundoNombre: datos.segundoNombre || undefined,
                primerApellido: datos.primerApellido,
                segundoApellido: datos.segundoApellido || undefined,
                tipoDocumento: datos.tipoDocumento as TipoDocumento,
                numeroDocumento: datos.numeroDocumento,
                fechaNacimiento: datos.fechaNacimiento,
                lugarNacimiento: datos.lugarNacimiento || undefined,
                genero: (datos.genero as 'M' | 'F' | 'NB' | 'NR') || undefined,
                cicloId: datos.cicloId,
                jornadaId: datos.jornadaId,
                telefonoAspirante: datos.telefonoAspirante || undefined,
                correoAspirante: datos.correoAspirante || undefined,
                telefonoAcudiente: datos.telefonoAcudiente || undefined,
                nombreAcudiente: datos.nombreAcudiente || undefined,
                correoAcudiente: datos.correoAcudiente || undefined,
                autorizacionDatos: true,
                sitio: String(form.get('sitio') ?? ''),
                formularioServido,
              })
            }}
            className="flex flex-col gap-12"
          >
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <label htmlFor="sitio">No completar este campo</label>
              <input type="text" id="sitio" name="sitio" tabIndex={-1} autoComplete="off" />
            </div>

            <p id="nota-obligatorios" className="text-nota text-texto-secundario">
              Todos los campos son obligatorios, salvo los marcados como opcionales.
            </p>

            {listaErrores.length > 0 ? (
              <div
                ref={resumen}
                role="alert"
                tabIndex={-1}
                aria-labelledby="titulo-resumen"
                className="flex flex-col gap-3 rounded-tarjeta border border-error/60 p-5 focus-visible:outline-offset-4"
              >
                <h2 id="titulo-resumen" className="font-titulo text-rubro font-medium text-texto">
                  {listaErrores.length === 1
                    ? 'Hay un dato por corregir'
                    : `Hay ${listaErrores.length} datos por corregir`}
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {listaErrores.map((campo) => (
                    <li key={campo}>
                      <a
                        href={`#${idCampo(campo)}`}
                        className="text-nota text-texto underline decoration-error underline-offset-4"
                      >
                        {errores[campo]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Bloque
              titulo="Datos del aspirante"
              descripcion="Tal como aparecen en el documento de identidad."
            >
              <Campo campo="primerNombre" errores={errores}>
                {(p) => <input {...p} type="text" autoComplete="given-name" />}
              </Campo>
              <Campo campo="segundoNombre" errores={errores} opcional>
                {(p) => <input {...p} type="text" autoComplete="additional-name" />}
              </Campo>
              <Campo campo="primerApellido" errores={errores}>
                {(p) => <input {...p} type="text" autoComplete="family-name" />}
              </Campo>
              <Campo campo="segundoApellido" errores={errores} opcional>
                {(p) => <input {...p} type="text" autoComplete="off" />}
              </Campo>
              <Campo campo="tipoDocumento" errores={errores}>
                {(p) => (
                  <select {...p} defaultValue="">
                    <option value="" disabled>
                      Seleccione
                    </option>
                    {CODIGOS_TIPO_DOCUMENTO.map((codigo) => (
                      <option key={codigo} value={codigo}>
                        {etiquetaTipoDocumento(codigo)}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
              <Campo campo="numeroDocumento" errores={errores}>
                {(p) => (
                  <input
                    {...p}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    className={cn(p.className, 'font-mono font-tnum')}
                  />
                )}
              </Campo>
              <Campo campo="fechaNacimiento" errores={errores}>
                {(p) => (
                  <input
                    {...p}
                    type="date"
                    autoComplete="bday"
                    className={cn(
                      p.className,
                      'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foco'
                    )}
                  />
                )}
              </Campo>
              <Campo
                campo="lugarNacimiento"
                errores={errores}
                opcional
                ayuda="Municipio y departamento."
              >
                {(p) => <input {...p} type="text" autoComplete="off" />}
              </Campo>
              <Campo campo="genero" errores={errores} opcional>
                {(p) => (
                  <select {...p} defaultValue="">
                    <option value="">Sin responder</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="NB">No binario</option>
                    <option value="NR">Prefiere no reportar</option>
                  </select>
                )}
              </Campo>
            </Bloque>

            <Bloque
              titulo="Ciclo y jornada"
              descripcion="El ciclo depende de los estudios ya aprobados. La institución lo confirma con los certificados."
            >
              <Campo campo="cicloId" errores={errores} className="sm:col-span-2">
                {(p) => (
                  <select {...p} defaultValue="">
                    <option value="" disabled>
                      Seleccione
                    </option>
                    {ciclos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>

              <fieldset
                role="radiogroup"
                aria-describedby={errores.jornadaId ? idError('jornadaId') : undefined}
                aria-required="true"
                aria-invalid={errores.jornadaId ? true : undefined}
                className="flex flex-col gap-3 sm:col-span-2"
              >
                <legend className="pb-1.5 text-nota font-medium text-texto">
                  {ETIQUETAS.jornadaId}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {jornadas.map((j, indice) => (
                    <label
                      key={j.id}
                      className={cn(
                        'transicion-ui flex cursor-pointer items-start gap-3 rounded-tarjeta border bg-superficie-elevada p-4 shadow-sutil has-[:checked]:border-borde-fuerte has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco',
                        errores.jornadaId
                          ? 'border-error'
                          : 'border-borde-control hover:border-texto'
                      )}
                    >
                      <input
                        id={indice === 0 ? idCampo('jornadaId') : undefined}
                        type="radio"
                        name="jornadaId"
                        value={j.id}
                        defaultChecked={jornadas.length === 1}
                        className="mt-1 size-4 shrink-0 accent-texto focus-visible:outline-none"
                      />
                      <span className="flex flex-col gap-1">
                        <span className="font-titulo text-rubro leading-tight text-texto">
                          {j.nombre}
                        </span>
                        {j.detalle ? (
                          <span className="text-nota text-texto-secundario">{j.detalle}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
                <MensajeError campo="jornadaId" errores={errores} />
              </fieldset>
            </Bloque>

            <Bloque
              titulo="Contacto del aspirante"
              descripcion={
                telefonoAspiranteObligatorio
                  ? 'El aspirante es mayor de edad: la institución usa este teléfono para comunicarse con el aspirante.'
                  : 'Si el aspirante tiene teléfono o correo propios, puede registrarlos.'
              }
            >
              <Campo
                campo="telefonoAspirante"
                errores={errores}
                opcional={!telefonoAspiranteObligatorio}
              >
                {(p) => (
                  <input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={cn(p.className, 'font-mono font-tnum')}
                  />
                )}
              </Campo>
              <Campo campo="correoAspirante" errores={errores} opcional>
                {(p) => (
                  <input
                    {...p}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                  />
                )}
              </Campo>
            </Bloque>

            <Bloque
              titulo="Acudiente"
              descripcion={
                menor === true
                  ? 'El aspirante es menor de 18 años: el acudiente es obligatorio y la institución se comunica con esa persona.'
                  : menor === false
                    ? 'El aspirante es mayor de edad: registrar un acudiente es opcional.'
                    : 'Obligatorio si el aspirante es menor de 18 años. Se define con la fecha de nacimiento.'
              }
            >
              <Campo
                campo="nombreAcudiente"
                errores={errores}
                opcional={!acudienteObligatorio}
                className="sm:col-span-2"
              >
                {(p) => <input {...p} type="text" autoComplete="off" />}
              </Campo>
              <Campo campo="telefonoAcudiente" errores={errores} opcional={!acudienteObligatorio}>
                {(p) => (
                  <input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={cn(p.className, 'font-mono font-tnum')}
                  />
                )}
              </Campo>
              <Campo campo="correoAcudiente" errores={errores} opcional>
                {(p) => (
                  <input
                    {...p}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                  />
                )}
              </Campo>
            </Bloque>

            <div className="flex flex-col gap-6 border-t border-texto pt-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <input
                    id={idCampo('autorizacionDatos')}
                    type="checkbox"
                    name="autorizacionDatos"
                    value="si"
                    aria-invalid={errores.autorizacionDatos ? true : undefined}
                    aria-describedby={
                      errores.autorizacionDatos
                        ? `aviso-privacidad ${idError('autorizacionDatos')}`
                        : 'aviso-privacidad'
                    }
                    aria-required="true"
                    className="mt-1 size-4 shrink-0 accent-texto"
                  />
                  <label
                    htmlFor={idCampo('autorizacionDatos')}
                    className="prosa max-w-medida text-nota leading-relaxed text-texto"
                  >
                    Autorizo a {articuloDe(responsable)}
                    {responsable} a tratar los datos de este formulario para estudiar la solicitud
                    de admisión y comunicarse con el aspirante o, si es menor de edad, con su
                    acudiente.
                  </label>
                </div>
                <p
                  id="aviso-privacidad"
                  className="prosa max-w-medida pl-7 text-menudo leading-relaxed text-texto-secundario"
                >
                  Si el aspirante es menor de edad, autoriza su representante legal después de
                  escuchar su opinión, y responder las preguntas sobre sus datos es facultativo. Se
                  pueden conocer, actualizar, rectificar y suprimir los datos y revocar la
                  autorización{canalDerechos ? ` ${canalDerechos}` : ''}. Más información en la{' '}
                  <EnlaceSubrayado
                    href="/privacidad"
                    className="decoration-texto-secundario hover:decoration-texto"
                  >
                    política de tratamiento de datos personales
                  </EnlaceSubrayado>
                  .
                </p>
                <MensajeError campo="autorizacionDatos" errores={errores} />
              </div>

              {errorServidor ? (
                <div role="alert" className="rounded-tarjeta border border-error/60 p-5">
                  <p className="text-nota font-medium text-texto">
                    No se pudo enviar la solicitud.
                  </p>
                  <p className="text-nota text-texto-secundario">{errorServidor}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-6">
                <Boton type="submit" tono="primario" talla="lg" disabled={accion.isExecuting}>
                  {accion.isExecuting ? 'Enviando la solicitud' : 'Enviar solicitud'}
                </Boton>
              </div>
            </div>
          </form>
        </Contenedor>
      </Seccion>
    </>
  )
}
