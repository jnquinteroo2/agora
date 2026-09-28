'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAction } from 'next-safe-action/hooks'
import { campo as campoBase, boton, botonSecundario } from '@/src/ui/estilos'

const campo = `${campoBase} w-full`
import { editarEntradaCMS } from '@/src/acciones/cms/entrada'
import { agregarFotoAlbum, eliminarFotoAlbum } from '@/src/acciones/cms/album-foto'
import { subirImagen } from '../subir-imagen'
import type { CmsEntrada, CmsAlbumFoto } from '@/src/datos/esquema'

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
        className="flex flex-col gap-4 rounded-tarjeta border border-borde p-5"
      >
        <div>
          <label htmlFor="editor-subtitulo" className="mb-1 block text-nota font-medium text-texto">
            Subtítulo
          </label>
          <input
            id="editor-subtitulo"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="editor-cuerpo" className="mb-1 block text-nota font-medium text-texto">
            Cuerpo
          </label>
          <textarea
            id="editor-cuerpo"
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            rows={10}
            className={`${campo} h-auto py-2`}
          />
        </div>
        <div>
          <label
            htmlFor="editor-descripcion"
            className="mb-1 block text-nota font-medium text-texto"
          >
            Descripción para buscadores
          </label>
          <input
            id="editor-descripcion"
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label className="mb-1 block text-nota font-medium text-texto">Imagen de portada</label>
          {metaImgId && (
            <div className="relative mb-2 h-32 w-48 overflow-hidden rounded-control border border-borde">
              <Image
                src={`/api/galeria/imagen/${metaImgId}`}
                alt="Vista previa de la imagen de portada"
                fill
                sizes="12rem"
                className="object-cover"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            disabled={subiendoPortada}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void subirPortada(archivo)
            }}
            className="text-nota text-texto-secundario"
          />
        </div>
        <button type="submit" disabled={accion.isExecuting} className={`${boton} w-fit`}>
          {accion.isExecuting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {accion.hasErrored && <p className="text-menudo text-error">{accion.result.serverError}</p>}
        {accion.hasSucceeded && <p className="text-menudo text-exito">Guardado</p>}
      </form>

      {entrada.tipo === 'album' && <GestorFotos albumId={entrada.id} fotosIniciales={fotos} />}
    </div>
  )
}

function GestorFotos({
  albumId,
  fotosIniciales,
}: {
  albumId: string
  fotosIniciales: CmsAlbumFoto[]
}) {
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
    <div className="rounded-tarjeta border border-borde p-5">
      <h2 className="mb-3 font-titulo text-rubro">Fotos del álbum</h2>
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {fotos.map((foto) => (
          <div key={foto.id} className="relative">
            <div className="relative aspect-square w-full overflow-hidden rounded-control border border-borde">
              <Image
                src={`/api/galeria/imagen/${foto.archivoId}`}
                alt={foto.alt}
                fill
                sizes="(max-width: 768px) 50vw, 12rem"
                className="object-cover"
              />
            </div>
            <button
              onClick={async () => {
                await accionEliminar.executeAsync({ id: foto.id })
                setFotos((f) => f.filter((x) => x.id !== foto.id))
              }}
              className="absolute right-1 top-1 rounded-control bg-texto/80 px-1 text-menudo text-superficie"
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
        className={`text-nota text-texto-secundario ${botonSecundario}`}
      />
    </div>
  )
}
