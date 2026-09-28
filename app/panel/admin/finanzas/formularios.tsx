'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { registrarRecibo, anularRecibo, generarPDFRecibo } from '@/src/acciones/financiero/recibo'
import { registrarEgreso, anularEgreso, generarPDFEgreso } from '@/src/acciones/financiero/egreso'
import type { ReciboCaja, Egreso } from '@/src/datos/esquema'
import { campo, boton, botonSecundario, etiqueta } from '@/src/ui/estilos'

const FORMAS_PAGO = ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro'] as const
const ETIQUETAS_FORMA_PAGO: Record<(typeof FORMAS_PAGO)[number], string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
}

interface Concepto {
  id: string
  nombre: string
}

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
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className={etiqueta}>
        <span>Recibido de</span>
        <input
          value={beneficiario}
          onChange={(e) => setBeneficiario(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Concepto</span>
        <select
          value={conceptoId}
          onChange={(e) => setConceptoId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {conceptos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Identificador de la matrícula (opcional)</span>
        <input
          value={matriculaId}
          onChange={(e) => setMatriculaId(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Valor</span>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          type="number"
          min={1}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Forma de pago</span>
        <select
          value={formaPago}
          onChange={(e) => setFormaPago(e.target.value as typeof formaPago)}
          className={`${campo} w-full`}
        >
          {FORMAS_PAGO.map((f) => (
            <option key={f} value={f}>
              {ETIQUETAS_FORMA_PAGO[f]}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Fecha</span>
        <input
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          type="date"
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Descripción (opcional)</span>
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar recibo'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">Recibo registrado</p>
      )}
    </form>
  )
}

interface Categoria {
  id: string
  nombre: string
}

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
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className={etiqueta}>
        <span>Pagado a</span>
        <input
          value={beneficiario}
          onChange={(e) => setBeneficiario(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Categoría</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={`${campo} w-full`}
        >
          <option value="">Seleccione</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Valor</span>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          type="number"
          min={1}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Fecha</span>
        <input
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          type="date"
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Descripción (opcional)</span>
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Registrando…' : 'Registrar egreso'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
      {accion.hasSucceeded && (
        <p className="text-menudo text-exito sm:col-span-2 lg:col-span-4">Egreso registrado</p>
      )}
    </form>
  )
}

export function FilaRecibo({ recibo }: { recibo: ReciboCaja }) {
  const accionAnular = useAction(anularRecibo)
  const accionPDF = useAction(generarPDFRecibo)

  return (
    <tr className="border-b border-borde">
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
        {accionPDF.hasSucceeded && <span className="text-menudo text-exito">En proceso</span>}
      </td>
    </tr>
  )
}

export function FilaEgreso({ egreso }: { egreso: Egreso }) {
  const accionAnular = useAction(anularEgreso)
  const accionPDF = useAction(generarPDFEgreso)

  return (
    <tr className="border-b border-borde">
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
        {accionPDF.hasSucceeded && <span className="text-menudo text-exito">En proceso</span>}
      </td>
    </tr>
  )
}
