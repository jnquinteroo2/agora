'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { crearAnioLectivo, activarAnioLectivo } from '@/src/acciones/configuracion/anio-lectivo'
import {
  crearJornada,
  crearCiclo,
  crearArea,
  crearAsignatura,
  crearPeriodo,
  abrirCerrarPeriodo,
  crearCurso,
  agregarAsignaturaPlan,
} from '@/src/acciones/configuracion/estructura'
import { eliminarAsignatura, eliminarCurso } from '@/src/acciones/configuracion/estructura'
import type { AnioLectivo, Periodo, Curso, Asignatura } from '@/src/datos/esquema'
import { campo, boton, botonSecundario } from '@/src/ui/estilos'

const ESQUEMAS = ['cuatro', 'tres', 'dos', 'anual'] as const

interface Opcion { id: string; nombre: string }


export function FormularioAnioLectivo() {
  const [nombre, setNombre] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')

  const accion = useAction(crearAnioLectivo, {
    onSuccess: () => { setNombre(''); setInicio(''); setFin('') },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombre.trim() || !inicio || !fin) return
        accion.execute({ nombre: nombre.trim(), inicio, fin, activo: false })
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. 2027)" className={`${campo} w-40`} />
      <input value={inicio} onChange={(e) => setInicio(e.target.value)} type="date" className={campo} />
      <input value={fin} onChange={(e) => setFin(e.target.value)} type="date" className={campo} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Crear año lectivo'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaAnioLectivo({ anio }: { anio: AnioLectivo }) {
  const router = useRouter()
  const accion = useAction(activarAnioLectivo, {
    onSuccess: () => router.refresh(),
  })

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{anio.nombre}</td>
      <td className="py-2 pr-3">{anio.inicio} a {anio.fin}</td>
      <td className="py-2 pr-3">{anio.activo ? 'Activo' : '—'}</td>
      <td className="py-2">
        {!anio.activo && (
          <button
            onClick={() => accion.execute({ id: anio.id })}
            disabled={accion.isExecuting}
            className={botonSecundario}
          >
            {accion.isExecuting ? 'Activando…' : 'Activar'}
          </button>
        )}
      </td>
    </tr>
  )
}


export function FormularioJornada() {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const accion = useAction(crearJornada, { onSuccess: () => { setCodigo(''); setNombre('') } })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!codigo.trim() || !nombre.trim()) return
        accion.execute({ codigo: codigo.trim(), nombre: nombre.trim() })
      }}
      className="flex gap-2"
    >
      <input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={1} placeholder="Código (1 letra)" className={`${campo} w-32`} />
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. Mañana)" className={`${campo} flex-1`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Añadir'}
      </button>
      {accion.hasErrored && <p className="text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FormularioCiclo() {
  const [codigo, setCodigo] = useState('')
  const [gradoEquivalente, setGradoEquivalente] = useState('')
  const [esquemaPeriodos, setEsquemaPeriodos] = useState<(typeof ESQUEMAS)[number]>('cuatro')
  const accion = useAction(crearCiclo, { onSuccess: () => { setCodigo(''); setGradoEquivalente('') } })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!codigo.trim() || !gradoEquivalente.trim()) return
        accion.execute({ codigo: codigo.trim(), gradoEquivalente: gradoEquivalente.trim(), esquemaPeriodos })
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código (ej. CLEI-4)" className={`${campo} w-32`} />
      <input value={gradoEquivalente} onChange={(e) => setGradoEquivalente(e.target.value)} placeholder="Grado equivalente" className={`${campo} w-48`} />
      <select value={esquemaPeriodos} onChange={(e) => setEsquemaPeriodos(e.target.value as typeof esquemaPeriodos)} className={campo}>
        {ESQUEMAS.map((e) => (
          <option key={e} value={e}>{e} periodos</option>
        ))}
      </select>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Añadir'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FormularioArea() {
  const [nombre, setNombre] = useState('')
  const accion = useAction(crearArea, { onSuccess: () => setNombre('') })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombre.trim()) return
        accion.execute({ nombre: nombre.trim() })
      }}
      className="flex gap-2"
    >
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del área" className={`${campo} flex-1`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Añadir'}
      </button>
      {accion.hasErrored && <p className="text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}


export function FormularioAsignatura({ areas }: { areas: Opcion[] }) {
  const [areaId, setAreaId] = useState('')
  const [nombre, setNombre] = useState('')
  const accion = useAction(crearAsignatura, { onSuccess: () => setNombre('') })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!areaId || !nombre.trim()) return
        accion.execute({ areaId, nombre: nombre.trim() })
      }}
      className="flex flex-wrap gap-2"
    >
      <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={campo}>
        <option value="">Área…</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la materia" className={`${campo} flex-1`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Añadir'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaAsignatura({ asignatura, nombreArea }: { asignatura: Asignatura; nombreArea: string }) {
  const accion = useAction(eliminarAsignatura)
  if (accion.hasSucceeded) return null

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{asignatura.nombre}</td>
      <td className="py-2 pr-3">{nombreArea}</td>
      <td className="py-2">
        <button onClick={() => accion.execute({ id: asignatura.id })} disabled={accion.isExecuting} className={botonSecundario}>
          {accion.isExecuting ? 'Eliminando…' : 'Eliminar'}
        </button>
      </td>
    </tr>
  )
}


