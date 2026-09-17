export const metadata = { title: 'Aliados' }

export default function AliadosPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Aliados</p>
        <h1 className="font-display text-3xl">Alianzas institucionales</h1>
      </header>
      <p className="max-w-2xl text-sm leading-relaxed text-piedra">
        Esta sección reunirá a las entidades, empresas y organizaciones que se vinculen con la
        institución para apoyar procesos de admisión, bienestar estudiantil y articulación con
        la educación superior o el mundo laboral. Todavía no hay alianzas publicadas.
      </p>
    </div>
  )
}
