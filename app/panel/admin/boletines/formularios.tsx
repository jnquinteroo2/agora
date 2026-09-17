'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { generarBoletin, generarBoletinesCurso } from '@/src/acciones/calificaciones/boletin'
import { campo, boton } from '@/src/ui/estilos'

interface Opcion { id: string; nombre: string }

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
      className="flex flex-wrap gap-2"
    >
      <select value={matriculaId} onChange={(e) => setMatriculaId(e.target.value)} className={`${campo} min-w-64`}>
        <option value="">Estudiante…</option>
        {matriculas.map((m) => (
          <option key={m.id} value={m.id}>{m.nombre}</option>
        ))}
      </select>
      <select value={periodoId} onChange={(e) => setPeriodoId(e.target.value)} className={campo}>
        <option value="">Periodo…</option>
        {periodos.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Encolando…' : 'Generar boletín'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Encolado ✓ — aparecerá abajo en unos segundos</p>}
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
      className="flex flex-wrap gap-2"
    >
      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={campo}>
        <option value="">Curso…</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <select value={periodoId} onChange={(e) => setPeriodoId(e.target.value)} className={campo}>
        <option value="">Periodo…</option>
        {periodos.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Encolando…' : 'Generar boletines del curso'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && accion.result.data && (
        <p className="w-full text-xs text-exito">
          {accion.result.data.encolados} de {accion.result.data.total} boletines encolados ✓
        </p>
      )}
    </form>
  )
}
