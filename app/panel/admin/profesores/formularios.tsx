'use client'

import {
  CODIGOS_TIPO_DOCUMENTO,
  etiquetaTipoDocumento,
  type TipoDocumento,
} from '@/src/dominio/documentos'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { crearUsuario, cambiarEstadoUsuario } from '@/src/acciones/personas/persona'
import { asignarDocente, quitarAsignacionDocente } from '@/src/acciones/matricula/matricula'
import type { Usuario } from '@/src/datos/esquema'
import { campo, boton, botonSecundario, etiqueta } from '@/src/ui/estilos'

interface Opcion {
  id: string
  nombre: string
}

export function FormularioNuevoDocente({ conKeycloak }: { conKeycloak: boolean }) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('CC')
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
        if (
          !numeroDocumento.trim() ||
          !primerNombre.trim() ||
          !primerApellido.trim() ||
          !correo.trim() ||
          (!conKeycloak && contrasenaInicial.length < 12)
        )
          return
        accion.execute({
          correo: correo.trim(),
          rol: 'docente',
          sinCorreo: false,
          contrasenaInicial: conKeycloak ? undefined : contrasenaInicial,
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
        <span>Primer apellido</span>
        <input
          value={primerApellido}
          onChange={(e) => setPrimerApellido(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Segundo apellido (opcional)</span>
        <input
          value={segundoApellido}
          onChange={(e) => setSegundoApellido(e.target.value)}
          className={`${campo} w-full`}
        />
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
        <span>Correo de acceso</span>
        <input
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      {conKeycloak ? (
        <p className="text-menudo text-texto-secundario">
          Se enviará una invitación al correo para que el docente defina su contraseña.
        </p>
      ) : (
        <label className={etiqueta}>
          <span>Contraseña inicial (mínimo 12 caracteres)</span>
          <input
            value={contrasenaInicial}
            onChange={(e) => setContrasenaInicial(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
      )}
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar docente'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">
          {accion.result.data?.invitacion === 'enviada'
            ? 'Docente registrado. Se envió la invitación a su correo.'
            : accion.result.data?.invitacion === 'fallida'
              ? 'Docente registrado, pero la invitación no se pudo enviar. Reenvíela desde Cuentas.'
              : 'Docente registrado'}
        </p>
      )}
    </form>
  )
}

export function FilaDocente({
  docente,
  nombreCompleto,
}: {
  docente: Usuario
  nombreCompleto: string
}) {
  const [activo, setActivo] = useState(docente.activo)
  const accion = useAction(cambiarEstadoUsuario, {
    onSuccess: ({ data }) => {
      if (data) setActivo(data.activo)
    },
  })

  return (
    <tr className="border-b border-borde">
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
      <p className="text-nota text-texto-secundario">
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
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className={etiqueta}>
        <span>Docente</span>
        <select
          value={docenteId}
          onChange={(e) => setDocenteId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {docentes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Materia</span>
        <select
          value={asignaturaId}
          onChange={(e) => setAsignaturaId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {asignaturas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
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
        {accion.isExecuting ? 'Asignando…' : 'Asignar'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">Asignación creada</p>
      )}
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
    <tr className="border-b border-borde">
      <td className="py-2 pr-3">{docenteNombre}</td>
      <td className="py-2 pr-3">{asignaturaNombre}</td>
      <td className="py-2 pr-3">{cursoNombre}</td>
      <td className="py-2">
        <button
          onClick={() => accion.execute({ id })}
          disabled={accion.isExecuting}
          className={botonSecundario}
        >
          {accion.isExecuting ? 'Quitando…' : 'Quitar'}
        </button>
        {accion.hasErrored && (
          <span className="ml-2 text-menudo text-error">{accion.result.serverError}</span>
        )}
      </td>
    </tr>
  )
}
