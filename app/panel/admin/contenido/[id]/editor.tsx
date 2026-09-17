'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { editarEntradaCMS } from '@/src/acciones/cms/entrada'
import { agregarFotoAlbum, eliminarFotoAlbum } from '@/src/acciones/cms/album-foto'
import { subirImagen } from '../subir-imagen'
import type { CmsEntrada, CmsAlbumFoto } from '@/src/datos/esquema'

const campo = 'w-full rounded-sm border border-panel-borde bg-panel-lateral px-2 py-1 text-panel-texto'
const boton = 'rounded-sm bg-carmin px-3 py-1 text-hueso disabled:opacity-50'
const botonSecundario = 'rounded-sm border border-panel-borde px-3 py-1 text-panel-secundario hover:text-panel-texto disabled:opacity-50'

export function EditorEntrada({ entrada, fotos }: { entrada: CmsEntrada; fotos: CmsAlbumFoto[] }) {
  const [subtitulo, setSubtitulo] = useState(entrada.subtitulo ?? '')
  const [cuerpo, setCuerpo] = useState(entrada.cuerpo ?? '')
  const [metaDesc, setMetaDesc] = useState(entrada.metaDesc ?? '')
  const [metaImgId, setMetaImgId] = useState(entrada.metaImgId ?? '')
  const [subiendoPortada, setSubiendoPortada] = useState(false)

  const accion = useAction(editarEntradaCMS)

  async function subirPortada(archivo: File) {
    setSubiendoPortada(true)
    try {
      const subido = await subirImagen(archivo)
      setMetaImgId(subido.id)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo subir la imagen')
    } finally {
      setSubiendoPortada(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          accion.execute({
            id: entrada.id,
            subtitulo: subtitulo || undefined,
            cuerpo: cuerpo || undefined,
            metaDesc: metaDesc || undefined,
            metaImgId: metaImgId || undefined,
          })
        }}
        className="flex flex-col gap-4 rounded-sm border border-panel-borde p-4"
      >
        <div>
          <label className="mb-1 block text-sm text-panel-secundario">Subtítulo</label>
          <input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} className={campo} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-panel-secundario">Cuerpo</label>
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={10} className={campo} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-panel-secundario">Descripción (SEO)</label>
          <input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className={campo} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-panel-secundario">Imagen de portada</label>
          {metaImgId && (
            <img src={`/api/galeria/imagen/${metaImgId}`} alt="" className="mb-2 h-32 rounded-sm object-cover" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            disabled={subiendoPortada}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void subirPortada(archivo)
            }}
            className="text-sm text-panel-secundario"
          />
        </div>
        <button type="submit" disabled={accion.isExecuting} className={`${boton} w-fit`}>
          {accion.isExecuting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {accion.hasErrored && <p className="text-xs text-error">{accion.result.serverError}</p>}
        {accion.hasSucceeded && <p className="text-xs text-exito">Guardado ✓</p>}
      </form>

      {entrada.tipo === 'album' && <GestorFotos albumId={entrada.id} fotosIniciales={fotos} />}
    </div>
  )
}

function GestorFotos({ albumId, fotosIniciales }: { albumId: string; fotosIniciales: CmsAlbumFoto[] }) {
  const [fotos, setFotos] = useState(fotosIniciales)
  const [subiendo, setSubiendo] = useState(false)
  const accionAgregar = useAction(agregarFotoAlbum)
  const accionEliminar = useAction(eliminarFotoAlbum)

  async function subirFoto(archivo: File) {
    setSubiendo(true)
    try {
      const subido = await subirImagen(archivo)
      const resultado = await accionAgregar.executeAsync({
        albumId,
        archivoId: subido.id,
        alt: archivo.name,
        orden: fotos.length,
      })
      if (resultado?.data) {
        setFotos((f) => [...f, resultado.data!])
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="rounded-sm border border-panel-borde p-4">
      <h2 className="mb-3 font-display text-lg">Fotos del álbum</h2>
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {fotos.map((foto) => (
          <div key={foto.id} className="relative">
            <img src={`/api/galeria/imagen/${foto.archivoId}`} alt={foto.alt} className="aspect-square w-full rounded-sm object-cover" />
            <button
              onClick={async () => {
                await accionEliminar.executeAsync({ id: foto.id })
                setFotos((f) => f.filter((x) => x.id !== foto.id))
              }}
              className="absolute right-1 top-1 rounded-sm bg-tinta/80 px-1 text-xs text-hueso"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        disabled={subiendo}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void subirFoto(archivo)
        }}
        className={`text-sm text-panel-secundario ${botonSecundario}`}
      />
    </div>
  )
}
