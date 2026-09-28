'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import {
  CODIGOS_TIPO_DOCUMENTO,
  etiquetaTipoDocumento,
  type TipoDocumento,
} from '@/src/dominio/documentos'
import {
  crearUsuario,
  otorgarAcceso,
  cambiarEstadoUsuario,
  reintentarSincronizacion,
  reenviarInvitacionCuenta,
  restablecerContrasenaCuenta,
  cambiarCorreoUsuario,
  cambiarRolUsuario,
  exigirTotpUsuario,
} from '@/src/acciones/personas/persona'
import { campo, boton, botonSecundario, etiqueta, filaTabla } from '@/src/ui/estilos'
import { Insignia } from '@/src/ui/insignia'
import type { CuentaListada } from './datos'
import type { Rol } from '@/src/auth/roles'

export interface OpcionRol {
  clave: Rol
  nombre: string
}

function CredencialTemporal({ usuario, contrasena }: { usuario: string; contrasena: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-control border border-alerta/40 p-4 text-nota">
      <p className="font-medium text-texto">
        Entregue estos datos en persona. La contraseña no se volverá a mostrar.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-texto-secundario">Usuario</dt>
        <dd className="font-mono break-all text-texto">{usuario}</dd>
        <dt className="text-texto-secundario">Contraseña temporal</dt>
        <dd className="font-mono break-all text-texto">{contrasena}</dd>
      </dl>
      <p className="text-texto-secundario">
        En el primer ingreso se le pedirá definir una contraseña propia.
      </p>
    </div>
  )
}

