import { BookOpen } from 'lucide-react'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { EncabezadoDeInicio, AccesosRapidos } from '@/src/ui/inicio-panel'

export default async function InicioEstudiante() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoDeInicio
        perfil="Estudiante"
        descripcion="Consulte sus calificaciones y el avance en cada periodo del año lectivo."
      />
      <AccesosRapidos
        accesos={[
          {
            href: '/panel/estudiante/calificaciones',
            titulo: 'Mis calificaciones',
            descripcion: 'Las notas de cada asignatura y los boletines generados.',
            icono: BookOpen,
          },
        ]}
      />
    </div>
  )
}
