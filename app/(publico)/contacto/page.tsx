import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import {
  obtenerConfiguracion,
  direccionCompleta,
  nombreLegal,
} from '@/src/datos/configuracion-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { Inbox } from 'lucide-react'
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
  'transicion-ui text-texto underline decoration-texto-secundario decoration-1 underline-offset-4 hover:decoration-acento-texto'

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

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio">
          {datos.length > 0 ? (
            <dl className="grid gap-3 md:grid-cols-3">
              {datos.map((dato) => (
                <div
                  key={dato.termino}
                  className="flex flex-col gap-2 rounded-tarjeta border border-borde p-6 shadow-sutil"
                >
                  <dt className="text-nota text-texto-secundario">{dato.termino}</dt>
                  <dd className="font-titulo text-rubro leading-snug text-texto">{dato.valor}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EstadoVacio
              como="h2"
              icono={<Inbox strokeWidth={1.5} />}
              titulo="Los canales de contacto de la institución no están publicados en este sitio"
              descripcion="Cuando la institución registre su dirección, teléfono y correo, aparecerán aquí. Para iniciar una admisión no necesita esperar: el formulario en línea le entrega un número de radicado con el que la institución identifica su solicitud."
              accion={
                <EnlaceBoton href="/admisiones" tono="secundario">
                  Ir al formulario de inscripción
                </EnlaceBoton>
              }
            />
          )}
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio" className="flex flex-col items-start gap-5">
          <p className="prosa max-w-medida leading-relaxed text-texto-secundario">
            Las solicitudes de admisión se hacen con el formulario de inscripción, que entrega un
            número de radicado para identificar cada solicitud. Las consultas sobre datos personales
            se rigen por la{' '}
            <EnlaceSubrayado href="/privacidad" className="text-texto decoration-texto-secundario">
              política de tratamiento de datos
            </EnlaceSubrayado>
            .
          </p>
          {datos.length > 0 ? (
            <EnlaceBoton href="/admisiones" tono="secundario">
              Ir al formulario de inscripción
            </EnlaceBoton>
          ) : null}
        </Contenedor>
      </Seccion>
    </>
  )
}
