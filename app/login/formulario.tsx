'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'
import { authClient } from '@/src/auth/cliente'

type Paso = 'credenciales' | 'totp'

export function FormularioLogin() {
  const router = useRouter()
  const parametros = useSearchParams()
  const callbackUrl = parametros.get('callbackUrl') ?? '/panel'

  const [paso, setPaso] = useState<Paso>('credenciales')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [codigoTotp, setCodigoTotp] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviarCredenciales(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { data, error: errorLogin } = await authClient.signIn.email({ email: correo, password: contrasena })

      if (errorLogin) {
        setError(errorLogin.message ?? 'Correo o contraseña incorrectos')
        return
      }

      if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
        setPaso('totp')
        return
      }

      router.push(callbackUrl as Route)
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  async function enviarTotp(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { error: errorTotp } = await authClient.twoFactor.verifyTotp({ code: codigoTotp })

      if (errorTotp) {
        setError(errorTotp.message ?? 'Código de verificación inválido')
        return
      }

      router.push(callbackUrl as Route)
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  if (paso === 'totp') {
    return (
      <form onSubmit={enviarTotp} className="flex flex-col gap-4">
        <p className="text-sm text-panel-secundario">
          Ingrese el código de 6 dígitos de su aplicación de autenticación.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Código de verificación
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={codigoTotp}
            onChange={(e) => setCodigoTotp(e.target.value)}
            className="rounded-sm border border-panel-borde bg-panel-lateral px-3 py-2 text-lg tracking-[0.3em] text-panel-texto"
          />
        </label>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-sm bg-carmin px-4 py-2 font-semibold text-hueso disabled:opacity-50"
        >
          {enviando ? 'Verificando…' : 'Verificar'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={enviarCredenciales} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Correo institucional
        <input
          type="email"
          required
          autoFocus
          autoComplete="username"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="rounded-sm border border-panel-borde bg-panel-lateral px-3 py-2 text-panel-texto"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          type="password"
          required
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className="rounded-sm border border-panel-borde bg-panel-lateral px-3 py-2 text-panel-texto"
        />
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-sm bg-carmin px-4 py-2 font-semibold text-hueso disabled:opacity-50"
      >
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
