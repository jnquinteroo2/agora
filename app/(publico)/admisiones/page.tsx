import { metadatosDePagina } from '@/src/seo/metadatos'
import { obtenerCiclos, obtenerJornadasConOferta } from '@/src/datos/oferta-publica'
import { obtenerConfiguracion, nombreLegal } from '@/src/datos/configuracion-publica'
import { crearTokenFormulario } from '@/src/datos/formulario-token'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { ordenarCiclos } from '@/src/ui/escalera-clei'
import { FormularioAdmision } from './formulario'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Admisiones',
  descripcion:
    'Formulario de inscripción en línea. Al enviarlo recibe un número de radicado y la institución se comunica con el acudiente para continuar.',
  ruta: '/admisiones',
})

export default async function AdmisionesPage() {
  const [ciclos, jornadas, config] = await Promise.all([
    obtenerCiclos(),
    obtenerJornadasConOferta(),
    obtenerConfiguracion(),
  ])

  const abiertas = ciclos.length > 0 && jornadas.length > 0

  const migas = (
    <Migas ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Admisiones' }]} />
  )

  if (abiertas) {
    return (
      <FormularioAdmision
        migas={migas}
        responsable={nombreLegal(config)}
        canalDerechos={
          config?.correo
            ? `escribiendo a ${config.correo}`
            : config?.telefono
              ? `llamando al ${config.telefono}`
              : null
        }
        titulo="Formulario de inscripción"
        entrada="Al enviar el formulario recibe un número de radicado. Con ese número la institución identifica la solicitud y se comunica con el acudiente registrado para continuar el proceso."
        ciclos={ordenarCiclos(ciclos).map((c) => ({
          id: c.id,
          etiqueta: `Ciclo ${c.codigo} (${c.gradoEquivalente.toLowerCase()})`,
        }))}
        jornadas={jornadas.map((j) => ({ id: j.id, nombre: j.nombre, detalle: j.detalle }))}
        formularioServido={crearTokenFormulario()}
      />
    )
  }

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina migas={migas} titulo="Admisiones" />
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba" className="pt-aire-sm">
        <Contenedor ancho="amplio">
          <EstadoVacio
            titulo="Las inscripciones en línea no están abiertas"
            descripcion={
              config?.telefono || config?.correo
                ? 'Para consultar por cupos, comuníquese directamente con la institución.'
                : undefined
            }
            accion={
              config?.telefono || config?.correo ? (
                <ul className="flex flex-col gap-2 text-nota">
                  {config.telefono ? (
                    <li>
                      <span className="text-piedra">Teléfono </span>
                      <a
                        href={`tel:${config.telefono.replace(/\s+/g, '')}`}
                        className="transicion-ui font-mono font-tnum text-tinta underline decoration-piedra underline-offset-4 hover:decoration-carmin"
                      >
                        {config.telefono}
                      </a>
                    </li>
                  ) : null}
                  {config.correo ? (
                    <li>
                      <span className="text-piedra">Correo </span>
                      <a
                        href={`mailto:${config.correo}`}
                        className="transicion-ui text-tinta underline decoration-piedra underline-offset-4 hover:decoration-carmin"
                      >
                        {config.correo}
                      </a>
                    </li>
                  ) : null}
                </ul>
              ) : undefined
            }
          />
        </Contenedor>
      </Seccion>
    </>
  )
}
