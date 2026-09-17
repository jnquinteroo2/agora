import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { db } from '@/src/datos/cliente'
import { configuracionInstitucional } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


const NAV_PUBLICO = [
  { href: '/inicio', etiqueta: 'Inicio' },
  { href: '/institucion', etiqueta: 'Institución' },
  { href: '/modelo-clei', etiqueta: 'Modelo CLEI' },
  { href: '/oferta', etiqueta: 'Oferta educativa' },
  { href: '/admisiones', etiqueta: 'Admisiones' },
  { href: '/galeria', etiqueta: 'Galería' },
  { href: '/blog', etiqueta: 'Noticias' },
  { href: '/aliados', etiqueta: 'Aliados' },
  { href: '/contacto', etiqueta: 'Contacto' },
]

export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  const [config] = await db.select().from(configuracionInstitucional).limit(1)
  const nombreColegio = config?.nombreCorto ?? config?.nombreLegal ?? 'Colegio Ágora'

  return (
    <div className="flex min-h-screen flex-col bg-hueso text-tinta">
      <header className="border-b border-niebla">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/inicio" className="flex items-center gap-3">
            <Image src="/marca/escudo-agora.png" alt="" width={40} height={40} />
            <span className="font-display text-lg">{nombreColegio}</span>
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {NAV_PUBLICO.map((item) => (
              <Link key={item.href} href={item.href as Route} className="text-piedra hover:text-tinta">
                {item.etiqueta}
              </Link>
            ))}
            <Link href="/login" className="text-carmin hover:text-carmin-hondo">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-niebla bg-tinta text-hueso">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm">
          <span className="font-display text-lg">{nombreColegio}</span>
          {config?.direccion && <span className="text-niebla">{config.direccion}{config.municipio ? `, ${config.municipio}` : ''}</span>}
          <div className="flex flex-wrap gap-4">
            {config?.telefono && <span>{config.telefono}</span>}
            {config?.correo && <span>{config.correo}</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-niebla">
            <Link href="/privacidad" className="hover:text-hueso">Tratamiento de datos personales</Link>
            <span>© {new Date().getFullYear()} {nombreColegio}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
