import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import { obtenerConfiguracion, nombreLegal, ubicacion } from '@/src/datos/configuracion-publica'
import { POLITICA_DATOS } from '@/src/legal/versiones'
import {
  AREA_DE_ATENCION,
  ENCARGADOS_DEL_TRATAMIENTO,
  VIGENCIA_DE_LAS_BASES_DE_DATOS,
} from '@/src/legal/politica'
import { Migas } from '@/src/ui/migas'
import {
  DocumentoLegal,
  EnlaceLegal,
  Lista,
  ListaDeDatos,
  Norma,
  Parrafo,
  Subtitulo,
  datosDeContacto,
  type ApartadoLegal,
} from '@/src/ui/documento-legal'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const config = await obtenerConfiguracion()
  return metadatosDePagina({
    titulo: 'Política de tratamiento de datos personales',
    descripcion: resumir(
      `Cómo trata ${nombreLegal(config)} los datos de aspirantes, estudiantes, familias y personal, y cómo ejercer los derechos sobre ellos.`
    ),
    ruta: '/privacidad',
  })
}

export default async function PrivacidadPage() {
  const config = await obtenerConfiguracion()
  const responsable = nombreLegal(config)
  const domicilio = ubicacion(config)
  const contacto = datosDeContacto(config)
  const hayCanal = contacto.length > 0

  const identificacion = [
    { termino: 'Nombre', valor: responsable },
    config?.nit
      ? {
          termino: 'NIT',
          valor: <span className="font-mono font-tnum text-[0.85em]">{config.nit}</span>,
        }
      : null,
    domicilio ? { termino: 'Domicilio', valor: domicilio } : null,
    ...contacto,
  ].filter((dato) => dato !== null)

  const apartados: ApartadoLegal[] = [
    {
      id: 'responsable',
      titulo: 'Responsable del tratamiento',
      contenido: (
        <>
          <Parrafo>
            El responsable del tratamiento de los datos personales descritos en esta política es{' '}
            {responsable}. Decide sobre las bases de datos y sobre el uso que se da a los datos{' '}
            <Norma>art. 3, lit. e, Ley 1581 de 2012</Norma>.
          </Parrafo>
          <ListaDeDatos datos={identificacion} />
        </>
      ),
    },
    {
      id: 'alcance',
      titulo: 'Alcance y marco normativo',
      contenido: (
        <>
          <Parrafo>
            Esta política se rige por la Ley Estatutaria 1581 de 2012 y por su reglamentación, el
            Decreto 1377 de 2013, hoy compilado en el Decreto Único Reglamentario 1074 de 2015,
            Libro 2, Parte 2, Título 2, Capítulo 25. En adelante, cada referencia al Decreto 1377 de
            2013 indica también el artículo correspondiente del Decreto 1074 de 2015.
          </Parrafo>
          <Parrafo>
            Es la política de la institución, no solo de este sitio web. Cubre los datos que se
            recogen en el formulario público de admisión y los que se registran en la plataforma de
            gestión escolar: matrícula, gestión académica, gestión financiera y cuentas de acceso.
            Los titulares son los aspirantes, los estudiantes, sus acudientes y familiares, los
            docentes y el personal de la institución, y las personas naturales que reciben pagos de
            la institución.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'datos-y-finalidades',
      titulo: 'Datos que se tratan y para qué',
      contenido: (
        <>
          <Parrafo>
            Esta lista corresponde a los datos que la plataforma registra, agrupados por la
            finalidad para la que se recogen{' '}
            <Norma>
              art. 13, num. 2, Decreto 1377 de 2013; art. 2.2.2.25.3.1, Decreto 1074 de 2015
            </Norma>
            .
          </Parrafo>

          <Subtitulo>Admisión</Subtitulo>
          <Parrafo>
            Se recogen en el formulario público de inscripción para estudiar la solicitud, asignarle
            un número de radicado y comunicarse con el acudiente para continuar el proceso.
          </Parrafo>
          <Lista>
            <li>
              Del aspirante: nombres y apellidos, tipo y número de documento de identidad, fecha de
              nacimiento, y de forma opcional el lugar de nacimiento y el género.
            </li>
            <li>Ciclo al que aspira y jornada elegida.</li>
            <li>Del acudiente: nombre y teléfono, y de forma opcional el correo electrónico.</li>
            <li>
              Constancia de la autorización: si se otorgó, la fecha y la versión de esta política
              vigente en ese momento.
            </li>
            <li>
              Estado de la solicitud, el motivo en caso de no ser aprobada, y quién la revisó y
              cuándo.
            </li>
          </Lista>

          <Subtitulo>Matrícula</Subtitulo>
          <Parrafo>
            Se registran para formalizar el vínculo del estudiante con la institución, ubicarlo en
            el curso que le corresponde y comunicarse con él y con su familia.
          </Parrafo>
          <Lista>
            <li>
              Identificación: tipo y número de documento, nombres y apellidos, fecha y lugar de
              nacimiento, y género.
            </li>
            <li>Contacto: teléfono, correo electrónico y dirección.</li>
            <li>Entidad promotora de salud (EPS) a la que está afiliado.</li>
            <li>Relación con sus familiares y acudientes, con el tipo de parentesco.</li>
            <li>Historia académica previa: institución, grado, año y si fue aprobado.</li>
            <li>
              Matrícula de cada año: curso, estado y el contrato de matrícula con su número de
              folio.
            </li>
          </Lista>

          <Subtitulo>Gestión académica</Subtitulo>
          <Parrafo>
            Se registran para hacer el seguimiento académico y de convivencia del estudiante,
            informar de su proceso al estudiante y a su acudiente, y expedir los documentos
            académicos.
          </Parrafo>
          <Lista>
            <li>
              Calificaciones por asignatura y periodo: nota, nivel de desempeño, descriptores e
              inasistencias.
            </li>
            <li>
              Historial de cada cambio de una calificación: valor anterior y nuevo, motivo, quién lo
              hizo y cuándo.
            </li>
            <li>Boletines, constancias y certificados generados a partir de esos datos.</li>
            <li>
              Observador del estudiante: anotaciones de tipo académico, de convivencia, de
              felicitación, de compromiso o de decisión final, con su descripción, la constancia de
              si el estudiante y el acudiente las firmaron, y quién las registró.
            </li>
          </Lista>

          <Subtitulo>Gestión financiera</Subtitulo>
          <Parrafo>
            Se registran para cobrar los servicios educativos, llevar la contabilidad de la
            institución y cumplir sus obligaciones contables y tributarias.
          </Parrafo>
          <Lista>
            <li>Plan de cobro de cada matrícula: concepto, mes y valor.</li>
            <li>
              Recibos de caja: a nombre de quién se expiden, concepto, valor, forma de pago, fecha
              y, si se anulan, el motivo y quién los anuló.
            </li>
            <li>
              Comprobantes de egreso: beneficiario del pago, descripción, valor, fecha y soporte.
            </li>
            <li>Pagos al personal docente: periodo, número de bloques de clase y valor.</li>
          </Lista>

          <Subtitulo>Cuentas de acceso y seguridad</Subtitulo>
          <Parrafo>
            Se registran para que cada persona entre solo a lo que le corresponde según su rol, y
            para dejar constancia de quién hace cada operación en la plataforma.
          </Parrafo>
          <Lista>
            <li>
              Cuenta de acceso: nombre, correo electrónico y rol. La contraseña no se guarda: se
              guarda un resumen criptográfico del que no se puede recuperar.
            </li>
            <li>
              Segundo factor de autenticación, para quien lo active: la clave del generador de
              códigos y los códigos de respaldo.
            </li>
            <li>Sesiones abiertas: fecha de vencimiento, dirección IP y navegador.</li>
            <li>
              Registro de auditoría de las operaciones sensibles: qué operación se hizo, sobre qué
              registro, quién la hizo y cuándo.
            </li>
            <li>
              La dirección IP de quien envía el formulario de admisión, para limitar el número de
              envíos seguidos. Se borra de forma automática, a más tardar hora y media después.
            </li>
          </Lista>
          <Parrafo>
            Al crear o cambiar una contraseña, la plataforma consulta un servicio externo de
            contraseñas filtradas enviándole solo los cinco primeros caracteres de un resumen
            criptográfico de la contraseña. No se envía la contraseña ni ningún dato que identifique
            a la persona.
          </Parrafo>

          <Subtitulo>Personal de la institución</Subtitulo>
          <Parrafo>
            De los docentes y el personal se registran los datos de identificación y contacto, la
            cuenta de acceso, las asignaturas y cursos a cargo y los pagos descritos arriba. El
            nombre y la firma del rector y del director administrativo aparecen en los documentos
            que la plataforma genera.
          </Parrafo>

          <Subtitulo>Verificación de documentos</Subtitulo>
          <Parrafo>
            Los documentos que genera la plataforma llevan un identificador con el que cualquier
            persona puede confirmar que son auténticos. La verificación muestra solo el tipo de
            documento, la fecha en que se generó y una huella de integridad. No muestra datos
            personales.
          </Parrafo>

          <Subtitulo>Publicaciones del sitio</Subtitulo>
          <Parrafo>
            Las noticias y los álbumes de la galería son publicados por la institución. Una
            fotografía en la que se pueda identificar a una persona es un dato personal. Si se trata
            de un niño, niña o adolescente, su publicación requiere la autorización de su
            representante legal en los términos del apartado siguiente{' '}
            <Norma>
              art. 7, Ley 1581 de 2012; art. 12, Decreto 1377 de 2013; art. 2.2.2.25.2.9, Decreto
              1074 de 2015
            </Norma>
            .
          </Parrafo>
        </>
      ),
    },
    {
      id: 'menores-de-edad',
      titulo: 'Datos de niños, niñas y adolescentes',
      contenido: (
        <>
          <Parrafo>
            La institución educa a jóvenes, y muchos de sus aspirantes y estudiantes son menores de
            edad. Por eso este es el apartado más importante de la política.
          </Parrafo>

          <Subtitulo>Qué dice la ley</Subtitulo>
          <Parrafo>
            En el tratamiento de datos personales se debe asegurar el respeto a los derechos
            prevalentes de los niños, niñas y adolescentes <Norma>art. 7, Ley 1581 de 2012</Norma>.
            La Corte Constitucional, al revisar esa ley en la Sentencia C-748 de 2011, precisó que
            sus datos sí pueden tratarse cuando el tratamiento sirve a su interés superior y protege
            sus derechos fundamentales. El reglamento recoge esos dos requisitos: el tratamiento
            solo es posible si responde y respeta el interés superior del niño, niña o adolescente,
            y si asegura el respeto de sus derechos fundamentales{' '}
            <Norma>art. 12, Decreto 1377 de 2013; art. 2.2.2.25.2.9, Decreto 1074 de 2015</Norma>.
          </Parrafo>

          <Subtitulo>Quién autoriza</Subtitulo>
          <Parrafo>
            Cuando el titular es menor de edad, la autorización la otorga su representante legal: el
            padre, la madre o quien tenga legalmente su representación. Antes de otorgarla, el
            representante debe escuchar al niño, niña o adolescente, y su opinión se valora según su
            madurez, su autonomía y su capacidad para entender el asunto{' '}
            <Norma>art. 12, Decreto 1377 de 2013; art. 2.2.2.25.2.9, Decreto 1074 de 2015</Norma>.
          </Parrafo>
          <Parrafo>
            El acudiente que se registra en el formulario de admisión es la persona con la que la
            institución se comunica. Si no es el representante legal del aspirante, la autorización
            debe darla quien sí lo sea.
          </Parrafo>

          <Subtitulo>Responder es facultativo</Subtitulo>
          <Parrafo>
            Nadie está obligado a responder las preguntas sobre datos de niños, niñas y adolescentes{' '}
            <Norma>art. 12, lit. b, Ley 1581 de 2012</Norma>. Sin embargo, sin los datos
            obligatorios del formulario de admisión o de la matrícula, la institución no puede
            tramitar la solicitud ni matricular al estudiante.
          </Parrafo>

          <Subtitulo>Quién ejerce sus derechos</Subtitulo>
          <Parrafo>
            Los derechos de un niño, niña o adolescente sobre sus datos los ejercen las personas
            facultadas para representarlo{' '}
            <Norma>art. 20, Decreto 1377 de 2013; art. 2.2.2.25.4.1, Decreto 1074 de 2015</Norma>.
            Cuando el estudiante cumple la mayoría de edad, pasa a ejercerlos directamente.
          </Parrafo>

          <Subtitulo>Uso adecuado</Subtitulo>
          <Parrafo>
            Todo responsable y encargado que trate datos de niños, niñas y adolescentes debe velar
            por su uso adecuado, y la familia y la sociedad deben velar porque se cumplan estas
            obligaciones{' '}
            <Norma>art. 12, Decreto 1377 de 2013; art. 2.2.2.25.2.9, Decreto 1074 de 2015</Norma>.
            La ley asigna además a las entidades educativas la tarea de informar y capacitar a los
            representantes legales sobre los riesgos del tratamiento indebido de los datos de los
            menores y sobre su uso responsable y seguro <Norma>art. 7, Ley 1581 de 2012</Norma>.
          </Parrafo>
          <Parrafo>
            En la plataforma, el acceso a los datos de cada estudiante depende del rol de quien
            consulta, y la base de datos aplica esa restricción fila por fila.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'datos-sensibles',
      titulo: 'Datos sensibles',
      contenido: (
        <>
          <Parrafo>
            Son sensibles los datos que afectan la intimidad del titular o cuyo uso indebido puede
            generar discriminación, entre ellos los relativos a la salud{' '}
            <Norma>art. 5, Ley 1581 de 2012</Norma>. Su tratamiento está prohibido salvo en los
            casos que la ley señala, el primero de ellos cuando el titular da su autorización
            explícita <Norma>art. 6, Ley 1581 de 2012</Norma>.
          </Parrafo>
          <Parrafo>En la plataforma pueden quedar datos sensibles en estos campos:</Parrafo>
          <Lista>
            <li>La EPS del estudiante, porque se refiere a su afiliación al sistema de salud.</li>
            <li>
              Las anotaciones del observador del estudiante, que son texto libre y pueden referirse
              a su salud, a su situación familiar o a su conducta.
            </li>
          </Lista>
          <Parrafo>El formulario público de admisión no pide datos sensibles.</Parrafo>
          <Parrafo>
            Responder las preguntas sobre datos sensibles es facultativo: el titular no está
            obligado a autorizar su tratamiento, y ninguna actividad, incluida la matrícula, puede
            condicionarse a que los entregue. Al pedirlos, se debe informar de forma explícita y
            previa cuáles datos son sensibles y para qué se tratan, y obtener el consentimiento
            expreso del titular o de su representante legal{' '}
            <Norma>art. 6, Decreto 1377 de 2013; art. 2.2.2.25.2.3, Decreto 1074 de 2015</Norma>.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'autorizacion',
      titulo: 'Autorización',
      contenido: (
        <>
          <Parrafo>
            Los datos se tratan con la autorización previa, expresa e informada del titular o de su
            representante legal <Norma>arts. 3, lit. a, y 9, Ley 1581 de 2012</Norma>, salvo en los
            casos en que la ley no la exige <Norma>art. 10, Ley 1581 de 2012</Norma>.
          </Parrafo>
          <Parrafo>
            En el formulario de admisión, la autorización se otorga marcando la casilla
            correspondiente antes de enviar la solicitud. Sin ella, el formulario no se envía. La
            plataforma guarda la fecha de la autorización y la versión de esta política que estaba
            vigente, como prueba de que se otorgó{' '}
            <Norma>art. 8, Decreto 1377 de 2013; art. 2.2.2.25.2.5, Decreto 1074 de 2015</Norma>.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'derechos',
      titulo: 'Derechos del titular',
      contenido: (
        <>
          <Parrafo>
            El titular de los datos tiene derecho a <Norma>art. 8, Ley 1581 de 2012</Norma>:
          </Parrafo>
          <Lista>
            <li>
              Conocer, actualizar y rectificar sus datos personales, también cuando sean parciales,
              inexactos, incompletos, fraccionados o induzcan a error, o cuando su tratamiento esté
              prohibido o no haya sido autorizado.
            </li>
            <li>Pedir prueba de la autorización que otorgó.</li>
            <li>Ser informado, si lo pide, sobre el uso que se ha dado a sus datos.</li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a
              la ley, después de haber agotado el trámite de consulta o reclamo ante la institución{' '}
              <Norma>art. 16, Ley 1581 de 2012</Norma>.
            </li>
            <li>
              Revocar la autorización o pedir la supresión de sus datos. No procede cuando el
              titular tenga un deber legal o contractual de permanecer en la base de datos{' '}
              <Norma>art. 9, Decreto 1377 de 2013; art. 2.2.2.25.2.6, Decreto 1074 de 2015</Norma>.
            </li>
            <li>Acceder gratis a sus datos personales que hayan sido objeto de tratamiento.</li>
          </Lista>
          <Parrafo>
            Pueden ejercer estos derechos el titular, sus causahabientes, su representante o
            apoderado, y quien actúe por estipulación a favor de otro, acreditando en cada caso su
            calidad{' '}
            <Norma>art. 20, Decreto 1377 de 2013; art. 2.2.2.25.4.1, Decreto 1074 de 2015</Norma>.
          </Parrafo>
        </>
      ),
    },
    {
      id: 'consultas-y-reclamos',
      titulo: 'Consultas y reclamos',
      contenido: (
        <>
          {AREA_DE_ATENCION || hayCanal ? (
            <>
              <Parrafo>
                {AREA_DE_ATENCION
                  ? `Las consultas y los reclamos los atiende ${AREA_DE_ATENCION}`
                  : 'Las consultas y los reclamos se presentan ante la institución'}
                {hayCanal ? ', por estos canales:' : '.'}
              </Parrafo>
              <ListaDeDatos datos={contacto} />
            </>
          ) : null}

          <Subtitulo>Consultas</Subtitulo>
          <Parrafo>
            El titular o sus causahabientes pueden consultar la información personal del titular que
            repose en las bases de datos de la institución. La consulta se atiende en un plazo
            máximo de diez días hábiles contados desde que se recibe. Si no es posible atenderla en
            ese plazo, se informa al interesado el motivo de la demora y la fecha en que se
            atenderá, que no puede superar cinco días hábiles adicionales{' '}
            <Norma>art. 14, Ley 1581 de 2012</Norma>.
          </Parrafo>

          <Subtitulo>Reclamos</Subtitulo>
          <Parrafo>
            Quien considere que sus datos deben corregirse, actualizarse o suprimirse, o que se ha
            incumplido alguno de los deberes de la ley, puede presentar un reclamo{' '}
            <Norma>art. 15, Ley 1581 de 2012</Norma>:
          </Parrafo>
          <Lista ordenada>
            <li>
              El reclamo debe incluir la identificación del titular, la descripción de los hechos,
              la dirección y los documentos que quiera hacer valer.
            </li>
            <li>
              Si está incompleto, se pide al interesado que lo complete dentro de los cinco días
              siguientes a su recepción. Si pasan dos meses desde ese requerimiento sin que entregue
              la información, se entiende que desistió del reclamo.
            </li>
            <li>
              Si quien lo recibe no es competente para resolverlo, lo traslada a quien corresponda
              en un plazo máximo de dos días hábiles e informa de ello al interesado.
            </li>
            <li>
              Una vez recibido completo, en un plazo máximo de dos días hábiles se incluye en la
              base de datos la leyenda «reclamo en trámite» y su motivo, que se mantiene hasta que
              se decida.
            </li>
            <li>
              El reclamo se atiende en un plazo máximo de quince días hábiles contados desde el día
              siguiente a su recibo. Si no es posible en ese plazo, se informa el motivo de la
              demora y la fecha de respuesta, que no puede superar ocho días hábiles adicionales.
            </li>
          </Lista>
          <Parrafo>
            La supresión de los datos y la revocatoria de la autorización se piden mediante un
            reclamo{' '}
            <Norma>art. 9, Decreto 1377 de 2013; art. 2.2.2.25.2.6, Decreto 1074 de 2015</Norma>.
          </Parrafo>
        </>
      ),
    },
    ...(ENCARGADOS_DEL_TRATAMIENTO.length > 0
      ? [
          {
            id: 'encargados',
            titulo: 'Encargados y transmisiones',
            contenido: (
              <>
                <Parrafo>
                  Estas empresas tratan datos personales por cuenta de la institución, como
                  encargados del tratamiento{' '}
                  <Norma>
                    art. 3, lit. d, Ley 1581 de 2012; arts. 24 y 25, Decreto 1377 de 2013; arts.
                    2.2.2.25.5.1 y 2.2.2.25.5.2, Decreto 1074 de 2015
                  </Norma>
                  :
                </Parrafo>
                <Lista>
                  {ENCARGADOS_DEL_TRATAMIENTO.map((encargado) => (
                    <li key={encargado.nombre}>
                      {encargado.nombre}: {encargado.actividad}. Los datos se tratan en{' '}
                      {encargado.pais}.
                    </li>
                  ))}
                </Lista>
              </>
            ),
          },
        ]
      : []),
    {
      id: 'conservacion-y-vigencia',
      titulo: 'Conservación y vigencia',
      contenido: (
        <>
          <Parrafo>
            Los datos se conservan durante el tiempo razonable y necesario para las finalidades que
            justificaron su tratamiento, atendiendo a los aspectos administrativos, contables,
            fiscales, jurídicos e históricos de la información. Cumplida la finalidad, se suprimen,
            salvo que una obligación legal o contractual exija conservarlos{' '}
            <Norma>art. 11, Decreto 1377 de 2013; art. 2.2.2.25.2.8, Decreto 1074 de 2015</Norma>.
          </Parrafo>
          {VIGENCIA_DE_LAS_BASES_DE_DATOS ? (
            <Parrafo>{VIGENCIA_DE_LAS_BASES_DE_DATOS}</Parrafo>
          ) : null}
          <Parrafo>
            Esta es la versión {POLITICA_DATOS.version} de la política, vigente desde la fecha
            indicada al comienzo. Cualquier cambio sustancial se comunicará a los titulares antes de
            aplicarlo{' '}
            <Norma>art. 13, Decreto 1377 de 2013; art. 2.2.2.25.3.1, Decreto 1074 de 2015</Norma>.
            Las condiciones del sitio web están en los{' '}
            <EnlaceLegal href="/terminos">términos de uso</EnlaceLegal>, y el uso de cookies, en la{' '}
            <EnlaceLegal href="/cookies">política de cookies</EnlaceLegal>.
          </Parrafo>
        </>
      ),
    },
  ]

  return (
    <DocumentoLegal
      migas={
        <Migas
          ruta={[
            { etiqueta: 'Inicio', href: '/inicio' },
            { etiqueta: 'Tratamiento de datos personales' },
          ]}
        />
      }
      titulo="Política de tratamiento de datos personales"
      entrada={`Cómo trata ${responsable} los datos personales de aspirantes, estudiantes, familias y personal, y cómo ejercer los derechos sobre ellos.`}
      version={POLITICA_DATOS}
      apartados={apartados}
    />
  )
}
