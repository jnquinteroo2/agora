'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { registrarCalificacion } from '@/src/acciones/calificaciones/calificacion'
import { generarBoletin } from '@/src/acciones/calificaciones/boletin'

interface Estudiante {
  matriculaId: string
  nombre: string
}

interface NotaExistente {
  matriculaId: string
  nota: string | null
  fallas: number
  descriptorId: string | null
  bloqueado: boolean
}

interface Descriptor {
  id: string
  nivel: string
  texto: string
}

interface Props {
  asignaturaId: string
  periodoId: string
  periodoAbierto: boolean
  estudiantes: Estudiante[]
  notasExistentes: NotaExistente[]
  descriptores: Descriptor[]
}

export function TablaPlanilla({
  asignaturaId,
  periodoId,
  periodoAbierto,
  estudiantes,
  notasExistentes,
  descriptores,
}: Props) {
  const notaPorMatricula = new Map(notasExistentes.map((n) => [n.matriculaId, n]))

  if (!periodoAbierto) {
    return (
      <div className="rounded-sm border border-panel-borde bg-panel-lateral/30 p-4 text-panel-secundario">
        Este periodo está cerrado: las notas ya no se pueden modificar desde aquí.
      </div>
    )
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-panel-borde text-left text-panel-secundario">
          <th className="py-2">Estudiante</th>
          <th className="py-2">Nota</th>
          <th className="py-2">Fallas</th>
          <th className="py-2">Descriptor</th>
          <th className="py-2"></th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {estudiantes.map((estudiante) => (
          <FilaPlanilla
            key={estudiante.matriculaId}
            estudiante={estudiante}
            asignaturaId={asignaturaId}
            periodoId={periodoId}
            existente={notaPorMatricula.get(estudiante.matriculaId)}
            descriptores={descriptores}
          />
        ))}
      </tbody>
    </table>
  )
}

function FilaPlanilla({
  estudiante,
  asignaturaId,
  periodoId,
  existente,
  descriptores,
}: {
  estudiante: Estudiante
  asignaturaId: string
  periodoId: string
  existente?: NotaExistente
  descriptores: Descriptor[]
}) {
  const [nota, setNota] = useState(existente?.nota ?? '')
  const [fallas, setFallas] = useState(existente?.fallas ?? 0)
  const [descriptorId, setDescriptorId] = useState(existente?.descriptorId ?? '')

  const accion = useAction(registrarCalificacion)
  const accionBoletin = useAction(generarBoletin)
  const bloqueado = existente?.bloqueado ?? false

  function guardar() {
    const notaNumerica = Number(nota)
    if (!nota || Number.isNaN(notaNumerica) || notaNumerica < 1 || notaNumerica > 5) return

    accion.execute({
      matriculaId: estudiante.matriculaId,
      asignaturaId,
      periodoId,
      nota: notaNumerica,
      fallas,
      descriptorId: descriptorId || undefined,
    })
  }

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{estudiante.nombre}</td>
      <td className="py-2 pr-3">
        <input
          type="number"
          step="0.1"
          min={1}
          max={5}
          disabled={bloqueado}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="w-20 rounded-sm border border-panel-borde bg-panel-lateral px-2 py-1 text-panel-texto disabled:opacity-50"
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          min={0}
          disabled={bloqueado}
          value={fallas}
          onChange={(e) => setFallas(Number(e.target.value))}
          className="w-16 rounded-sm border border-panel-borde bg-panel-lateral px-2 py-1 text-panel-texto disabled:opacity-50"
        />
      </td>
      <td className="py-2 pr-3">
        <select
          disabled={bloqueado}
          value={descriptorId}
          onChange={(e) => setDescriptorId(e.target.value)}
          className="max-w-[220px] rounded-sm border border-panel-borde bg-panel-lateral px-2 py-1 text-panel-texto disabled:opacity-50"
        >
          <option value="">—</option>
          {descriptores.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nivel}: {d.texto.slice(0, 40)}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        {bloqueado ? (
          <span className="text-panel-secundario">Bloqueada</span>
        ) : (
          <button
            onClick={guardar}
            disabled={accion.isExecuting}
            className="rounded-sm bg-carmin px-3 py-1 text-hueso disabled:opacity-50"
          >
            {accion.isExecuting ? 'Guardando…' : 'Guardar'}
          </button>
        )}
        {accion.hasErrored && <p className="text-xs text-error">{accion.result.serverError}</p>}
        {accion.hasSucceeded && <p className="text-xs text-exito">Guardado ✓</p>}
      </td>
      <td className="py-2">
        <button
          onClick={() => accionBoletin.execute({ matriculaId: estudiante.matriculaId, periodoId })}
          disabled={accionBoletin.isExecuting}
          className="rounded-sm border border-panel-borde px-3 py-1 text-panel-secundario hover:text-panel-texto disabled:opacity-50"
        >
          {accionBoletin.isExecuting ? 'Encolando…' : 'Generar boletín'}
        </button>
        {accionBoletin.hasErrored && <p className="text-xs text-error">{accionBoletin.result.serverError}</p>}
        {accionBoletin.hasSucceeded && <p className="text-xs text-exito">En proceso ✓</p>}
      </td>
    </tr>
  )
}
