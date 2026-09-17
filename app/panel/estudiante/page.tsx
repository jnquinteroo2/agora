import Link from 'next/link'
import { obtenerUsuarioActual } from '@/src/auth/sesion'

export default async function InicioEstudiante() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Bienvenido(a)</h1>
      <Link
        href="/panel/estudiante/calificaciones"
        className="w-fit rounded-sm border border-panel-borde bg-panel-lateral/40 px-4 py-3 hover:border-carmin"
      >
        Ver mis calificaciones y boletines
      </Link>
    </div>
  )
}
