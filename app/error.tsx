'use client'

import Link from 'next/link'
import { Contenedor } from '@/src/ui/contenedor'
import { Boton } from '@/src/ui/boton'

export default function PaginaDeError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-hueso text-tinta">
      <main id="contenido" className="flex flex-1 items-center py-aire">
        <Contenedor ancho="amplio" className="flex flex-col items-start gap-6">
          <p className="versalitas text-menudo text-piedra">Error</p>
          <h1 className="equilibrado font-display text-portada font-medium text-tinta">
            No se pudo cargar esta página
          </h1>
          <p className="prosa max-w-medida text-guia leading-relaxed text-piedra">
            Ocurrió un problema al preparar la página. Puede intentarlo de nuevo en unos segundos.
            Si el problema continúa, vuelva más tarde.
          </p>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <Boton type="button" tono="primario" talla="lg" onClick={() => reset()}>
              Intentar de nuevo
            </Boton>
            <Link
              href="/inicio"
              className="transicion-ui text-nota text-tinta underline decoration-piedra underline-offset-4 hover:decoration-tinta"
            >
              Ir al inicio
            </Link>
          </div>
        </Contenedor>
      </main>
    </div>
  )
}
