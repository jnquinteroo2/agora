'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { authClient } from '@/src/auth/cliente'
import { Boton } from '@/src/ui/boton'
import { Campo, Entrada } from '@/src/ui/campo'

type Paso = 'credenciales' | 'totp'

interface ErrorDeAutenticacion {
  status?: number
  message?: string
}

function mensajeDeError(error: ErrorDeAutenticacion | null, paso: Paso): string {
  const estado = error?.status ?? 0
  if (estado === 401 || estado === 400) {
    return paso === 'totp'
      ? 'El código de verificación no es válido o ya venció. Revise su aplicación de autenticación e intente de nuevo.'
      : 'El correo o la contraseña no coinciden. Revíselos e intente de nuevo.'
  }
  if (estado === 403) {
    return 'Su cuenta no tiene acceso a la plataforma. Si cree que es un error, comuníquese con la institución.'
  }
  if (estado === 429) {
    return 'Hubo demasiados intentos seguidos. Espere unos minutos antes de volver a intentarlo.'
  }
  if (estado >= 500) {
    return 'La plataforma no pudo procesar el ingreso en este momento. Sus datos no tienen problema: intente de nuevo en unos minutos.'
  }
  return 'No fue posible conectar con la plataforma. Revise su conexión a internet e intente de nuevo.'
}

function destinoSeguro(valor: string | null): Route {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//')) return '/panel' as Route
  return valor as Route
}

const ERRORES_DE_KEYCLOAK: Record<string, string> = {
  signup_disabled:
    'Su cuenta no está habilitada en la plataforma. Comuníquese con la administración del colegio.',
  access_denied: 'Se canceló el ingreso. Puede intentarlo de nuevo cuando quiera.',
  unable_to_create_session:
    'No fue posible confirmar su cuenta en la plataforma. Si su cuenta está activa, comuníquese con la administración del colegio.',
  account_not_linked:
    'Su cuenta no está habilitada en la plataforma. Comuníquese con la administración del colegio.',
}

function IngresoConKeycloak({ destino }: { destino: Route }) {
  const parametros = useSearchParams()
  const codigo = parametros.get('error')
  const [redirigiendo, setRedirigiendo] = useState(false)
  const [error, setError] = useState<string | null>(
    codigo
      ? (ERRORES_DE_KEYCLOAK[codigo] ??
          'No fue posible completar el ingreso. Intente de nuevo en unos minutos.')
      : null
  )

  async function ingresar() {
    setError(null)
    setRedirigiendo(true)
    try {
      const { error: errorInicio } = await authClient.signIn.social({
        provider: 'keycloak',
        callbackURL: destino,
        errorCallbackURL: '/login',
      })
      if (errorInicio) {
        setError(mensajeDeError(errorInicio, 'credenciales'))
        setRedirigiendo(false)
      }
    } catch {
      setError(mensajeDeError(null, 'credenciales'))
      setRedirigiendo(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p
          role="alert"
          id="login-error"
          className="rounded-control border border-error/50 px-4 py-3 text-nota text-error"
        >
          {error}
        </p>
      ) : null}
      <Boton type="button" talla="lg" onClick={ingresar} disabled={redirigiendo}>
        {redirigiendo ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <LockKeyhole aria-hidden="true" strokeWidth={1.75} />
        )}
        {redirigiendo ? 'Abriendo el ingreso seguro…' : 'Ingresar de forma segura'}
      </Boton>
      <p className="text-menudo text-texto-secundario">
        Lo llevamos a la página de ingreso del colegio. Allí escribe su correo, su contraseña y, si
        su perfil lo exige, el código de verificación.
      </p>
      <p className="text-menudo text-texto-secundario">
        No es posible crear una cuenta desde aquí: las cuentas las crea la administración del
        colegio.
      </p>
    </div>
  )
}

