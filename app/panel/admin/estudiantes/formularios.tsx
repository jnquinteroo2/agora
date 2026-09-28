'use client'

import {
  CODIGOS_TIPO_DOCUMENTO,
  etiquetaTipoDocumento,
  type TipoDocumento,
} from '@/src/dominio/documentos'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import {
  matricularNuevoEstudiante,
  matricularEstudiante,
  editarMatricula,
} from '@/src/acciones/matricula/matricula'
import { buscarPersonaPorDocumento } from '@/src/acciones/personas/persona'
import { FormularioOtorgarAcceso } from '../../_cuentas/formularios'
import type { Matricula, Persona, Curso } from '@/src/datos/esquema'
import { campo, boton, botonSecundario, etiqueta } from '@/src/ui/estilos'

const ESTADOS_MATRICULA = ['activo', 'retirado', 'trasladado'] as const
const ETIQUETAS_ESTADO_MATRICULA: Record<(typeof ESTADOS_MATRICULA)[number], string> = {
  activo: 'Activo',
  retirado: 'Retirado',
  trasladado: 'Trasladado',
}

interface CursoOpcion extends Pick<Curso, 'id' | 'nombre'> {}

export function FormularioNuevoEstudiante({
  anioLectivoId,
  cursos,
}: {
  anioLectivoId: string | null
  cursos: CursoOpcion[]
}) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('TI')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [primerNombre, setPrimerNombre] = useState('')
  const [segundoNombre, setSegundoNombre] = useState('')
  const [primerApellido, setPrimerApellido] = useState('')
  const [segundoApellido, setSegundoApellido] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [genero, setGenero] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [cursoId, setCursoId] = useState('')

  const accion = useAction(matricularNuevoEstudiante, {
    onSuccess: () => {
      setNumeroDocumento('')
      setPrimerNombre('')
      setSegundoNombre('')
      setPrimerApellido('')
      setSegundoApellido('')
      setFechaNacimiento('')
      setGenero('')
      setTelefono('')
      setCorreo('')
      setCursoId('')
    },
  })

  if (!anioLectivoId) {
    return (
      <p className="text-nota text-texto-secundario">
        No hay un año lectivo activo. Actívelo en Materias antes de matricular estudiantes.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!numeroDocumento.trim() || !primerNombre.trim() || !primerApellido.trim() || !cursoId)
          return
        accion.execute({
          anioLectivoId,
          cursoId,
          persona: {
            tipoDocumento,
            numeroDocumento: numeroDocumento.trim(),
            primerNombre: primerNombre.trim(),
            segundoNombre: segundoNombre.trim() || undefined,
            primerApellido: primerApellido.trim(),
            segundoApellido: segundoApellido.trim() || undefined,
            fechaNacimiento: fechaNacimiento || undefined,
            genero: (genero || undefined) as 'M' | 'F' | 'NB' | 'NR' | undefined,
            telefono: telefono.trim() || undefined,
            correo: correo.trim() || undefined,
          },
        })
      }}
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className={etiqueta}>
        <span>Tipo de documento</span>
        <select
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value as typeof tipoDocumento)}
          className={`${campo} w-full`}
        >
          {CODIGOS_TIPO_DOCUMENTO.map((t) => (
            <option key={t} value={t}>
              {etiquetaTipoDocumento(t)}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Número de documento</span>
        <input
          value={numeroDocumento}
          onChange={(e) => setNumeroDocumento(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Primer nombre</span>
        <input
          value={primerNombre}
          onChange={(e) => setPrimerNombre(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Segundo nombre</span>
        <input
          value={segundoNombre}
          onChange={(e) => setSegundoNombre(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Primer apellido</span>
        <input
          value={primerApellido}
          onChange={(e) => setPrimerApellido(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Segundo apellido</span>
        <input
          value={segundoApellido}
          onChange={(e) => setSegundoApellido(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Fecha de nacimiento</span>
        <input
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          type="date"
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Género</span>
        <select
          value={genero}
          onChange={(e) => setGenero(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="NB">No binario</option>
          <option value="NR">Prefiere no reportar</option>
        </select>
      </label>
      <label className={etiqueta}>
        <span>Teléfono (opcional)</span>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Correo (opcional)</span>
        <input
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Curso</span>
        <select
          value={cursoId}
          onChange={(e) => setCursoId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar y matricular'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">Estudiante matriculado</p>
      )}
    </form>
  )
}

export function FormularioMatricularExistente({
  anioLectivoId,
  cursos,
}: {
  anioLectivoId: string | null
  cursos: CursoOpcion[]
}) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('CC')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [encontrada, setEncontrada] = useState<Persona | null>(null)
  const [cursoId, setCursoId] = useState('')
  const [buscado, setBuscado] = useState(false)

  const buscar = useAction(buscarPersonaPorDocumento, {
    onSuccess: (res) => {
      setEncontrada(res.data ?? null)
      setBuscado(true)
    },
  })

  const matricular = useAction(matricularEstudiante, {
    onSuccess: () => {
      setEncontrada(null)
      setCursoId('')
      setBuscado(false)
      setNumeroDocumento('')
    },
  })

  if (!anioLectivoId) return null

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!numeroDocumento.trim()) return
          setEncontrada(null)
          setBuscado(false)
          buscar.execute({ tipoDocumento, numeroDocumento: numeroDocumento.trim() })
        }}
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className={etiqueta}>
          <span>Tipo de documento</span>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value as typeof tipoDocumento)}
            className={`${campo} w-full`}
          >
            {CODIGOS_TIPO_DOCUMENTO.map((t) => (
              <option key={t} value={t}>
                {etiquetaTipoDocumento(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={etiqueta}>
          <span>Número de documento</span>
          <input
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
        <button type="submit" disabled={buscar.isExecuting} className={botonSecundario}>
          {buscar.isExecuting ? 'Buscando…' : 'Buscar persona'}
        </button>
      </form>

      {buscado && !encontrada && (
        <p className="text-menudo text-texto-secundario">
          No existe ninguna persona con ese documento. Use &quot;Registrar y matricular&quot;
          arriba.
        </p>
      )}

      {encontrada && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!cursoId) return
            matricular.execute({ anioLectivoId, estudianteId: encontrada.id, cursoId })
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-nota">
            {encontrada.primerNombre} {encontrada.primerApellido}, {encontrada.tipoDocumento}{' '}
            {encontrada.numeroDocumento}
          </span>
          <label className={etiqueta}>
            <span>Curso</span>
            <select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              className={`${campo} w-full`}
            >
              <option value="">Seleccione</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={matricular.isExecuting} className={boton}>
            {matricular.isExecuting ? 'Matriculando…' : 'Matricular'}
          </button>
          {matricular.hasErrored && (
            <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
              {matricular.result.serverError}
            </p>
          )}
        </form>
      )}
    </div>
  )
}

interface FilaMatriculaProps {
  matricula: Matricula
  nombreEstudiante: string
  documento: string
  cursos: CursoOpcion[]
  conKeycloak: boolean
}

export function FilaMatricula({
  matricula,
  nombreEstudiante,
  documento,
  cursos,
  conKeycloak,
}: FilaMatriculaProps) {
  const [cursoId, setCursoId] = useState(matricula.cursoId)
  const [estado, setEstado] = useState(matricula.estado as (typeof ESTADOS_MATRICULA)[number])
  const accion = useAction(editarMatricula)
  const [otorgando, setOtorgando] = useState(false)

  const huboCambios = cursoId !== matricula.cursoId || estado !== matricula.estado

  return (
    <tr className="border-b border-borde align-top">
      <td className="py-2 pr-3">{nombreEstudiante}</td>
      <td className="py-2 pr-3">{documento}</td>
      <td className="py-2 pr-3">
        <select
          aria-label={`Curso de ${nombreEstudiante}`}
          value={cursoId}
          onChange={(e) => setCursoId(e.target.value)}
          className={campo}
        >
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <select
          aria-label={`Estado de la matrícula de ${nombreEstudiante}`}
          value={estado}
          onChange={(e) => setEstado(e.target.value as typeof estado)}
          className={campo}
        >
          {ESTADOS_MATRICULA.map((e) => (
            <option key={e} value={e}>
              {ETIQUETAS_ESTADO_MATRICULA[e]}
            </option>
          ))}
        </select>
      </td>
      <td className="flex flex-col gap-1 py-2">
        {huboCambios && (
          <button
            onClick={() => accion.execute({ id: matricula.id, cursoId, estado })}
            disabled={accion.isExecuting}
            className={botonSecundario}
          >
            {accion.isExecuting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
        {accion.hasSucceeded && !huboCambios && (
          <span className="text-menudo text-exito">Guardado</span>
        )}
        {accion.hasErrored && (
          <span className="text-menudo text-error">{accion.result.serverError}</span>
        )}

        {!otorgando && (
          <button onClick={() => setOtorgando(true)} className={botonSecundario}>
            Dar acceso al panel
          </button>
        )}
        {otorgando && (
          <FormularioOtorgarAcceso personaId={matricula.estudianteId} conKeycloak={conKeycloak} />
        )}
      </td>
    </tr>
  )
}
