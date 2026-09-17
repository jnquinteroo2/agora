import { db } from '@/src/datos/cliente'
import { configuracionInstitucional } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Contacto' }

export default async function ContactoPage() {
  const [config] = await db.select().from(configuracionInstitucional).limit(1)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Contacto</p>
        <h1 className="font-display text-3xl">Hable con la institución</h1>
      </header>

      <div className="grid gap-4 rounded-sm border border-niebla p-6 text-sm md:grid-cols-2">
        {config?.direccion && (
          <div>
            <p className="text-piedra">Dirección</p>
            <p>{config.direccion}{config.municipio ? `, ${config.municipio}` : ''}{config.departamento ? ` (${config.departamento})` : ''}</p>
          </div>
        )}
        {config?.telefono && (
          <div>
            <p className="text-piedra">Teléfono</p>
            <p>{config.telefono}</p>
          </div>
        )}
        {config?.correo && (
          <div>
            <p className="text-piedra">Correo</p>
            <a href={`mailto:${config.correo}`} className="text-carmin underline">{config.correo}</a>
          </div>
        )}
        {!config?.direccion && !config?.telefono && !config?.correo && (
          <p className="text-piedra">Los datos de contacto aún no se han registrado.</p>
        )}
      </div>

      <p className="text-sm text-piedra">
        Para procesos de admisión, use el <a href="/admisiones" className="text-carmin underline">formulario de inscripción</a>.
      </p>
    </div>
  )
}
