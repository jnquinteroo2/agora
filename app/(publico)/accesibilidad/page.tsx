import { metadatosDePagina } from '@/src/seo/metadatos'
import { obtenerConfiguracion } from '@/src/datos/configuracion-publica'
import { DECLARACION_ACCESIBILIDAD } from '@/src/legal/versiones'
import { Migas } from '@/src/ui/migas'
import {
  DocumentoLegal,
  Lista,
  ListaDeDatos,
  Parrafo,
  datosDeContacto,
  type ApartadoLegal,
} from '@/src/ui/documento-legal'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Declaración de accesibilidad',
  descripcion: 'El nivel de accesibilidad que busca este sitio, cómo se comprobó y qué falta.',
  ruta: '/accesibilidad',
})

const CONTRASTES = [
  { par: 'Texto principal sobre el fondo', valor: '17,9:1' },
  { par: 'Texto secundario sobre el fondo', valor: '5,2:1' },
  { par: 'Texto secundario sobre los campos del formulario', valor: '5,7:1' },
  { par: 'Texto del botón principal sobre su color', valor: '5,7:1' },
  { par: 'Mensajes de error sobre los campos del formulario', valor: '7,0:1' },
  { par: 'Texto claro sobre el pie de página', valor: '15,0:1' },
  { par: 'Rótulos del pie de página', valor: '6,8:1' },
]

export default async function AccesibilidadPage() {
  const config = await obtenerConfiguracion()
  const contacto = datosDeContacto(config)

  const apartados: ApartadoLegal[] = [
    {
      id: 'objetivo',
      titulo: 'Objetivo',
      contenido: (
        <Parrafo>
          Las páginas públicas de este sitio buscan cumplir el nivel AA de las Pautas de
          Accesibilidad para el Contenido Web (WCAG) 2.1, para que cualquier persona pueda leerlas,
          recorrerlas y enviar el formulario de admisión, también con teclado o con lector de
          pantalla.
        </Parrafo>
      ),
    },
    {
      id: 'verificacion',
      titulo: 'Qué se verificó y cómo',
      contenido: (
        <>
          <Parrafo>
            Estas pruebas se hicieron sobre todas las páginas públicas del sitio, en una pantalla de
            teléfono de 390 píxeles de ancho y en una de escritorio de 1440 píxeles:
          </Parrafo>
          <Lista>
            <li>
              Revisión automática con axe-core 4.13 contra los criterios A y AA de WCAG 2.0 y 2.1,
              sin errores. En el formulario de admisión se revisaron sus tres estados: vacío, con
              errores y enviado.
            </li>
            <li>
              Recorrido completo con teclado del formulario de admisión, en el mismo orden en que se
              ve, con foco visible en cada campo. Al enviar con errores, el foco va a un resumen con
              enlaces a cada campo por corregir, y cada campo anuncia su error.
            </li>
            <li>
              Recorrido con teclado del visor de fotografías de la galería: se abre con Enter, se
              pasa de foto con las flechas, el foco no se sale del visor mientras está abierto, y
              Escape lo cierra y devuelve el foco a la miniatura.
            </li>
            <li>Que ninguna página se desborde a lo ancho en pantallas de teléfono.</li>
            <li>
              Movimiento reducido: si el sistema tiene activada la preferencia de reducir el
              movimiento, el sitio desactiva sus animaciones y transiciones.
            </li>
          </Lista>
          <Parrafo>
            El contraste de los colores de texto se midió con la fórmula de WCAG 2.1. El mínimo para
            el nivel AA es 4,5:1 en texto normal:
          </Parrafo>
          <ListaDeDatos
            datos={CONTRASTES.map((c) => ({
              termino: c.par,
              valor: <span className="font-mono font-tnum text-[0.85em]">{c.valor}</span>,
            }))}
          />
        </>
      ),
    },
    {
      id: 'limitaciones',
      titulo: 'Limitaciones conocidas',
      contenido: (
        <Lista>
          <li>
            El texto alternativo de cada fotografía de la galería y de las noticias lo escribe quien
            la carga en el gestor de contenidos. Si se carga sin una descripción adecuada, la
            fotografía no se puede entender sin verla.
          </li>
          <li>
            Los documentos en PDF que genera la plataforma, como boletines, certificados y recibos,
            no se han evaluado para accesibilidad.
          </li>
          <li>
            La página de ingreso a la plataforma (/login) no cumple el criterio 1.4.3 de WCAG 2.1
            (contraste mínimo): las etiquetas de sus campos tienen un contraste medido de 1,03:1,
            cuando el mínimo es 4,5:1.
          </li>
          <li>
            La plataforma de gestión escolar, a la que se entra con usuario y contraseña, no está
            cubierta por esta declaración.
          </li>
          <li>
            La revisión automática no encuentra todas las barreras. El sitio no se ha probado con
            lectores de pantalla ni con personas con discapacidad.
          </li>
          <li>
            El campo de fecha de nacimiento usa el selector de fecha del navegador, cuya forma y
            accesibilidad dependen de cada navegador.
          </li>
        </Lista>
      ),
    },
    ...(contacto.length > 0
      ? [
          {
            id: 'reportar',
            titulo: 'Reportar una barrera',
            contenido: (
              <>
                <Parrafo>
                  Si encuentra una parte del sitio que no puede usar, o necesita la información en
                  otro formato, comuníquese con la institución. Indique la página y lo que intentaba
                  hacer.
                </Parrafo>
                <ListaDeDatos datos={contacto} />
              </>
            ),
          },
        ]
      : []),
    {
      id: 'fecha',
      titulo: 'Fecha de la declaración',
      contenido: (
        <Parrafo>
          Esta declaración se preparó con las pruebas descritas, en la fecha indicada al comienzo de
          esta página, y describe el sitio en ese momento.
        </Parrafo>
      ),
    },
  ]

  return (
    <DocumentoLegal
      migas={
        <Migas
          ruta={[
            { etiqueta: 'Inicio', href: '/inicio' },
            { etiqueta: 'Declaración de accesibilidad' },
          ]}
        />
      }
      titulo="Declaración de accesibilidad"
      entrada="El nivel de accesibilidad que busca este sitio, cómo se comprobó y qué falta."
      version={DECLARACION_ACCESIBILIDAD}
      apartados={apartados}
    />
  )
}
