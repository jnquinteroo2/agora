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
  { par: 'Texto principal sobre el fondo', claro: '21:1', oscuro: '21:1' },
  { par: 'Texto secundario sobre el fondo', claro: '7,0:1', oscuro: '8,6:1' },
  { par: 'Texto del botón principal sobre su color', claro: '6,9:1', oscuro: '6,9:1' },
  { par: 'Enlaces e íconos en carmín sobre el fondo', claro: '6,9:1', oscuro: '5,6:1' },
  { par: 'Mensajes de error sobre el fondo', claro: '6,5:1', oscuro: '6,7:1' },
  { par: 'Borde de los campos del formulario sobre el fondo', claro: '4,5:1', oscuro: '6,0:1' },
  { par: 'Anillo de foco sobre el fondo', claro: '6,9:1', oscuro: '5,6:1' },
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
          Accesibilidad para el Contenido Web (WCAG) 2.2, en modo claro y en modo oscuro, para que
          cualquier persona pueda leerlas, recorrerlas y enviar el formulario de admisión, también
          con teclado o con lector de pantalla.
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
              Revisión automática con axe-core 4.13 contra los criterios A y AA de WCAG 2.0, 2.1 y
              2.2, en modo claro y en modo oscuro, sin ninguna falla. La misma revisión se hizo en la
              página de ingreso a la plataforma y en la pantalla de ingreso seguro, también con un
              error de credenciales a la vista.
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
            El contraste de los colores se midió con la fórmula de WCAG 2.2 en los dos modos. El
            mínimo para el nivel AA es 4,5:1 en texto normal y 3:1 en bordes de campos, íconos y
            anillo de foco. Las cifras están truncadas a un decimal, nunca redondeadas hacia arriba:
          </Parrafo>
          <ListaDeDatos
            datos={CONTRASTES.map((c) => ({
              termino: c.par,
              valor: (
                <span className="font-mono font-tnum text-[0.85em]">
                  claro {c.claro} · oscuro {c.oscuro}
                </span>
              ),
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
