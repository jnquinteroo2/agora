import { metadatosDePagina } from '@/src/seo/metadatos'
import { obtenerConfiguracion, nombreLegal } from '@/src/datos/configuracion-publica'
import { TERMINOS_DE_USO } from '@/src/legal/versiones'
import { Migas } from '@/src/ui/migas'
import {
  DocumentoLegal,
  EnlaceLegal,
  Lista,
  Parrafo,
  type ApartadoLegal,
} from '@/src/ui/documento-legal'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Términos de uso',
  descripcion: 'Las condiciones para usar este sitio y su formulario de admisión.',
  ruta: '/terminos',
})

export default async function TerminosPage() {
  const config = await obtenerConfiguracion()
  const institucion = nombreLegal(config)

  const apartados: ApartadoLegal[] = [
    {
      id: 'objeto',
      titulo: 'Objeto del sitio',
      contenido: (
        <>
          <Parrafo>
            Este sitio es el canal público de {institucion}. Informa sobre la institución, su modelo
            educativo por ciclos y su oferta, publica noticias y fotografías de la vida escolar, y
            recibe solicitudes de admisión mediante un formulario.
          </Parrafo>
          <Parrafo>
            Usar el sitio implica aceptar estos términos. La plataforma de gestión escolar, a la que
            se entra con usuario y contraseña, es solo para el personal y los estudiantes con cuenta
            de acceso.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'caracter-informativo',
      titulo: 'Carácter informativo de la oferta',
      contenido: (
        <>
          <Parrafo>
            La información sobre ciclos, jornadas y horarios es informativa y puede cambiar de un
            año lectivo a otro. Lo que vale es lo que la institución confirme directamente.
          </Parrafo>
          <Lista>
            <li>
              Enviar el formulario de inscripción no garantiza un cupo. El número de radicado
              identifica la solicitud; no es una admisión ni una matrícula.
            </li>
            <li>
              La institución estudia cada solicitud y confirma con el acudiente registrado el ciclo
              que corresponde, la jornada y la disponibilidad de cupo.
            </li>
            <li>
              El ciclo de ingreso depende de los estudios aprobados, que se acreditan con los
              certificados correspondientes.
            </li>
          </Lista>
        </>
      ),
    },
    {
      id: 'formulario',
      titulo: 'Uso del formulario de admisión',
      contenido: (
        <>
          <Parrafo>Quien usa el formulario se compromete a:</Parrafo>
          <Lista>
            <li>
              Entregar información veraz, propia o de la persona a quien representa legalmente.
            </li>
            <li>
              No registrar datos de otra persona sin estar facultado para hacerlo. Si el aspirante
              es menor de edad, la autorización para tratar sus datos la da su representante legal.
            </li>
            <li>
              No enviar solicitudes de forma automatizada ni intentar saturar el formulario. El
              sitio limita el número de envíos seguidos desde una misma conexión.
            </li>
          </Lista>
          <Parrafo>
            Los datos del formulario se tratan según la{' '}
            <EnlaceLegal href="/privacidad">
              política de tratamiento de datos personales
            </EnlaceLegal>
            .
          </Parrafo>
        </>
      ),
    },
    {
      id: 'propiedad-intelectual',
      titulo: 'Marca, escudo y contenidos',
      contenido: (
        <>
          <Parrafo>
            El nombre, la marca y el escudo identifican a {institucion}. Los textos, fotografías y
            demás contenidos del sitio fueron publicados por la institución.
          </Parrafo>
          <Parrafo>
            Se pueden citar y enlazar los contenidos indicando la fuente. Reproducir la marca o el
            escudo, o usar los contenidos con fines comerciales o de modo que sugieran una relación
            con la institución que no existe, requiere autorización previa de la institución.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'enlaces',
      titulo: 'Enlaces a otros sitios',
      contenido: (
        <Parrafo>
          Si una página del sitio enlaza a un sitio de terceros, ese sitio se rige por sus propios
          términos y políticas. La institución no controla su contenido ni responde por él.
        </Parrafo>
      ),
    },
    {
      id: 'responsabilidad',
      titulo: 'Alcance de la información publicada',
      contenido: (
        <>
          <Parrafo>
            La información del sitio puede contener errores u omisiones o quedar desactualizada.
            Ante cualquier duda sobre la oferta, los requisitos o el proceso de admisión, prevalece
            lo que la institución confirme directamente.
          </Parrafo>
          <Parrafo>
            El sitio puede dejar de estar disponible por mantenimiento o por fallas técnicas. Si un
            envío del formulario no se completa, el sitio lo informa en pantalla y la solicitud se
            puede enviar de nuevo.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'ley-aplicable',
      titulo: 'Ley aplicable y cambios',
      contenido: (
        <>
          <Parrafo>Estos términos se rigen por las leyes de la República de Colombia.</Parrafo>
          <Parrafo>
            La institución puede actualizar estos términos. La versión vigente y su fecha se indican
            al comienzo de esta página.
          </Parrafo>
        </>
      ),
    },
  ]

  return (
    <DocumentoLegal
      migas={
        <Migas ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Términos de uso' }]} />
      }
      titulo="Términos de uso"
      entrada="Las condiciones para usar este sitio y su formulario de admisión."
      version={TERMINOS_DE_USO}
      apartados={apartados}
    />
  )
}
