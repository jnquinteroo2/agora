export const metadata = { title: 'Modelo CLEI' }

const CICLOS = [
  { ciclo: '3A y 3B', grados: 'Sexto y séptimo', duracion: '2 semestres (uno por ciclo)' },
  { ciclo: '4A y 4B', grados: 'Octavo y noveno', duracion: '2 semestres (uno por ciclo)' },
  { ciclo: '5', grados: 'Décimo', duracion: '1 semestre' },
  { ciclo: '6', grados: 'Undécimo', duracion: '1 semestre' },
]

export default function ModeloCleiPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Modelo pedagógico</p>
        <h1 className="font-display text-3xl">Ciclos Lectivos Especiales Integrados (CLEI)</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-piedra">
          El modelo CLEI es la modalidad oficial de educación para jóvenes y adultos en Colombia:
          agrupa dos grados de la educación regular en un solo ciclo, permitiendo avanzar en el
          currículo con una intensidad horaria adaptada a quienes trabajan o tienen otras
          responsabilidades durante el día.
        </p>
      </header>

      <section>
        <h2 className="mb-4 font-display text-xl">Ciclos que ofrece la institución</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-niebla text-left text-piedra">
                <th className="py-2">Ciclo</th>
                <th className="py-2">Equivale a</th>
                <th className="py-2">Duración aproximada</th>
              </tr>
            </thead>
            <tbody>
              {CICLOS.map((c) => (
                <tr key={c.ciclo} className="border-b border-niebla/60">
                  <td className="py-2">{c.ciclo}</td>
                  <td className="py-2">{c.grados}</td>
                  <td className="py-2">{c.duracion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-sm border border-niebla p-4">
          <h3 className="mb-2 font-display text-lg">Jornada diurna</h3>
          <p className="text-sm text-piedra">Clases en horario de mañana, de lunes a viernes.</p>
        </div>
        <div className="rounded-sm border border-niebla p-4">
          <h3 className="mb-2 font-display text-lg">Jornada nocturna</h3>
          <p className="text-sm text-piedra">Clases en horario nocturno, de lunes a viernes.</p>
        </div>
        <div className="rounded-sm border border-niebla p-4">
          <h3 className="mb-2 font-display text-lg">Semipresencial sabatina</h3>
          <p className="text-sm text-piedra">Encuentros presenciales concentrados los sábados.</p>
        </div>
      </section>
    </div>
  )
}
