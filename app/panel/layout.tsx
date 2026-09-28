import { redirect } from 'next/navigation'
import Link from 'next/link'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { perfilPorClave, type ClavePerfil } from '@/src/ui/perfiles'
import { MarcaAdaptable } from '@/src/ui/marca'
import { NavPerfil } from '@/src/ui/nav-perfil'
import { CajonPanel } from '@/src/ui/cajon-panel'
import { SelectorDeTema } from '@/src/ui/selector-de-tema'
import { CerrarSesionBoton } from './cerrar-sesion-boton'
import { NAV_POR_ROL } from './navegacion'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const usuario = await obtenerUsuarioActual()
  if (!usuario || !usuario.activo) {
    redirect('/login')
  }

  const perfil = perfilPorClave(usuario.rol)
  const nombrePerfil = perfil?.nombre ?? 'Sin perfil'
  const enlaces = NAV_POR_ROL[usuario.rol as ClavePerfil] ?? []
  const IconoPerfil = perfil?.icono

  const identidad = (
    <div className="flex min-w-0 items-center gap-3">
      {IconoPerfil ? (
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-borde text-texto-secundario"
        >
          <IconoPerfil className="size-[1.125rem]" strokeWidth={1.75} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col">
        <span className="text-nota font-semibold text-texto">{nombrePerfil}</span>
        <span className="truncate text-menudo text-texto-secundario" title={usuario.correo}>
          {usuario.correo}
        </span>
      </span>
    </div>
  )

  return (
    <div className="min-h-dvh bg-superficie text-texto lg:grid lg:grid-cols-[var(--spacing-barra)_1fr]">
      <a
        href="#contenido"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[var(--capa-aviso)] focus-visible:rounded-control focus-visible:bg-texto focus-visible:px-4 focus-visible:py-2.5 focus-visible:text-nota focus-visible:font-medium focus-visible:text-superficie"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-borde lg:flex">
        <Link
          href="/panel"
          className="transicion-ui flex h-[4.5rem] items-center gap-3 border-b border-borde px-5 hover:opacity-85"
        >
          <MarcaAdaptable lado={36} />
          <span className="font-titulo text-[1.125rem] font-medium text-texto">Colegio Ágora</span>
        </Link>
        <NavPerfil
          enlaces={enlaces}
          etiqueta="Secciones del panel"
          className="flex-1 overflow-y-auto p-3"
        />
        <div className="flex flex-col gap-3 border-t border-borde p-4">
          {identidad}
          <CerrarSesionBoton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-[var(--capa-pegajosa)] flex h-16 items-center gap-2 border-b border-borde bg-superficie/90 px-4 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-superficie sm:px-6 lg:h-[4.5rem] lg:px-8">
          <CajonPanel
            enlaces={enlaces}
            nombrePerfil={nombrePerfil}
            pie={
              <div className="flex flex-col gap-3">
                {identidad}
                <CerrarSesionBoton />
              </div>
            }
          />
          <Link
            href="/panel"
            className="transicion-ui flex items-center gap-2 rounded-control p-1 hover:opacity-85 lg:hidden"
          >
            <MarcaAdaptable lado={32} />
            <span className="font-titulo text-[1.0625rem] font-medium text-texto">
              Colegio Ágora
            </span>
          </Link>
          <span className="hidden text-nota text-texto-secundario lg:inline">
            Plataforma institucional
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SelectorDeTema />
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8 focus-visible:outline-none sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
