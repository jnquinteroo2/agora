'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { crearUsuario, cambiarEstadoUsuario } from '@/src/acciones/personas/persona'
import { asignarDocente, quitarAsignacionDocente } from '@/src/acciones/matricula/matricula'
import type { Usuario, Asignatura, Curso } from '@/src/datos/esquema'
import { campo, boton, botonSecundario } from '@/src/ui/estilos'

const TIPOS_DOCUMENTO = ['CC', 'TI', 'CE', 'RC', 'PA', 'NIP'] as const

interface Opcion { id: string; nombre: string }

export function FormularioNuevoDocente() {
  const [tipoDocumento, setTipoDocumento] = useState<(typeof TIPOS_DOCUMENTO)[number]>('CC')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [primerNombre, setPrimerNombre] = useState('')
  const [primerApellido, setPrimerApellido] = useState('')
  const [segundoApellido, setSegundoApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasenaInicial, setContrasenaInicial] = useState('')

  const accion = useAction(crearUsuario, {
    onSuccess: () => {
      setNumeroDocumento('')
      setPrimerNombre('')
      setPrimerApellido('')
      setSegundoApellido('')
      setCorreo('')
      setTelefono('')
      setContrasenaInicial('')
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!numeroDocumento.trim() || !primerNombre.trim() || !primerApellido.trim() || !correo.trim() || contrasenaInicial.length < 12) return
        accion.execute({
          correo: correo.trim(),
          rol: 'docente',
          contrasenaInicial,
          persona: {
            tipoDocumento,
            numeroDocumento: numeroDocumento.trim(),
            primerNombre: primerNombre.trim(),
            primerApellido: primerApellido.trim(),
            segundoApellido: segundoApellido.trim() || undefined,
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
      <input value={primerApellido} onChange={(e) => setPrimerApellido(e.target.value)} placeholder="Primer apellido" className={`${campo} w-40`} />
      <input value={segundoApellido} onChange={(e) => setSegundoApellido(e.target.value)} placeholder="Segundo apellido (opcional)" className={`${campo} w-40`} />
      <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" className={`${campo} w-36`} />
      <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo de acceso" className={`${campo} w-56`} />
      <input
        value={contrasenaInicial}
        onChange={(e) => setContrasenaInicial(e.target.value)}
        placeholder="Contraseña inicial (mín. 12)"
        className={`${campo} w-56`}
      />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar docente'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Docente registrado ✓</p>}
    </form>
  )
}

export function FilaDocente({ docente, nombreCompleto }: { docente: Usuario; nombreCompleto: string }) {
  const [activo, setActivo] = useState(docente.activo)
  const accion = useAction(cambiarEstadoUsuario, {
    onSuccess: () => setActivo((valorPrevio) => !valorPrevio),
  })

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{nombreCompleto}</td>
      <td className="py-2 pr-3">{docente.correo}</td>
      <td className="py-2 pr-3">{activo ? 'Activo' : 'Inactivo'}</td>
      <td className="py-2">
        <button
          onClick={() => accion.execute({ usuarioId: docente.id, activo: !activo })}
          disabled={accion.isExecuting}
          className={botonSecundario}
        >
          {accion.isExecuting ? 'Guardando…' : activo ? 'Desactivar' : 'Activar'}
        </button>
      </td>
    </tr>
  )
}

export function FormularioAsignarMateria({
  anioLectivoId,
  docentes,
  asignaturas,
  cursos,
}: {
  anioLectivoId: string | null
  docentes: Opcion[]
  asignaturas: Opcion[]
  cursos: Opcion[]
}) {
  const [docenteId, setDocenteId] = useState('')
  const [asignaturaId, setAsignaturaId] = useState('')
  const [cursoId, setCursoId] = useState('')

  const accion = useAction(asignarDocente, {
    onSuccess: () => {
      setDocenteId('')
      setAsignaturaId('')
      setCursoId('')
    },
  })

  if (!anioLectivoId) {
    return (
      <p className="text-sm text-panel-secundario">
        No hay un año lectivo activo. Actívelo en Materias antes de asignar materias a docentes.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!docenteId || !asignaturaId || !cursoId) return
        accion.execute({ anioLectivoId, docenteId, asignaturaId, cursoId })
      }}
      className="flex flex-wrap gap-2"
    >
      <select value={docenteId} onChange={(e) => setDocenteId(e.target.value)} className={campo}>
        <option value="">Docente…</option>
        {docentes.map((d) => (
          <option key={d.id} value={d.id}>{d.nombre}</option>
        ))}
      </select>
      <select value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)} className={campo}>
        <option value="">Materia…</option>
        {asignaturas.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>
      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={campo}>
        <option value="">Curso…</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Asignando…' : 'Asignar'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Asignación creada ✓</p>}
    </form>
  )
}

export function FilaAsignacion({
  id,
  docenteNombre,
  asignaturaNombre,
  cursoNombre,
}: {
  id: string
  docenteNombre: string
  asignaturaNombre: string
  cursoNombre: string
}) {
  const accion = useAction(quitarAsignacionDocente)

  if (accion.hasSucceeded) return null

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{docenteNombre}</td>
      <td className="py-2 pr-3">{asignaturaNombre}</td>
      <td className="py-2 pr-3">{cursoNombre}</td>
      <td className="py-2">
        <button onClick={() => accion.execute({ id })} disabled={accion.isExecuting} className={botonSecundario}>
          {accion.isExecuting ? 'Quitando…' : 'Quitar'}
        </button>
        {accion.hasErrored && <span className="ml-2 text-xs text-error">{accion.result.serverError}</span>}
      </td>
    </tr>
  )
}
