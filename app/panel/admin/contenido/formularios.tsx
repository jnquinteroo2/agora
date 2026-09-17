'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { crearEntradaCMS, publicarEntradaCMS, eliminarEntradaCMS } from '@/src/acciones/cms/entrada'
import type { CmsEntrada } from '@/src/datos/esquema'

const TIPOS = ['noticia', 'album', 'pagina'] as const

const campo = 'rounded-sm border border-panel-borde bg-panel-lateral px-2 py-1 text-panel-texto placeholder:text-panel-secundario'
const boton = 'rounded-sm bg-carmin px-3 py-1 text-hueso disabled:opacity-50'
const botonSecundario = 'rounded-sm border border-panel-borde px-3 py-1 text-panel-secundario hover:text-panel-texto disabled:opacity-50'

export function FormularioCrearEntrada() {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('noticia')
  const [slug, setSlug] = useState('')
  const [titulo, setTitulo] = useState('')

  const accion = useAction(crearEntradaCMS, {
    onSuccess: () => {
      setSlug('')
      setTitulo('')
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!slug.trim() || !titulo.trim()) return
        accion.execute({ tipo, slug: slug.trim(), titulo: titulo.trim() })
      }}
      className="flex flex-wrap gap-2"
    >
      <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={campo}>
        {TIPOS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className={`${campo} w-64`} />
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="slug-en-minusculas"
        className={`${campo} w-56`}
      />
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Crear'}
      </button>
      {accion.hasErrored && <p className="w-full text-xs text-error">{accion.result.serverError}</p>}
    </form>
  )
}

export function FilaEntrada({ entrada }: { entrada: CmsEntrada }) {
  const accionPublicar = useAction(publicarEntradaCMS)
  const accionEliminar = useAction(eliminarEntradaCMS)

  if (accionEliminar.hasSucceeded) return null

  return (
    <tr className="border-b border-panel-borde/50">
      <td className="py-2 pr-3">{entrada.tipo}</td>
      <td className="py-2 pr-3">
        <Link href={`/panel/admin/contenido/${entrada.id}`} className="hover:text-carmin">
          {entrada.titulo}
        </Link>
      </td>
      <td className="py-2 pr-3">{entrada.slug}</td>
      <td className="py-2 pr-3">{entrada.estado === 'publicado' ? 'Publicado' : 'Borrador'}</td>
      <td className="flex gap-2 py-2">
        <button
          onClick={() => accionPublicar.execute({ id: entrada.id, publicado: entrada.estado !== 'publicado' })}
          disabled={accionPublicar.isExecuting}
          className={botonSecundario}
        >
          {entrada.estado === 'publicado' ? 'Despublicar' : 'Publicar'}
        </button>
        <button
          onClick={() => {
            if (window.confirm('¿Eliminar esta entrada?')) accionEliminar.execute({ id: entrada.id })
          }}
          disabled={accionEliminar.isExecuting}
          className={botonSecundario}
        >
          Eliminar
        </button>
      </td>
    </tr>
  )
}
