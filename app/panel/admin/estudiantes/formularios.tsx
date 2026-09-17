'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import {
  matricularNuevoEstudiante,
  matricularEstudiante,
  editarMatricula,
} from '@/src/acciones/matricula/matricula'
import { buscarPersonaPorDocumento, otorgarAcceso } from '@/src/acciones/personas/persona'
import type { Matricula, Persona, Curso } from '@/src/datos/esquema'
import { campo, boton, botonSecundario } from '@/src/ui/estilos'

const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'RC', 'PA', 'NIP'] as const
const ESTADOS_MATRICULA = ['activo', 'retirado', 'trasladado'] as const

interface CursoOpcion extends Pick<Curso, 'id' | 'nombre'> {}

export function FormularioNuevoEstudiante({
  anioLectivoId,
  cursos,
}: {
  anioLectivoId: string | null
  cursos: CursoOpcion[]
}) {
  const [tipoDocumento, setTipoDocumento] = useState<(typeof TIPOS_DOCUMENTO)[number]>('TI')
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
      <p className="text-sm text-panel-secundario">
        No hay un año lectivo activo. Actívelo en Materias antes de matricular estudiantes.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!numeroDocumento.trim() || !primerNombre.trim() || !primerApellido.trim() || !cursoId) return
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
      className="flex flex-wrap gap-2"
    >
      <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as typeof tipoDocumento)} className={campo}>
        {TIPOS_DOCUMENTO.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} placeholder="N.º documento" className={`${campo} w-36`} />
      <input value={primerNombre} onChange={(e) => setPrimerNombre(e.target.value)} placeholder="Primer nombre" className={`${campo} w-40`} />
      <input value={segundoNombre} onChange={(e) => setSegundoNombre(e.target.value)} placeholder="Segundo nombre" className={`${campo} w-40`} />
      <input value={primerApellido} onChange={(e) => setPrimerApellido(e.target.value)} placeholder="Primer apellido" className={`${campo} w-40`} />
      <input value={segundoApellido} onChange={(e) => setSegundoApellido(e.target.value)} placeholder="Segundo apellido" className={`${campo} w-40`} />
      <input value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} type="date" className={campo} />
      <select value={genero} onChange={(e) => setGenero(e.target.value)} className={campo}>
        <option value="">Género…</option>
        <option value="M">M</option>
        <option value="F">F</option>
        <option value="NB">No binario</option>
        <option value="NR">Prefiere no decir</option>
      </select>
      <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" className={`${campo} w-40`} />
      <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo (opcional)" className={`${campo} w-56`} />
      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={campo}>
        <option value="">Curso…</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar y matricular'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Estudiante matriculado ✓</p>}
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
  const [tipoDocumento, setTipoDocumento] = useState<(typeof TIPOS_DOCUMENTO)[number]>('CC')
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
        className="flex flex-wrap gap-2"
      >
        <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as typeof tipoDocumento)} className={campo}>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} placeholder="N.º documento" className={`${campo} w-40`} />
        <button type="submit" disabled={buscar.isExecuting} className={botonSecundario}>
          {buscar.isExecuting ? 'Buscando…' : 'Buscar persona'}
        </button>
      </form>

      {buscado && !encontrada && (
        <p className="text-xs text-panel-secundario">
          No existe ninguna persona con ese documento. Use &quot;Registrar y matricular&quot; arriba.
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
          <span className="text-sm">
            {encontrada.primerNombre} {encontrada.primerApellido} — {encontrada.tipoDocumento} {encontrada.numeroDocumento}
          </span>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={campo}>
            <option value="">Curso…</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button type="submit" disabled={matricular.isExecuting} className={boton}>
            {matricular.isExecuting ? 'Matriculando…' : 'Matricular'}
          </button>
          {matricular.hasErrored && <p className="w-full text-xs text-error">{matricular.result.serverError}</p>}
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
}

export function FilaMatricula({ matricula, nombreEstudiante, documento, cursos }: FilaMatriculaProps) {
  const [cursoId, setCursoId] = useState(matricula.cursoId)
  const [estado, setEstado] = useState(matricula.estado as (typeof ESTADOS_MATRICULA)[number])
  const accion = useAction(editarMatricula)
  const acceso = useAction(otorgarAcceso)
  const [otorgando, setOtorgando] = useState(false)
  const [correoAcceso, setCorreoAcceso] = useState('')
  const [contrasenaAcceso, setContrasenaAcceso] = useState('')

  const huboCambios = cursoId !== matricula.cursoId || estado !== matricula.estado

  return (
    <tr className="border-b border-panel-borde/50 align-top">
      <td className="py-2 pr-3">{nombreEstudiante}</td>
      <td className="py-2 pr-3">{documento}</td>
      <td className="py-2 pr-3">
        <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={campo}>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className={campo}>
          {ESTADOS_MATRICULA.map((e) => (
            <option key={e} value={e}>{e}</option>
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
        {accion.hasSucceeded && !huboCambios && <span className="text-xs text-exito">Guardado ✓</span>}
        {accion.hasErrored && <span className="text-xs text-error">{accion.result.serverError}</span>}

        {!otorgando && (
          <button onClick={() => setOtorgando(true)} className={botonSecundario}>
            Dar acceso al panel
          </button>
        )}
        {otorgando && !acceso.hasSucceeded && (
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              if (!correoAcceso.trim() || contrasenaAcceso.length < 12) return
              acceso.execute({
                personaId: matricula.estudianteId,
                correo: correoAcceso.trim(),
                rol: 'estudiante',
                contrasenaInicial: contrasenaAcceso,
              })
            }}
            className="flex flex-col gap-1"
          >
            <input
              value={correoAcceso}
              onChange={(e) => setCorreoAcceso(e.target.value)}
              placeholder="Correo de acceso"
              className={`${campo} w-48`}
            />
            <input
              value={contrasenaAcceso}
              onChange={(e) => setContrasenaAcceso(e.target.value)}
              placeholder="Contraseña inicial (mín. 12)"
              type="text"
              className={`${campo} w-48`}
            />
            <button type="submit" disabled={acceso.isExecuting} className={boton}>
              {acceso.isExecuting ? 'Creando…' : 'Crear acceso'}
            </button>
            {acceso.hasErrored && <span className="text-xs text-error">{acceso.result.serverError}</span>}
          </form>
        )}
        {acceso.hasSucceeded && <span className="text-xs text-exito">Acceso creado ✓</span>}
      </td>
    </tr>
  )
}
