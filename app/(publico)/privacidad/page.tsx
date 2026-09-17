import { db } from '@/src/datos/cliente'
import { configuracionInstitucional } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Tratamiento de datos personales' }

export default async function PrivacidadPage() {
  const [config] = await db.select().from(configuracionInstitucional).limit(1)
  const nombreColegio = config?.nombreLegal ?? 'la institución'

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 text-sm leading-relaxed text-tinta">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Habeas Data</p>
        <h1 className="font-display text-3xl">Política de tratamiento de datos personales</h1>
      </header>

      <p>
        En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, {nombreColegio} informa
        a aspirantes, estudiantes, acudientes, docentes y demás usuarios de esta plataforma cómo
        recolecta, usa y protege sus datos personales.
      </p>

      <div>
        <h2 className="mb-2 font-display text-xl">Responsable del tratamiento</h2>
        <p>
          {nombreColegio}{config?.nit ? `, NIT ${config.nit}` : ''}
          {config?.direccion ? `, con domicilio en ${config.direccion}` : ''}
          {config?.correo ? `. Correo de contacto: ${config.correo}.` : '.'}
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-display text-xl">Datos que se recolectan</h2>
        <p>
          Datos de identificación (nombres, apellidos, tipo y número de documento, fecha de
          nacimiento), datos de contacto del aspirante y su acudiente, y datos académicos
          derivados del proceso educativo (calificaciones, observador, documentos generados).
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-display text-xl">Finalidad</h2>
        <p>
          Los datos se usan exclusivamente para adelantar el proceso de admisión, la matrícula, el
          seguimiento académico y disciplinario del estudiante, y la comunicación institucional
          con el estudiante y su acudiente. No se comparten con terceros distintos de las
          autoridades educativas cuando la ley lo exige.
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-display text-xl">Derechos del titular</h2>
        <p>
          Como titular de los datos, usted tiene derecho a conocer, actualizar, rectificar y
          solicitar la supresión de sus datos personales, así como a revocar la autorización
          otorgada, dirigiéndose por escrito al correo de contacto registrado arriba.
        </p>
      </div>
    </article>
  )
}
