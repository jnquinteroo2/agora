'use client'

import { useEffect } from 'react'
import './globals.css'
import { temaDelSistema, temaGuardado, aplicarTema } from '@/src/ui/tema'

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    aplicarTema(temaGuardado() ?? temaDelSistema())
  }, [])

  return (
    <html lang="es-CO">
      <body className="bg-superficie text-texto">
        <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-margen py-aire">
          <h1 className="font-titulo text-portada font-medium text-texto">
            No se pudo cargar el sitio
          </h1>
          <p className="max-w-medida text-guia text-texto-secundario">
            Ocurrió un problema al preparar la página. Puede intentarlo de nuevo en unos segundos.
            Si el problema continúa, vuelva más tarde.
          </p>
          {error.digest ? (
            <p className="text-nota text-texto-secundario">
              Código de referencia: <span className="font-mono text-texto">{error.digest}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="presionable inline-flex h-12 items-center rounded-control bg-acento px-6 text-cuerpo font-medium text-sobre-acento hover:bg-acento-hover"
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  )
}
