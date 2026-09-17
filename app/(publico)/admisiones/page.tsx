import { db } from '@/src/datos/cliente'
import { ciclo, jornada } from '@/src/datos/esquema'
import { crearTokenFormulario } from '@/src/datos/formulario-token'
import { FormularioAdmision } from './formulario'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Admisiones' }

export default async function AdmisionesPage() {
  const [ciclos, jornadas] = await Promise.all([
    db.select().from(ciclo),
    db.select().from(jornada),
  ])

  const formularioServido = crearTokenFormulario()

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Admisiones</p>
        <h1 className="font-display text-3xl">Formulario de inscripción</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-piedra">
          Diligencie los datos del aspirante. Una vez enviado, recibirá un número de radicado
          para hacer seguimiento a su solicitud; la institución se comunicará con el acudiente
          registrado para continuar el proceso.
        </p>
      </header>

      <FormularioAdmision
        ciclos={ciclos.map((c) => ({ id: c.id, etiqueta: `Ciclo ${c.codigo} — ${c.gradoEquivalente}` }))}
        jornadas={jornadas.map((j) => ({ id: j.id, etiqueta: j.nombre }))}
        formularioServido={formularioServido}
      />
    </div>
  )
}
