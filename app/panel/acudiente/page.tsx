import { perfilPorClave } from '@/src/ui/perfiles'
import { EncabezadoDeInicio, AccesosRapidos } from '@/src/ui/inicio-panel'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { ACCESOS_PROXIMOS } from '../navegacion'

export default async function Inicio() {
  const perfil = perfilPorClave('acudiente')

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoDeInicio perfil="Acudiente" descripcion={perfil?.descripcion ?? ''} />
      <EstadoVacio
        como="h2"
        titulo="El panel de Acudiente está en preparación"
        descripcion="Las secciones de este perfil estarán disponibles pronto. Mientras tanto, su cuenta ya está activa y el acceso queda listo."
      />
      <AccesosRapidos titulo="Lo que encontrará aquí" accesos={ACCESOS_PROXIMOS['acudiente']} />
    </div>
  )
}
