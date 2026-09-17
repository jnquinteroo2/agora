'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { guardarConfiguracion } from '@/src/acciones/configuracion/institucion'
import {
  crearConceptoIngreso,
  eliminarConceptoIngreso,
  crearCategoriaEgreso,
  eliminarCategoriaEgreso,
} from '@/src/acciones/financiero/concepto-categoria'
import { crearPlanCobro } from '@/src/acciones/financiero/plan-cobro'
import type { ConfiguracionInstitucional } from '@/src/datos/esquema'
import { campo, boton } from '@/src/ui/estilos'

interface ConceptoOCategoria { id: string; nombre: string }

export function FormularioInstitucion({ actual }: { actual: ConfiguracionInstitucional | null }) {
  const [nombreLegal, setNombreLegal] = useState(actual?.nombreLegal ?? '')
  const [nombreCorto, setNombreCorto] = useState(actual?.nombreCorto ?? '')
  const [lema, setLema] = useState(actual?.lema ?? '')
  const [nit, setNit] = useState(actual?.nit ?? '')
  const [dane, setDane] = useState(actual?.dane ?? '')
  const [resolucion, setResolucion] = useState(actual?.resolucion ?? '')
  const [direccion, setDireccion] = useState(actual?.direccion ?? '')
  const [municipio, setMunicipio] = useState(actual?.municipio ?? '')
  const [departamento, setDepartamento] = useState(actual?.departamento ?? '')
  const [telefono, setTelefono] = useState(actual?.telefono ?? '')
  const [correo, setCorreo] = useState(actual?.correo ?? '')
  const [rectorNombre, setRectorNombre] = useState(actual?.rectorNombre ?? '')
  const [dirAdmNombre, setDirAdmNombre] = useState(actual?.dirAdmNombre ?? '')

  const accion = useAction(guardarConfiguracion)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombreLegal.trim() || !nombreCorto.trim() || !rectorNombre.trim() || !dirAdmNombre.trim()) return
        accion.execute({
          nombreLegal: nombreLegal.trim(),
          nombreCorto: nombreCorto.trim(),
          lema: lema.trim() || undefined,
          nit: nit.trim() || undefined,
          dane: dane.trim() || undefined,
          resolucion: resolucion.trim() || undefined,
          direccion: direccion.trim() || undefined,
          municipio: municipio.trim() || undefined,
          departamento: departamento.trim() || undefined,
          telefono: telefono.trim() || undefined,
          correo: correo.trim() || undefined,
          rectorNombre: rectorNombre.trim(),
          dirAdmNombre: dirAdmNombre.trim(),
        })
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={nombreLegal} onChange={(e) => setNombreLegal(e.target.value)} placeholder="Nombre legal" className={`${campo} w-72`} />
      <input value={nombreCorto} onChange={(e) => setNombreCorto(e.target.value)} placeholder="Nombre corto" className={`${campo} w-48`} />
      <input value={lema} onChange={(e) => setLema(e.target.value)} placeholder="Lema (opcional)" className={`${campo} w-72`} />
      <input value={nit} onChange={(e) => setNit(e.target.value)} placeholder="NIT (opcional)" className={`${campo} w-40`} />
      <input value={dane} onChange={(e) => setDane(e.target.value)} placeholder="DANE (opcional)" className={`${campo} w-40`} />
      <input value={resolucion} onChange={(e) => setResolucion(e.target.value)} placeholder="Resolución (opcional)" className={`${campo} w-56`} />
      <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección (opcional)" className={`${campo} w-56`} />
      <input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Municipio (opcional)" className={`${campo} w-40`} />
      <input value={departamento} onChange={(e) => setDepartamento(e.target.value)} placeholder="Departamento (opcional)" className={`${campo} w-40`} />
      <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" className={`${campo} w-40`} />
      <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo (opcional)" className={`${campo} w-56`} />
      <input value={rectorNombre} onChange={(e) => setRectorNombre(e.target.value)} placeholder="Nombre del rector" className={`${campo} w-56`} />
      <input value={dirAdmNombre} onChange={(e) => setDirAdmNombre(e.target.value)} placeholder="Nombre dir. administrativo" className={`${campo} w-56`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Guardando…' : 'Guardar configuración'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Guardado ✓</p>}
    </form>
  )
}

