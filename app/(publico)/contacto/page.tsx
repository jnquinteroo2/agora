import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import {
  obtenerConfiguracion,
  direccionCompleta,
  nombreLegal,
} from '@/src/datos/configuracion-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EnlaceBoton, EnlaceSubrayado } from '@/src/ui/boton'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const config = await obtenerConfiguracion()
  return metadatosDePagina({
    titulo: 'Contacto',
    descripcion: resumir(
      `Cómo comunicarse con ${nombreLegal(config)} y dónde se hacen las solicitudes de admisión.`
    ),
    ruta: '/contacto',
  })
}

const enlaceDato =
  'transicion-ui text-tinta underline decoration-piedra decoration-1 underline-offset-4 hover:decoration-carmin'

export default async function ContactoPage() {
  const config = await obtenerConfiguracion()
  const direccion = direccionCompleta(config)

  const datos = [
    direccion
      ? { termino: 'Dirección', valor: <address className="not-italic">{direccion}</address> }
      : null,
    config?.telefono
      ? {
          termino: 'Teléfono',
          valor: (
            <a
              href={`tel:${config.telefono.replace(/\s+/g, '')}`}
              className={`${enlaceDato} font-mono font-tnum`}
            >
              {config.telefono}
            </a>
          ),
        }
      : null,
    config?.correo
      ? {
          termino: 'Correo',
          valor: (
            <a href={`mailto:${config.correo}`} className={`${enlaceDato} break-all`}>
              {config.correo}
            </a>
          ),
        }
      : null,
  ].filter((d) => d !== null)

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Contacto' }]} />
            }
            titulo="Hable con la institución"
          />
        </Contenedor>
      </Seccion>

      {datos.length > 0 ? (
        <Seccion aire="md" filete="arriba">
          <Contenedor ancho="amplio">
            <dl className="grid gap-px bg-niebla md:grid-cols-3">
              {datos.map((dato) => (
                <div key={dato.termino} className="flex flex-col gap-2 bg-hueso pt-5 pr-6 pb-8">
                  <dt className="versalitas text-menudo text-piedra">{dato.termino}</dt>
                  <dd className="font-display text-rubro leading-snug text-tinta">{dato.valor}</dd>
                </div>
              ))}
            </dl>
          </Contenedor>
        </Seccion>
      ) : null}

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio" className="flex flex-col items-start gap-5">
          <p className="prosa max-w-medida leading-relaxed text-piedra">
            Las solicitudes de admisión se hacen con el formulario de inscripción, que entrega un
            número de radicado para identificar cada solicitud. Las consultas sobre datos personales
            se rigen por la{' '}
            <EnlaceSubrayado href="/privacidad" className="text-tinta decoration-piedra">
              política de tratamiento de datos
            </EnlaceSubrayado>
            .
          </p>
          <EnlaceBoton href="/admisiones" tono="secundario">
            Ir al formulario de inscripción
          </EnlaceBoton>
        </Contenedor>
      </Seccion>
    </>
  )
}
