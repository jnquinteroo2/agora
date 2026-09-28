'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { generarBoletin, generarBoletinesCurso } from '@/src/acciones/calificaciones/boletin'
import { campo, boton, etiqueta } from '@/src/ui/estilos'

interface Opcion {
  id: string
  nombre: string
}

export function FormularioBoletinIndividual({
  matriculas,
  periodos,
}: {
  matriculas: Opcion[]
  periodos: Opcion[]
}) {
  const [matriculaId, setMatriculaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const accion = useAction(generarBoletin)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!matriculaId || !periodoId) return
        accion.execute({ matriculaId, periodoId })
      }}
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className={`${etiqueta} min-w-64`}>
        <span>Estudiante</span>
        <select
          value={matriculaId}
          onChange={(e) => setMatriculaId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {matriculas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Periodo</span>
        <select
          value={periodoId}
          onChange={(e) => setPeriodoId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {periodos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Encolando…' : 'Generar boletín'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">
          En cola. Aparecerá abajo en unos segundos.
        </p>
      )}
    </form>
  )
}

export function FormularioBoletinMasivo({
  cursos,
  periodos,
}: {
  cursos: Opcion[]
  periodos: Opcion[]
}) {
  const [cursoId, setCursoId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const accion = useAction(generarBoletinesCurso)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!cursoId || !periodoId) return
        accion.execute({ cursoId, periodoId })
      }}
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
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
      <label className={etiqueta}>
        <span>Periodo</span>
        <select
          value={periodoId}
          onChange={(e) => setPeriodoId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {periodos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Encolando…' : 'Generar boletines del curso'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && accion.result.data && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">
          {accion.result.data.encolados} de {accion.result.data.total} boletines encolados
        </p>
      )}
    </form>
  )
}
