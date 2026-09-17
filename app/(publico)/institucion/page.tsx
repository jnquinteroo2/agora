import { db } from '@/src/datos/cliente'
import { configuracionInstitucional } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Institución' }

export default async function InstitucionPage() {
  const [config] = await db.select().from(configuracionInstitucional).limit(1)

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Institución</p>
        <h1 className="font-display text-3xl">{config?.nombreLegal ?? 'Institución Educativa Ágora'}</h1>
        {config?.lema && <p className="mt-2 font-display text-lg italic text-piedra">{config.lema}</p>}
      </header>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-xl">Misión</h2>
          <p className="text-sm leading-relaxed text-piedra">
            Ofrecer una educación formal para jóvenes y adultos bajo el modelo de Ciclos Lectivos
            Especiales Integrados (CLEI), que permita completar la educación básica y media con
            calidad, flexibilidad horaria y acompañamiento cercano a cada estudiante.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-display text-xl">Visión</h2>
          <p className="text-sm leading-relaxed text-piedra">
            Ser reconocida en Funza y Cundinamarca como una institución de puertas abiertas para
            quienes retoman sus estudios, con procesos académicos y administrativos claros,
            documentados y accesibles.
          </p>
        </div>
      </section>

      <section className="rounded-sm border border-niebla p-6">
        <h2 className="mb-3 font-display text-xl">Datos institucionales</h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-2">
          {config?.dane && (
            <div className="flex justify-between border-b border-niebla py-1"><dt className="text-piedra">Código DANE</dt><dd>{config.dane}</dd></div>
          )}
          {config?.resolucion && (
            <div className="flex justify-between border-b border-niebla py-1"><dt className="text-piedra">Resolución</dt><dd>{config.resolucion}</dd></div>
          )}
          {config?.nit && (
            <div className="flex justify-between border-b border-niebla py-1"><dt className="text-piedra">NIT</dt><dd>{config.nit}</dd></div>
          )}
          {config?.rectorNombre && (
            <div className="flex justify-between border-b border-niebla py-1"><dt className="text-piedra">Rector(a)</dt><dd>{config.rectorNombre}</dd></div>
          )}
        </dl>
        {!config && (
          <p className="text-sm text-piedra">La configuración institucional aún no se ha registrado.</p>
        )}
      </section>
    </div>
  )
}
