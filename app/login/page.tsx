import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { FormularioLogin } from './formulario'

export const metadata: Metadata = {
  title: 'Ingresar',
}

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-panel-fondo px-4 py-12">
      <div className="w-full max-w-sm rounded-sm border border-panel-borde bg-panel-lateral/40 p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/marca/escudo-agora-512.png" alt="Escudo del Colegio Ágora" width={72} height={72} priority />
          <div>
            <h1 className="font-display text-2xl text-panel-texto">Colegio Ágora</h1>
            <p className="text-sm text-panel-secundario">Ingrese con su correo institucional</p>
          </div>
        </div>
        <Suspense fallback={<p className="text-sm text-panel-secundario">Cargando…</p>}>
          <FormularioLogin />
        </Suspense>
      </div>
    </main>
  )
}
