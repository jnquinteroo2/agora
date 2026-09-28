'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { campo, boton, botonSecundario, etiqueta } from '@/src/ui/estilos'
import { crearEntradaCMS, publicarEntradaCMS, eliminarEntradaCMS } from '@/src/acciones/cms/entrada'
import type { CmsEntrada } from '@/src/datos/esquema'

const TIPOS = ['noticia', 'album', 'pagina'] as const
const ETIQUETAS_TIPO: Record<(typeof TIPOS)[number], string> = {
  noticia: 'Noticia',
  album: 'Álbum',
  pagina: 'Página',
}

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
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className={etiqueta}>
        <span>Tipo</span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as typeof tipo)}
          className={`${campo} w-full`}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ETIQUETAS_TIPO[t]}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        <span>Título</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <label className={etiqueta}>
        <span>Dirección (slug, en minúsculas)</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={`${campo} w-full`}
        />
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Crear'}
      </button>
      {accion.hasErrored && (
        <p className="text-menudo text-error sm:col-span-2 lg:col-span-4">
          {accion.result.serverError}
        </p>
      )}
    </form>
  )
}

export function FilaEntrada({ entrada }: { entrada: CmsEntrada }) {
  const accionPublicar = useAction(publicarEntradaCMS)
  const accionEliminar = useAction(eliminarEntradaCMS)

  if (accionEliminar.hasSucceeded) return null

  return (
    <tr className="border-b border-borde">
      <td className="py-2 pr-3">{entrada.tipo}</td>
      <td className="py-2 pr-3">
        <Link href={`/panel/admin/contenido/${entrada.id}`} className="hover:text-acento-texto">
          {entrada.titulo}
        </Link>
      </td>
      <td className="py-2 pr-3">{entrada.slug}</td>
      <td className="py-2 pr-3">{entrada.estado === 'publicado' ? 'Publicado' : 'Borrador'}</td>
      <td className="flex gap-2 py-2">
        <button
          onClick={() =>
            accionPublicar.execute({ id: entrada.id, publicado: entrada.estado !== 'publicado' })
          }
          disabled={accionPublicar.isExecuting}
          className={botonSecundario}
        >
          {entrada.estado === 'publicado' ? 'Despublicar' : 'Publicar'}
        </button>
        <button
          onClick={() => {
            if (window.confirm('¿Eliminar esta entrada?'))
              accionEliminar.execute({ id: entrada.id })
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
