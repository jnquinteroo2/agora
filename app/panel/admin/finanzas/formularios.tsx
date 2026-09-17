'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { registrarRecibo, anularRecibo, generarPDFRecibo } from '@/src/acciones/financiero/recibo'
import { registrarEgreso, anularEgreso, generarPDFEgreso } from '@/src/acciones/financiero/egreso'
import type { ReciboCaja, Egreso } from '@/src/datos/esquema'
import { campo, boton, botonSecundario } from '@/src/ui/estilos'

const FORMAS_PAGO = ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro'] as const

interface Concepto { id: string; nombre: string }

export function FormularioRecibo({ conceptos }: { conceptos: Concepto[] }) {
  const [matriculaId, setMatriculaId] = useState('')
  const [beneficiario, setBeneficiario] = useState('')
  const [conceptoId, setConceptoId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [valor, setValor] = useState('')
  const [formaPago, setFormaPago] = useState<(typeof FORMAS_PAGO)[number]>('efectivo')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))

  const accion = useAction(registrarRecibo, {
    onSuccess: () => {
      setMatriculaId('')
      setBeneficiario('')
      setDescripcion('')
      setValor('')
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const valorNumerico = Number(valor)
        if (!beneficiario.trim() || !conceptoId || !valorNumerico || valorNumerico <= 0) return
        accion.execute({
          matriculaId: matriculaId.trim() || undefined,
          beneficiario: beneficiario.trim(),
          conceptoId,
          descripcion: descripcion.trim() || undefined,
          valor: valorNumerico,
          formaPago,
          fecha,
        })
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Recibido de" className={`${campo} w-56`} />
      <select value={conceptoId} onChange={(e) => setConceptoId(e.target.value)} className={campo}>
        <option value="">Concepto…</option>
        {conceptos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <input
        value={matriculaId}
        onChange={(e) => setMatriculaId(e.target.value)}
        placeholder="ID de matrícula (opcional)"
        className={`${campo} w-64`}
      />
      <input value={valor} onChange={(e) => setValor(e.target.value)} type="number" min={1} placeholder="Valor" className={`${campo} w-32`} />
      <select value={formaPago} onChange={(e) => setFormaPago(e.target.value as typeof formaPago)} className={campo}>
        {FORMAS_PAGO.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" className={campo} />
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className={`${campo} w-56`}
      />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar recibo'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Recibo registrado ✓</p>}
    </form>
  )
}

interface Categoria { id: string; nombre: string }

export function FormularioEgreso({ categorias }: { categorias: Categoria[] }) {
  const [categoriaId, setCategoriaId] = useState('')
  const [beneficiario, setBeneficiario] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))

  const accion = useAction(registrarEgreso, {
    onSuccess: () => {
      setBeneficiario('')
      setDescripcion('')
      setValor('')
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const valorNumerico = Number(valor)
        if (!beneficiario.trim() || !categoriaId || !valorNumerico || valorNumerico <= 0) return
        accion.execute({
          categoriaId,
          beneficiario: beneficiario.trim(),
          descripcion: descripcion.trim() || undefined,
          valor: valorNumerico,
          fecha,
        })
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Pagado a" className={`${campo} w-56`} />
      <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={campo}>
        <option value="">Categoría…</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <input value={valor} onChange={(e) => setValor(e.target.value)} type="number" min={1} placeholder="Valor" className={`${campo} w-32`} />
      <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" className={campo} />
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className={`${campo} w-56`}
      />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar egreso'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
      {accion.hasSucceeded && <p className="w-full text-xs text-exito">Egreso registrado ✓</p>}
    </form>
  )
}

export function FilaRecibo({ recibo }: { recibo: ReciboCaja }) {
  const accionAnular = useAction(anularRecibo)
  const accionPDF = useAction(generarPDFRecibo)

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{recibo.consecutivo}</td>
      <td className="py-2 pr-3">{recibo.fecha}</td>
      <td className="py-2 pr-3">{recibo.beneficiario}</td>
      <td className="py-2 pr-3">{Number(recibo.valor).toLocaleString('es-CO')}</td>
      <td className="py-2 pr-3">{recibo.anulado ? 'Anulado' : 'Vigente'}</td>
      <td className="flex gap-2 py-2">
        {!recibo.anulado && (
          <button
            onClick={() => {
              const motivo = window.prompt('Motivo de anulación')
              if (motivo) accionAnular.execute({ reciboId: recibo.id, motivo })
            }}
            disabled={accionAnular.isExecuting}
            className={botonSecundario}
          >
            Anular
          </button>
        )}
        <button
          onClick={() => accionPDF.execute({ reciboId: recibo.id })}
          disabled={accionPDF.isExecuting}
          className={botonSecundario}
        >
          {accionPDF.isExecuting ? 'Encolando…' : 'Generar PDF'}
        </button>
        {accionPDF.hasSucceeded && <span className="text-xs text-exito">En proceso ✓</span>}
      </td>
    </tr>
  )
}

export function FilaEgreso({ egreso }: { egreso: Egreso }) {
  const accionAnular = useAction(anularEgreso)
  const accionPDF = useAction(generarPDFEgreso)

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{egreso.consecutivo}</td>
      <td className="py-2 pr-3">{egreso.fecha}</td>
      <td className="py-2 pr-3">{egreso.beneficiario}</td>
      <td className="py-2 pr-3">{Number(egreso.valor).toLocaleString('es-CO')}</td>
      <td className="py-2 pr-3">{egreso.anulado ? 'Anulado' : 'Vigente'}</td>
      <td className="flex gap-2 py-2">
        {!egreso.anulado && (
          <button
            onClick={() => {
              const motivo = window.prompt('Motivo de anulación')
              if (motivo) accionAnular.execute({ egresoId: egreso.id, motivo })
            }}
            disabled={accionAnular.isExecuting}
            className={botonSecundario}
          >
            Anular
          </button>
        )}
        <button
          onClick={() => accionPDF.execute({ egresoId: egreso.id })}
          disabled={accionPDF.isExecuting}
          className={botonSecundario}
        >
          {accionPDF.isExecuting ? 'Encolando…' : 'Generar PDF'}
        </button>
        {accionPDF.hasSucceeded && <span className="text-xs text-exito">En proceso ✓</span>}
      </td>
    </tr>
  )
}
