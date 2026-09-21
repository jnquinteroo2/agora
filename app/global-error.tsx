'use client'

import './globals.css'

export default function ErrorGlobal({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es-CO">
      <body className="bg-hueso text-tinta">
        <main className="mx-auto flex min-h-dvh max-w-amplio flex-col items-start justify-center gap-6 px-margen py-aire">
          <p className="text-menudo text-piedra uppercase">Error</p>
          <h1 className="font-display text-portada font-medium text-tinta">
            No se pudo cargar el sitio
          </h1>
          <p className="max-w-medida text-guia leading-relaxed text-piedra">
            Ocurrió un problema al preparar la página. Puede intentarlo de nuevo en unos segundos.
            Si el problema continúa, vuelva más tarde.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-12 items-center rounded-sm bg-carmin px-6 text-cuerpo font-medium text-hueso hover:bg-carmin-hondo"
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  )
}