export function FormularioLogin({ keycloak = false }: { keycloak?: boolean }) {
  const router = useRouter()
  const parametros = useSearchParams()
  const destino = destinoSeguro(parametros.get('callbackUrl'))

  const [paso, setPaso] = useState<Paso>('credenciales')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [codigoTotp, setCodigoTotp] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credencialesInvalidas, setCredencialesInvalidas] = useState(false)
  const refError = useRef<HTMLParagraphElement>(null)

  function mostrarError(detalle: ErrorDeAutenticacion | null, pasoActual: Paso) {
    setCredencialesInvalidas(detalle?.status === 401 || detalle?.status === 400)
    setError(mensajeDeError(detalle, pasoActual))
    requestAnimationFrame(() => refError.current?.focus())
  }

  async function enviarCredenciales(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { data, error: errorLogin } = await authClient.signIn.email({
        email: correo,
        password: contrasena,
      })
      if (errorLogin) {
        mostrarError(errorLogin, 'credenciales')
        return
      }
      if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
        setPaso('totp')
        return
      }
      router.push(destino)
      router.refresh()
    } catch {
      mostrarError(null, 'credenciales')
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
        mostrarError(errorTotp, 'totp')
        return
      }
      router.push(destino)
      router.refresh()
    } catch {
      mostrarError(null, 'totp')
    } finally {
      setEnviando(false)
    }
  }

  if (keycloak) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-titulo text-rubro font-medium text-texto">
            Ingresar a la plataforma
          </h2>
          <p className="text-nota text-texto-secundario">
            El ingreso se hace en la página segura del colegio.
          </p>
        </div>
        <IngresoConKeycloak destino={destino} />
      </div>
    )
  }

  const avisoError = error ? (
    <p
      ref={refError}
      tabIndex={-1}
      role="alert"
      id="login-error"
      className="rounded-control border border-error/50 px-4 py-3 text-nota text-error focus-visible:outline-none"
    >
      {error}
    </p>
  ) : null

  if (paso === 'totp') {
    return (
      <form onSubmit={enviarTotp} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-titulo text-rubro font-medium text-texto">
            Verificación en dos pasos
          </h2>
          <p className="text-nota text-texto-secundario">
            Escriba el código de 6 dígitos que muestra su aplicación de autenticación.
          </p>
        </div>
        {avisoError}
        <Campo id="login-totp" etiqueta="Código de verificación">
          {(props) => (
            <Entrada
              {...props}
              aria-invalid={credencialesInvalidas || undefined}
              aria-describedby={error ? 'login-error' : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              value={codigoTotp}
              onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, ''))}
              className="font-mono text-rubro tracking-[0.4em]"
            />
          )}
        </Campo>
        <Boton type="submit" talla="lg" disabled={enviando || codigoTotp.length !== 6}>
          {enviando ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {enviando ? 'Verificando…' : 'Verificar'}
        </Boton>
      </form>
    )
  }

  return (
    <form onSubmit={enviarCredenciales} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-titulo text-rubro font-medium text-texto">Ingresar a la plataforma</h2>
        <p className="text-nota text-texto-secundario">
          Use el correo institucional y la contraseña de su cuenta.
        </p>
      </div>
      {avisoError}
      <Campo id="login-correo" etiqueta="Correo institucional">
        {(props) => (
          <Entrada
            {...props}
            aria-invalid={credencialesInvalidas || undefined}
            aria-describedby={error ? 'login-error' : undefined}
            type="email"
            required
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        )}
      </Campo>
      <Campo id="login-contrasena" etiqueta="Contraseña">
        {(props) => (
          <div className="relative">
            <Entrada
              {...props}
              aria-invalid={credencialesInvalidas || undefined}
              aria-describedby={error ? 'login-error' : undefined}
              type={verContrasena ? 'text' : 'password'}
              required
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setVerContrasena((valor) => !valor)}
              aria-pressed={verContrasena}
              aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-controls="login-contrasena"
              className="presionable absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-control text-texto-secundario hover:text-texto"
            >
              {verContrasena ? (
                <EyeOff aria-hidden="true" className="size-5" strokeWidth={1.75} />
              ) : (
                <Eye aria-hidden="true" className="size-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        )}
      </Campo>
      <Boton type="submit" talla="lg" disabled={enviando}>
        {enviando ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <LockKeyhole aria-hidden="true" strokeWidth={1.75} />
        )}
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </Boton>
      <p className="text-menudo text-texto-secundario">
        No es posible crear una cuenta desde aquí: las cuentas las crea la administración del
        colegio.
      </p>
    </form>
  )
}
