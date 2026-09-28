'use client'

import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'

function useTemaDelDocumento(): 'light' | 'dark' {
  const [tema, setTema] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const raiz = document.documentElement
    const leer = () => setTema(raiz.classList.contains('dark') ? 'dark' : 'light')
    leer()
    const observador = new MutationObserver(leer)
    observador.observe(raiz, { attributes: true, attributeFilter: ['class'] })
    return () => observador.disconnect()
  }, [])

  return tema
}

export function Avisos() {
  const tema = useTemaDelDocumento()

  return (
    <Toaster
      theme={tema}
      position="bottom-right"
      closeButton
      containerAriaLabel="Avisos"
      customAriaLabel="Avisos (Alt + T para ir a ellos)"
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar el aviso',
        classNames: {
          toast:
            '!rounded-tarjeta !border !border-borde !bg-superficie-elevada !text-texto !shadow-flotante !font-interfaz',
          title: '!text-nota !font-semibold !text-texto',
          description: '!text-nota !text-texto-secundario',
          actionButton: '!rounded-control !bg-acento !text-sobre-acento',
          cancelButton: '!rounded-control !border !border-borde-control !bg-superficie !text-texto',
          closeButton: '!border-borde !bg-superficie-elevada !text-texto-secundario',
          success: '[&_[data-icon]]:!text-exito',
          error: '[&_[data-icon]]:!text-error',
          warning: '[&_[data-icon]]:!text-alerta',
          info: '[&_[data-icon]]:!text-info',
        },
      }}
    />
  )
}

export const aviso = toast
