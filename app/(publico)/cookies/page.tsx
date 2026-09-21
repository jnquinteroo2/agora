import { metadatosDePagina } from '@/src/seo/metadatos'
import { POLITICA_COOKIES } from '@/src/legal/versiones'
import { Migas } from '@/src/ui/migas'
import {
  DocumentoLegal,
  EnlaceLegal,
  ListaDeDatos,
  Parrafo,
  Subtitulo,
  type ApartadoLegal,
} from '@/src/ui/documento-legal'

export const metadata = metadatosDePagina({
  titulo: 'Política de cookies',
  descripcion:
    'Qué cookies usa este sitio, cuándo y para qué. Los visitantes no reciben ninguna; solo quien inicia sesión en la plataforma.',
  ruta: '/cookies',
})

function Codigo({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.8em] break-all">{children}</code>
}

export default function CookiesPage() {
  const apartados: ApartadoLegal[] = [
    {
      id: 'visitantes',
      titulo: 'Visitantes del sitio',
      contenido: (
        <>
          <Parrafo>
            Quien visita las páginas públicas de este sitio sin iniciar sesión no recibe ninguna
            cookie. Esas páginas tampoco guardan información en el almacenamiento del navegador.
          </Parrafo>
          <Parrafo>
            El sitio no usa herramientas de analítica, publicidad ni seguimiento, y no incrusta
            contenido de terceros, como videos, mapas o botones de redes sociales. Las fuentes
            tipográficas se sirven desde el mismo sitio, no desde servicios externos.
          </Parrafo>
          <Parrafo>
            Enviar el formulario de admisión tampoco crea cookies. Los datos del formulario se
            tratan como se explica en la{' '}
            <EnlaceLegal href="/privacidad">
              política de tratamiento de datos personales
            </EnlaceLegal>
            .
          </Parrafo>
        </>
      ),
    },
    {
      id: 'sesion',
      titulo: 'Cookies al iniciar sesión',
      contenido: (
        <>
          <Parrafo>
            Solo quien inicia sesión en la plataforma, es decir, el personal de la institución y los
            estudiantes con cuenta de acceso, recibe cookies. Son estrictamente necesarias: sin
            ellas no es posible mantener la sesión abierta, que es justamente el servicio que la
            persona pide al ingresar.
          </Parrafo>

          <Subtitulo>Cookie de sesión</Subtitulo>
          <ListaDeDatos
            datos={[
              {
                termino: 'Nombre',
                valor: (
                  <>
                    <Codigo>agora.session_token</Codigo>. En conexiones seguras (HTTPS) lleva el
                    prefijo <Codigo>__Secure-</Codigo>.
                  </>
                ),
              },
              {
                termino: 'Para qué sirve',
                valor: 'Identifica la sesión abierta para no pedir la contraseña en cada página.',
              },
              {
                termino: 'Cuándo se crea',
                valor: 'Al iniciar sesión. Se borra al cerrarla.',
              },
              {
                termino: 'Duración',
                valor:
                  'Hasta 24 horas. Si la sesión se sigue usando, se renueva como máximo una vez cada 8 horas.',
              },
              {
                termino: 'Protección',
                valor:
                  'No es accesible desde el código de las páginas, solo se envía al propio sitio y, en conexiones seguras, solo por HTTPS.',
              },
            ]}
          />

          <Subtitulo>Cookie del segundo factor</Subtitulo>
          <ListaDeDatos
            datos={[
              {
                termino: 'Nombre',
                valor: (
                  <>
                    <Codigo>agora.two_factor</Codigo>, con el mismo prefijo en conexiones seguras.
                  </>
                ),
              },
              {
                termino: 'Para qué sirve',
                valor:
                  'Recuerda, entre la contraseña y el código de verificación, que la persona ya escribió la contraseña.',
              },
              {
                termino: 'Cuándo se crea',
                valor:
                  'Solo en cuentas con segundo factor activado, al escribir la contraseña correcta.',
              },
              { termino: 'Duración', valor: '10 minutos.' },
            ]}
          />
        </>
      ),
    },
    {
      id: 'sin-aviso',
      titulo: 'Por qué no hay aviso de cookies',
      contenido: (
        <>
          <Parrafo>
            Los avisos de cookies existen para pedir consentimiento antes de instalar cookies que no
            son necesarias, como las de analítica o publicidad. Este sitio no instala ninguna de ese
            tipo, y los visitantes no reciben ninguna cookie. No hay nada que consentir, y un aviso
            solo interrumpiría la lectura.
          </Parrafo>
          <Parrafo>
            Si en el futuro el sitio incorpora analítica o contenido de terceros, esta política se
            actualizará y se evaluará de nuevo la necesidad de pedir consentimiento.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'control',
      titulo: 'Cómo controlarlas',
      contenido: (
        <>
          <Parrafo>
            Todos los navegadores permiten ver y borrar las cookies guardadas, o bloquearlas. Si se
            bloquean las cookies de este sitio, las páginas públicas funcionan igual, pero no será
            posible iniciar sesión en la plataforma.
          </Parrafo>
          <Parrafo>
            Para borrar la cookie de sesión sin tocar la configuración del navegador, basta con
            cerrar la sesión.
          </Parrafo>
        </>
      ),
    },
  ]

  return (
    <DocumentoLegal
      migas={
        <Migas
          ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Política de cookies' }]}
        />
      }
      titulo="Política de cookies"
      entrada="Qué cookies usa este sitio, cuándo y para qué."
      version={POLITICA_COOKIES}
      apartados={apartados}
    />
  )
}
