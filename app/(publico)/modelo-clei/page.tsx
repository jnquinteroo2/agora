import { metadatosDePagina } from '@/src/seo/metadatos'
import { obtenerCiclos } from '@/src/datos/oferta-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, TituloDeSeccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EscaleraCleiCompleta } from '@/src/ui/escalera-clei'
import { EnlaceBoton } from '@/src/ui/boton'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Modelo CLEI',
  descripcion:
    'Qué son los Ciclos Lectivos Especiales Integrados: la modalidad oficial de educación básica y media para jóvenes y adultos en Colombia.',
  ruta: '/modelo-clei',
})

export default async function ModeloCleiPage() {
  const ciclos = await obtenerCiclos()

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas
                ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Modelo CLEI' }]}
              />
            }
            titulo="Ciclos Lectivos Especiales Integrados"
            entrada="El modelo CLEI es la modalidad oficial de educación para jóvenes y adultos en Colombia. Agrupa la educación básica y media en ciclos, de modo que se avanza en el currículo con una intensidad horaria propia de la educación de adultos."
          />
        </Contenedor>
      </Seccion>

      {ciclos.length > 0 ? (
        <Seccion aire="md" filete="arriba">
          <Contenedor ancho="amplio" className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <TituloDeSeccion>La escalera de ciclos</TituloDeSeccion>
              <p className="prosa max-w-medida leading-relaxed text-piedra">
                Cada peldaño es un ciclo, y cada ciclo equivale a un grado de la educación regular.
                Se ingresa en el ciclo que corresponde a los estudios ya cursados y se avanza hasta
                completar el último.
              </p>
            </div>

            <EscaleraCleiCompleta ciclos={ciclos} />
          </Contenedor>
        </Seccion>
      ) : null}

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio" className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-4 lg:col-span-6">
            <TituloDeSeccion>Quién puede estudiar por ciclos</TituloDeSeccion>
            <p className="prosa max-w-medida leading-relaxed text-tinta">
              El modelo está dirigido a jóvenes y adultos que no terminaron la educación básica o
              media en la edad regular y quieren completarla en un programa pensado para su edad.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-6">
            <TituloDeSeccion>Cómo se ingresa</TituloDeSeccion>
            <p className="prosa max-w-medida leading-relaxed text-piedra">
              El ciclo de ingreso depende de los estudios ya aprobados, que se acreditan con los
              certificados correspondientes. El proceso empieza con el formulario de admisión y
              continúa con la institución, que se comunica con el acudiente registrado.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <EnlaceBoton href="/admisiones" tono="primario">
                Iniciar la admisión
              </EnlaceBoton>
              <EnlaceBoton href="/oferta" tono="secundario">
                Ver ciclos y jornadas
              </EnlaceBoton>
            </div>
          </div>
        </Contenedor>
      </Seccion>
    </>
  )
}
