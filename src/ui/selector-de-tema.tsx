'use client'

import { useSyncExternalStore } from 'react'
import { AnimatedThemeToggler } from './magicui/animated-theme-toggler'
import { guardarTema } from './tema'
import { cn } from './cn'

function suscribir(alCambiar: () => void) {
  const observador = new MutationObserver(alCambiar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observador.disconnect()
}

function leerTema(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function SelectorDeTema({ className }: { className?: string }) {
  const tema = useSyncExternalStore(suscribir, leerTema, () => null)
  const etiqueta =
    tema === 'dark'
      ? 'Cambiar a modo claro'
      : tema === 'light'
        ? 'Cambiar a modo oscuro'
        : 'Cambiar el tema'

  return (
    <AnimatedThemeToggler
      theme={tema ?? 'light'}
      onThemeChange={(nuevo) => {
        document.documentElement.style.colorScheme = nuevo
        guardarTema(nuevo === 'dark' ? 'oscuro' : 'claro')
      }}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        'presionable inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-transparent text-texto hover:border-borde [&_svg]:size-5 [&_svg]:stroke-[1.75]',
        className
      )}
    />
  )
}