export function FormularioConcepto() {
  const [nombre, setNombre] = useState('')
  const accion = useAction(crearConceptoIngreso, { onSuccess: () => setNombre('') })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombre.trim()) return
        accion.execute({ nombre: nombre.trim() })
      }}
      className="flex gap-2"
    >
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del concepto" className={`${campo} flex-1`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Añadir'}
      </button>
      {accion.hasErrored && <p className="text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaConcepto({ concepto }: { concepto: ConceptoOCategoria }) {
  const accion = useAction(eliminarConceptoIngreso)
  if (accion.hasSucceeded) return null

  return (
    <li className="flex items-center justify-between gap-2 text-panel-secundario">
      <span>{concepto.nombre}</span>
      <button onClick={() => accion.execute({ id: concepto.id })} disabled={accion.isExecuting} className="text-xs hover:text-panel-texto">
        {accion.isExecuting ? 'Eliminando…' : 'Eliminar'}
      </button>
    </li>
  )
}

export function FormularioCategoria() {
  const [nombre, setNombre] = useState('')
  const accion = useAction(crearCategoriaEgreso, { onSuccess: () => setNombre('') })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombre.trim()) return
        accion.execute({ nombre: nombre.trim() })
      }}
      className="flex gap-2"
    >
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la categoría" className={`${campo} flex-1`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Añadir'}
      </button>
      {accion.hasErrored && <p className="text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaCategoria({ categoria }: { categoria: ConceptoOCategoria }) {
  const accion = useAction(eliminarCategoriaEgreso)
  if (accion.hasSucceeded) return null

  return (
    <li className="flex items-center justify-between gap-2 text-panel-secundario">
      <span>{categoria.nombre}</span>
      <button onClick={() => accion.execute({ id: categoria.id })} disabled={accion.isExecuting} className="text-xs hover:text-panel-texto">
        {accion.isExecuting ? 'Eliminando…' : 'Eliminar'}
      </button>
    </li>
  )
}

export function FormularioPlanCobro({
  matriculas,
  conceptos,
}: {
  matriculas: { id: string; nombre: string }[]
  conceptos: ConceptoOCategoria[]
}) {
  const [matriculaId, setMatriculaId] = useState('')
  const [conceptoId, setConceptoId] = useState('')
  const [mes, setMes] = useState('')
  const [valorProgramado, setValorProgramado] = useState('')
  const accion = useAction(crearPlanCobro, {
    onSuccess: () => { setValorProgramado(''); setMes('') },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const valor = Number(valorProgramado)
        if (!matriculaId || !conceptoId || !valor || valor <= 0) return
        accion.execute({
          matriculaId,
          conceptoId,
          mes: mes ? Number(mes) : undefined,
          valorProgramado: valor,
        })
      }}
      className="flex flex-wrap gap-2"
    >
      <select value={matriculaId} onChange={(e) => setMatriculaId(e.target.value)} className={`${campo} min-w-56`}>
        <option value="">Estudiante…</option>
        {matriculas.map((m) => (
          <option key={m.id} value={m.id}>{m.nombre}</option>
        ))}
      </select>
      <select value={conceptoId} onChange={(e) => setConceptoId(e.target.value)} className={campo}>
        <option value="">Concepto…</option>
        {conceptos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <input value={mes} onChange={(e) => setMes(e.target.value)} type="number" min={1} max={12} placeholder="Mes (opcional)" className={`${campo} w-32`} />
      <input value={valorProgramado} onChange={(e) => setValorProgramado(e.target.value)} type="number" min={1} placeholder="Valor programado" className={`${campo} w-36`} />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Guardando…' : 'Añadir plan de cobro'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Plan de cobro creado ✓</p>}
    </form>
  )
}