export function FormularioCrearCuenta({
  roles,
  conKeycloak,
}: {
  roles: OpcionRol[]
  conKeycloak: boolean
}) {
  const id = useId()
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('CC')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [primerNombre, setPrimerNombre] = useState('')
  const [segundoNombre, setSegundoNombre] = useState('')
  const [primerApellido, setPrimerApellido] = useState('')
  const [segundoApellido, setSegundoApellido] = useState('')
  const [rol, setRol] = useState<Rol>(roles.find((r) => r.clave === 'docente')?.clave ?? roles[0]?.clave ?? 'docente')
  const [sinCorreo, setSinCorreo] = useState(false)
  const [correo, setCorreo] = useState('')
  const [contrasenaInicial, setContrasenaInicial] = useState('')

  const accion = useAction(crearUsuario, {
    onSuccess: () => {
      setNumeroDocumento('')
      setPrimerNombre('')
      setSegundoNombre('')
      setPrimerApellido('')
      setSegundoApellido('')
      setCorreo('')
      setContrasenaInicial('')
      setSinCorreo(false)
    },
  })

  const excepcionDisponible = rol === 'estudiante'
  const usaSinCorreo = excepcionDisponible && sinCorreo
  const pideContrasena = !conKeycloak && !usaSinCorreo
  const resultado = accion.result.data
  const errorDeValidacion = accion.result.validationErrors
    ? 'Revise los datos: hay campos obligatorios vacíos o con un formato no válido.'
    : null

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          accion.execute({
            rol,
            sinCorreo: usaSinCorreo,
            correo: usaSinCorreo ? undefined : correo.trim() || undefined,
            contrasenaInicial: pideContrasena ? contrasenaInicial : undefined,
            persona: {
              tipoDocumento,
              numeroDocumento: numeroDocumento.trim(),
              primerNombre: primerNombre.trim(),
              segundoNombre: segundoNombre.trim() || undefined,
              primerApellido: primerApellido.trim(),
              segundoApellido: segundoApellido.trim() || undefined,
              correo: usaSinCorreo ? undefined : correo.trim() || undefined,
            },
          })
        }}
        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className={etiqueta}>
          <span>Tipo de documento</span>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
            className={`${campo} w-full`}
          >
            {CODIGOS_TIPO_DOCUMENTO.map((t) => (
              <option key={t} value={t}>
                {etiquetaTipoDocumento(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={etiqueta}>
          <span>Número de documento</span>
          <input
            required
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
        <label className={etiqueta}>
          <span>Primer nombre</span>
          <input
            required
            value={primerNombre}
            onChange={(e) => setPrimerNombre(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
        <label className={etiqueta}>
          <span>Segundo nombre (opcional)</span>
          <input
            value={segundoNombre}
            onChange={(e) => setSegundoNombre(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
        <label className={etiqueta}>
          <span>Primer apellido</span>
          <input
            required
            value={primerApellido}
            onChange={(e) => setPrimerApellido(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
        <label className={etiqueta}>
          <span>Segundo apellido (opcional)</span>
          <input
            value={segundoApellido}
            onChange={(e) => setSegundoApellido(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
        <label className={etiqueta}>
          <span>Perfil</span>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            className={`${campo} w-full`}
          >
            {roles.map((r) => (
              <option key={r.clave} value={r.clave}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        {usaSinCorreo ? null : (
          <label className={etiqueta}>
            <span>Correo de acceso</span>
            <input
              type="email"
              required
              autoComplete="off"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={`${campo} w-full`}
            />
          </label>
        )}
        {pideContrasena ? (
          <label className={etiqueta}>
            <span>Contraseña inicial (mínimo 12 caracteres)</span>
            <input
              required
              minLength={12}
              autoComplete="new-password"
              value={contrasenaInicial}
              onChange={(e) => setContrasenaInicial(e.target.value)}
              className={`${campo} w-full`}
            />
          </label>
        ) : null}
        {excepcionDisponible ? (
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
            <label className="flex items-start gap-2 text-nota text-texto">
              <input
                type="checkbox"
                checked={sinCorreo}
                onChange={(e) => setSinCorreo(e.target.checked)}
                aria-describedby={`${id}-sin-correo`}
                className="mt-1 size-4 accent-acento"
              />
              <span>El estudiante no tiene correo propio (excepción)</span>
            </label>
            <p id={`${id}-sin-correo`} className="text-menudo text-texto-secundario">
              La plataforma genera un nombre de usuario y una contraseña temporal para entregar en
              persona. En el primer ingreso se le pide cambiarla. La excepción queda en la
              auditoría.
            </p>
          </div>
        ) : null}
        <p className="text-menudo text-texto-secundario sm:col-span-2 lg:col-span-3">
          {conKeycloak
            ? usaSinCorreo
              ? 'La cuenta se crea con una contraseña temporal.'
              : 'Se enviará una invitación al correo para que la persona defina su contraseña. El enlace vence en 72 horas.'
            : 'La cuenta se crea con la contraseña inicial que usted escriba.'}
        </p>
        <button type="submit" disabled={accion.isExecuting} className={boton}>
          {accion.isExecuting ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <div aria-live="polite" className="flex flex-col gap-3">
        {accion.hasErrored ? (
          <p role="alert" className="text-nota text-error">
            {accion.result.serverError ?? errorDeValidacion}
          </p>
        ) : null}
        {resultado ? (
          <div className="flex flex-col gap-3">
            <p className="text-nota text-exito">Cuenta creada.</p>
            {resultado.invitacion === 'enviada' ? (
              <p className="text-nota text-texto">Se envió la invitación al correo de acceso.</p>
            ) : null}
            {resultado.invitacion === 'fallida' ? (
              <p className="text-nota text-alerta">
                La cuenta quedó creada, pero la invitación no se pudo enviar. Reenvíela desde la
                lista de cuentas.
              </p>
            ) : null}
            {resultado.credencialTemporal ? (
              <CredencialTemporal
                usuario={resultado.credencialTemporal.usuario}
                contrasena={resultado.credencialTemporal.contrasena}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function FormularioOtorgarAcceso({
  personaId,
  conKeycloak,
}: {
  personaId: string
  conKeycloak: boolean
}) {
  const id = useId()
  const [sinCorreo, setSinCorreo] = useState(false)
  const [correo, setCorreo] = useState('')
  const [contrasenaInicial, setContrasenaInicial] = useState('')
  const accion = useAction(otorgarAcceso)
  const pideContrasena = !conKeycloak && !sinCorreo
  const resultado = accion.result.data

  if (resultado) {
    return (
      <div aria-live="polite" className="flex flex-col gap-2">
        <span className="text-menudo text-exito">Acceso creado</span>
        {resultado.invitacion === 'enviada' ? (
          <span className="text-menudo text-texto">Se envió la invitación al correo.</span>
        ) : null}
        {resultado.invitacion === 'fallida' ? (
          <span className="text-menudo text-alerta">
            La invitación no se pudo enviar. Reenvíela desde Cuentas.
          </span>
        ) : null}
        {resultado.credencialTemporal ? (
          <CredencialTemporal
            usuario={resultado.credencialTemporal.usuario}
            contrasena={resultado.credencialTemporal.contrasena}
          />
        ) : null}
      </div>
    )
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        accion.execute({
          personaId,
          rol: 'estudiante',
          sinCorreo,
          correo: sinCorreo ? undefined : correo.trim() || undefined,
          contrasenaInicial: pideContrasena ? contrasenaInicial : undefined,
        })
      }}
      className="flex flex-col gap-2"
    >
      <label className="flex items-start gap-2 text-menudo text-texto">
        <input
          type="checkbox"
          checked={sinCorreo}
          onChange={(e) => setSinCorreo(e.target.checked)}
          aria-describedby={`${id}-ayuda`}
          className="mt-0.5 size-4 accent-acento"
        />
        <span>Sin correo propio (excepción)</span>
      </label>
      <p id={`${id}-ayuda`} className="text-menudo text-texto-secundario">
        {sinCorreo
          ? 'Se genera un usuario y una contraseña temporal para entregar en persona.'
          : conKeycloak
            ? 'Se enviará una invitación al correo.'
            : 'La cuenta usará la contraseña inicial que escriba.'}
      </p>
      {sinCorreo ? null : (
        <label className={etiqueta}>
          <span>Correo de acceso</span>
          <input
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
      )}
      {pideContrasena ? (
        <label className={etiqueta}>
          <span>Contraseña inicial (mínimo 12 caracteres)</span>
          <input
            required
            minLength={12}
            autoComplete="new-password"
            value={contrasenaInicial}
            onChange={(e) => setContrasenaInicial(e.target.value)}
            className={`${campo} w-full`}
          />
        </label>
      ) : null}
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Creando…' : 'Crear acceso'}
      </button>
      {accion.hasErrored ? (
        <span role="alert" className="text-menudo text-error">
          {accion.result.serverError ?? 'Revise los datos del acceso.'}
        </span>
      ) : null}
    </form>
  )
}

function CambioDePerfil({
  cuenta,
  roles,
  alCerrar,
}: {
  cuenta: CuentaListada
  roles: OpcionRol[]
  alCerrar: () => void
}) {
  const id = useId()
  const router = useRouter()
  const disponibles = roles.filter((r) => !cuenta.sinCorreo || r.clave === 'estudiante')
  const [rol, setRol] = useState<Rol>(
    (disponibles.find((r) => r.clave === cuenta.rol)?.clave ?? disponibles[0]?.clave ?? 'docente') as Rol
  )
  const accion = useAction(cambiarRolUsuario, {
    onSuccess: () => {
      alCerrar()
      router.refresh()
    },
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        accion.execute({ usuarioId: cuenta.id, rol })
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label htmlFor={`${id}-perfil`} className={etiqueta}>
        <span>Perfil nuevo</span>
        <select
          id={`${id}-perfil`}
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          className={`${campo} w-56`}
        >
          {disponibles.map((r) => (
            <option key={r.clave} value={r.clave}>
              {r.nombre}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Guardando…' : 'Guardar perfil'}
      </button>
      <button type="button" onClick={alCerrar} className={botonSecundario}>
        Cancelar
      </button>
      <p className="w-full text-menudo text-texto-secundario">
        Al cambiar el perfil se cierran las sesiones abiertas de esta cuenta.
      </p>
      {accion.hasErrored ? (
        <p role="alert" className="w-full text-menudo text-error">
          {accion.result.serverError ?? 'Elija un perfil válido.'}
        </p>
      ) : null}
    </form>
  )
}

function CambioDeCorreo({ cuenta, alCerrar }: { cuenta: CuentaListada; alCerrar: () => void }) {
  const id = useId()
  const router = useRouter()
  const [correo, setCorreo] = useState(cuenta.correo)
  const accion = useAction(cambiarCorreoUsuario, {
    onSuccess: () => {
      alCerrar()
      router.refresh()
    },
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        accion.execute({ usuarioId: cuenta.id, correo: correo.trim() })
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label htmlFor={`${id}-correo`} className={etiqueta}>
        <span>Correo nuevo</span>
        <input
          id={`${id}-correo`}
          type="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className={`${campo} w-64`}
        />
      </label>
      <button type="submit" disabled={accion.isExecuting} className={boton}>
        {accion.isExecuting ? 'Guardando…' : 'Guardar correo'}
      </button>
      <button type="button" onClick={alCerrar} className={botonSecundario}>
        Cancelar
      </button>
      {accion.hasErrored ? (
        <p role="alert" className="w-full text-menudo text-error">
          {accion.result.serverError ?? 'Escriba un correo válido.'}
        </p>
      ) : null}
    </form>
  )
}

export function FilaCuenta({
  cuenta,
  nombreRol,
  conKeycloak,
  esPropia,
  roles,
}: {
  cuenta: CuentaListada
  nombreRol: string
  conKeycloak: boolean
  esPropia: boolean
  roles: OpcionRol[]
}) {
  const [activo, setActivo] = useState(cuenta.activo)
  const [pendiente, setPendiente] = useState(cuenta.pendienteSincronizar)
  const [editandoCorreo, setEditandoCorreo] = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error' | 'alerta'; texto: string } | null>(
    null
  )
  const [credencial, setCredencial] = useState<{ usuario: string; contrasena: string } | null>(
    null
  )

  const estado = useAction(cambiarEstadoUsuario, {
    onSuccess: ({ data }) => {
      if (!data) return
      setActivo(data.activo)
      setPendiente(data.sincronizacion === 'pendiente')
      setAviso(
        data.sincronizacion === 'pendiente'
          ? {
              tono: 'alerta',
              texto: 'Guardado en la plataforma. Keycloak quedó pendiente de sincronizar.',
            }
          : { tono: 'exito', texto: data.activo ? 'Cuenta activada.' : 'Cuenta desactivada.' }
      )
    },
    onError: ({ error }) => setAviso({ tono: 'error', texto: error.serverError ?? 'No se pudo guardar.' }),
  })
  const sincronizar = useAction(reintentarSincronizacion, {
    onSuccess: ({ data }) => {
      setPendiente(data === 'pendiente')
      setAviso(
        data === 'pendiente'
          ? { tono: 'alerta', texto: 'Keycloak sigue sin responder. Se reintentará más tarde.' }
          : { tono: 'exito', texto: 'Sincronizado con Keycloak.' }
      )
    },
    onError: ({ error }) => setAviso({ tono: 'error', texto: error.serverError ?? 'No se pudo sincronizar.' }),
  })
  const invitacion = useAction(reenviarInvitacionCuenta, {
    onSuccess: () => setAviso({ tono: 'exito', texto: 'Invitación reenviada.' }),
    onError: ({ error }) => setAviso({ tono: 'error', texto: error.serverError ?? 'No se pudo reenviar.' }),
  })
  const totp = useAction(exigirTotpUsuario, {
    onSuccess: () =>
      setAviso({
        tono: 'exito',
        texto: 'En su próximo ingreso se le pedirá configurar la verificación en dos pasos.',
      }),
    onError: ({ error }) =>
      setAviso({ tono: 'error', texto: error.serverError ?? 'No se pudo pedir la verificación.' }),
  })
  const restablecer = useAction(restablecerContrasenaCuenta, {
    onSuccess: ({ data }) => {
      if (data) setCredencial(data)
      setAviso(null)
    },
    onError: ({ error }) => setAviso({ tono: 'error', texto: error.serverError ?? 'No se pudo restablecer.' }),
  })

  const ocupado =
    estado.isExecuting ||
    sincronizar.isExecuting ||
    invitacion.isExecuting ||
    restablecer.isExecuting ||
    totp.isExecuting

  return (
    <>
      <tr className={filaTabla}>
        <td className="py-2 pr-3">{cuenta.nombre}</td>
        <td className="py-2 pr-3 break-all">
          {cuenta.acceso}
          {cuenta.sinCorreo ? (
            <span className="block text-menudo text-texto-secundario">Sin correo (excepción)</span>
          ) : null}
        </td>
        <td className="py-2 pr-3">{nombreRol}</td>
        <td className="py-2 pr-3">
          <span className="flex flex-wrap gap-1.5">
            <Insignia tono={activo ? 'exito' : 'neutra'}>{activo ? 'Activa' : 'Inactiva'}</Insignia>
            {pendiente ? <Insignia tono="alerta">Pendiente de sincronizar</Insignia> : null}
            {conKeycloak && !cuenta.enlazadaKeycloak ? (
              <Insignia tono="info">Sin enlace con Keycloak</Insignia>
            ) : null}
          </span>
        </td>
        <td className="py-2">
          <div className="flex flex-wrap gap-2">
            {esPropia ? null : (
              <button
                type="button"
                onClick={() => estado.execute({ usuarioId: cuenta.id, activo: !activo })}
                disabled={ocupado}
                className={botonSecundario}
              >
                {estado.isExecuting ? 'Guardando…' : activo ? 'Desactivar' : 'Activar'}
              </button>
            )}
            {pendiente && conKeycloak ? (
              <button
                type="button"
                onClick={() => sincronizar.execute({ usuarioId: cuenta.id })}
                disabled={ocupado}
                className={botonSecundario}
              >
                {sincronizar.isExecuting ? 'Sincronizando…' : 'Reintentar sincronización'}
              </button>
            ) : null}
            {conKeycloak && cuenta.enlazadaKeycloak && !cuenta.sinCorreo && activo ? (
              <button
                type="button"
                onClick={() => invitacion.execute({ usuarioId: cuenta.id })}
                disabled={ocupado}
                className={botonSecundario}
              >
                {invitacion.isExecuting ? 'Enviando…' : 'Reenviar invitación'}
              </button>
            ) : null}
            {conKeycloak && cuenta.enlazadaKeycloak && activo && !cuenta.totpObligatorio ? (
              <button
                type="button"
                onClick={() => totp.execute({ usuarioId: cuenta.id })}
                disabled={ocupado}
                className={botonSecundario}
              >
                {totp.isExecuting ? 'Guardando…' : 'Pedir verificación en dos pasos'}
              </button>
            ) : null}
            {esPropia ? null : (
              <button
                type="button"
                onClick={() => setEditandoPerfil((valor) => !valor)}
                aria-expanded={editandoPerfil}
                disabled={ocupado}
                className={botonSecundario}
              >
                Cambiar perfil
              </button>
            )}
            {cuenta.sinCorreo ? (
              <button
                type="button"
                onClick={() => restablecer.execute({ usuarioId: cuenta.id })}
                disabled={ocupado}
                className={botonSecundario}
              >
                {restablecer.isExecuting ? 'Generando…' : 'Restablecer contraseña'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditandoCorreo((valor) => !valor)}
                aria-expanded={editandoCorreo}
                disabled={ocupado}
                className={botonSecundario}
              >
                Cambiar correo
              </button>
            )}
          </div>
          <div aria-live="polite">
            {aviso ? (
              <p
                role={aviso.tono === 'error' ? 'alert' : undefined}
                className={`mt-1 text-menudo ${aviso.tono === 'error' ? 'text-error' : aviso.tono === 'alerta' ? 'text-alerta' : 'text-exito'}`}
              >
                {aviso.texto}
              </p>
            ) : null}
          </div>
        </td>
      </tr>
      {editandoCorreo || editandoPerfil || credencial ? (
        <tr className={filaTabla}>
          <td colSpan={5} className="flex flex-col gap-3 py-3">
            {editandoPerfil ? (
              <CambioDePerfil cuenta={cuenta} roles={roles} alCerrar={() => setEditandoPerfil(false)} />
            ) : null}
            {editandoCorreo ? (
              <CambioDeCorreo cuenta={cuenta} alCerrar={() => setEditandoCorreo(false)} />
            ) : null}
            {credencial ? (
              <CredencialTemporal usuario={credencial.usuario} contrasena={credencial.contrasena} />
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  )
}