export function FormularioPlanAsignatura({
  anioLectivoId,
  ciclos,
  asignaturas,
}: {
  anioLectivoId: string | null
  ciclos: Opcion[]
  asignaturas: Opcion[]
}) {
  const [cicloId, setCicloId] = useState('')
  const [asignaturaId, setAsignaturaId] = useState('')
  const [horasSemana, setHorasSemana] = useState('1')
  const accion = useAction(agregarAsignaturaPlan, { onSuccess: () => setHorasSemana('1') })

  if (!anioLectivoId) return <p className="text-sm text-panel-secundario">Active un año lectivo primero.</p>

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!cicloId || !asignaturaId) return
        accion.execute({ anioLectivoId, cicloId, asignaturaId, horasSemana: Number(horasSemana) || 1 })
      }}
      className="flex flex-wrap gap-2"
    >
      <select value={cicloId} onChange={(e) => setCicloId(e.target.value)} className={campo}>
        <option value="">Ciclo…</option>
        {ciclos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <select value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)} className={campo}>
        <option value="">Materia…</option>
        {asignaturas.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>
      <input
        value={horasSemana}
        onChange={(e) => setHorasSemana(e.target.value)}
        type="number"
        min={1}
        max={40}
        placeholder="Horas/semana"
        className={`${campo} w-28`}
      />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Guardando…' : 'Añadir al plan'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}


export function FormularioPeriodo({ anioLectivoId }: { anioLectivoId: string | null }) {
  const [numero, setNumero] = useState('1')
  const [esquema, setEsquema] = useState<(typeof ESQUEMAS)[number]>('cuatro')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const accion = useAction(crearPeriodo, { onSuccess: () => { setInicio(''); setFin('') } })

  if (!anioLectivoId) return <p className="text-sm text-panel-secundario">Active un año lectivo primero.</p>

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!inicio || !fin) return
        accion.execute({ anioLectivoId, numero: Number(numero) || 1, esquema, inicio, fin })
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={numero} onChange={(e) => setNumero(e.target.value)} type="number" min={1} max={4} className={`${campo} w-20`} />
      <select value={esquema} onChange={(e) => setEsquema(e.target.value as typeof esquema)} className={campo}>
        {ESQUEMAS.map((e) => (
          <option key={e} value={e}>{e} periodos</option>
        ))}
      </select>
      <input value={inicio} onChange={(e) => setInicio(e.target.value)} type="date" className={campo} />
      <input value={fin} onChange={(e) => setFin(e.target.value)} type="date" className={campo} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Crear periodo'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaPeriodo({ periodo }: { periodo: Periodo }) {
  const [notasAbiertas, setNotasAbiertas] = useState(periodo.notasAbiertas)
  const accion = useAction(abrirCerrarPeriodo, {
    onSuccess: () => setNotasAbiertas((v) => !v),
  })

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">Periodo {periodo.numero}</td>
      <td className="py-2 pr-3">{periodo.inicio} a {periodo.fin}</td>
      <td className="py-2 pr-3">{notasAbiertas ? 'Notas abiertas' : 'Notas cerradas'}</td>
      <td className="py-2">
        <button
          onClick={() => accion.execute({ periodoId: periodo.id, abrir: !notasAbiertas })}
          disabled={accion.isExecuting}
          className={botonSecundario}
        >
          {accion.isExecuting ? 'Guardando…' : notasAbiertas ? 'Cerrar notas' : 'Abrir notas'}
        </button>
      </td>
    </tr>
  )
}


export function FormularioCurso({
  anioLectivoId,
  ciclos,
  jornadas,
}: {
  anioLectivoId: string | null
  ciclos: Opcion[]
  jornadas: Opcion[]
}) {
  const [cicloId, setCicloId] = useState('')
  const [jornadaId, setJornadaId] = useState('')
  const [nombre, setNombre] = useState('')
  const accion = useAction(crearCurso, { onSuccess: () => setNombre('') })

  if (!anioLectivoId) return <p className="text-sm text-panel-secundario">Active un año lectivo primero.</p>

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!cicloId || !jornadaId || !nombre.trim()) return
        accion.execute({ anioLectivoId, cicloId, jornadaId, nombre: nombre.trim() })
      }}
      className="flex flex-wrap gap-2"
    >
      <select value={cicloId} onChange={(e) => setCicloId(e.target.value)} className={campo}>
        <option value="">Ciclo…</option>
        {ciclos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <select value={jornadaId} onChange={(e) => setJornadaId(e.target.value)} className={campo}>
        <option value="">Jornada…</option>
        {jornadas.map((j) => (
          <option key={j.id} value={j.id}>{j.nombre}</option>
        ))}
      </select>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del curso" className={`${campo} flex-1`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Crear curso'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaCurso({ curso, cicloNombre, jornadaNombre }: { curso: Curso; cicloNombre: string; jornadaNombre: string }) {
  const accion = useAction(eliminarCurso)
  if (accion.hasSucceeded) return null

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{curso.nombre}</td>
      <td className="py-2 pr-3">{cicloNombre}</td>
      <td className="py-2 pr-3">{jornadaNombre}</td>
      <td className="py-2">
        <button onClick={() => accion.execute({ id: curso.id })} disabled={accion.isExecuting} className={botonSecundario}>
          {accion.isExecuting ? 'Eliminando…' : 'Eliminar'}
        </button>
      </td>
    </tr>
  )
}
