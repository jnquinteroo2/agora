import Link from 'next/link'
import { db } from '@/src/datos/cliente'
import { ciclo, jornada } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Oferta educativa' }

export default async function OfertaPage() {
  const [ciclos, jornadas] = await Promise.all([
    db.select().from(ciclo),
    db.select().from(jornada),
  ])

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Oferta educativa</p>
        <h1 className="font-display text-3xl">Ciclos y jornadas disponibles</h1>
      </header>

      <section>
        <h2 className="mb-4 font-display text-xl">Ciclos (CLEI)</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ciclos.map((c) => (
            <div key={c.id} className="rounded-sm border border-niebla p-4">
              <p className="font-mono text-xs text-piedra">Ciclo {c.codigo}</p>
              <h3 className="font-display text-lg">{c.gradoEquivalente}</h3>
            </div>
          ))}
          {ciclos.length === 0 && <p className="text-sm text-piedra">Los ciclos aún no se han configurado.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl">Jornadas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {jornadas.map((j) => (
            <div key={j.id} className="rounded-sm border border-niebla p-4">
              <h3 className="font-display text-lg">{j.nombre}</h3>
              {j.detalle && <p className="text-sm text-piedra">{j.detalle}</p>}
            </div>
          ))}
          {jornadas.length === 0 && <p className="text-sm text-piedra">Las jornadas aún no se han configurado.</p>}
        </div>
      </section>

      <div>
        <Link href="/admisiones" className="rounded-sm bg-carmin px-5 py-2 text-hueso hover:bg-carmin-hondo">
          Iniciar el proceso de admisión
        </Link>
      </div>
    </div>
  )
}
