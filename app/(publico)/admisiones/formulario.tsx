'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import Link from 'next/link'
import { registrarAspirante } from '@/src/acciones/admisiones/aspirante'

interface Opcion { id: string; etiqueta: string }

const campo = 'w-full rounded-sm border border-niebla px-3 py-2 text-tinta placeholder:text-piedra'
const etiqueta = 'mb-1 block text-sm text-piedra'

export function FormularioAdmision({
  ciclos,
  jornadas,
  formularioServido,
}: {
  ciclos: Opcion[]
  jornadas: Opcion[]
  formularioServido: string
}) {
  const [autorizacion, setAutorizacion] = useState(false)
  const accion = useAction(registrarAspirante)

  if (accion.hasSucceeded && accion.result.data) {
    return (
      <div className="rounded-sm border border-exito bg-hueso p-6">
        <h2 className="font-display text-xl">Solicitud recibida</h2>
        <p className="mt-2 text-sm text-piedra">
          Su número de radicado es <strong className="text-tinta">{accion.result.data.radicado}</strong>.
          Consérvelo para hacer seguimiento a su proceso de admisión.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        if (!autorizacion) return

        accion.execute({
          primerNombre: String(form.get('primerNombre') ?? ''),
          segundoNombre: String(form.get('segundoNombre') ?? '') || undefined,
          primerApellido: String(form.get('primerApellido') ?? ''),
          segundoApellido: String(form.get('segundoApellido') ?? '') || undefined,
          tipoDocumento: form.get('tipoDocumento') as 'TI' | 'RC' | 'CE' | 'PA' | 'NIP',
          numeroDocumento: String(form.get('numeroDocumento') ?? ''),
          fechaNacimiento: String(form.get('fechaNacimiento') ?? ''),
          lugarNacimiento: String(form.get('lugarNacimiento') ?? '') || undefined,
          genero: (form.get('genero') as 'M' | 'F' | 'NB' | 'NR') || undefined,
          cicloId: String(form.get('cicloId') ?? ''),
          jornadaId: String(form.get('jornadaId') ?? ''),
          telefonoAcudiente: String(form.get('telefonoAcudiente') ?? ''),
          nombreAcudiente: String(form.get('nombreAcudiente') ?? ''),
          correoAcudiente: String(form.get('correoAcudiente') ?? '') || undefined,
          autorizacionDatos: true,
          sitio: String(form.get('sitio') ?? ''),
          formularioServido,
        })
      }}
      className="flex flex-col gap-6"
    >
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <label htmlFor="sitio">No completar este campo</label>
        <input type="text" id="sitio" name="sitio" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={etiqueta}>Primer nombre *</label>
          <input name="primerNombre" required className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Segundo nombre</label>
          <input name="segundoNombre" className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Primer apellido *</label>
          <input name="primerApellido" required className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Segundo apellido</label>
          <input name="segundoApellido" className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Tipo de documento *</label>
          <select name="tipoDocumento" required className={campo} defaultValue="">
            <option value="" disabled>Seleccione…</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="RC">Registro civil</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PA">Pasaporte</option>
            <option value="NIP">Número identificación personal</option>
          </select>
        </div>
        <div>
          <label className={etiqueta}>Número de documento *</label>
          <input name="numeroDocumento" required className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Fecha de nacimiento *</label>
          <input type="date" name="fechaNacimiento" required className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Lugar de nacimiento</label>
          <input name="lugarNacimiento" className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Género</label>
          <select name="genero" className={campo} defaultValue="">
            <option value="">Prefiere no decir</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="NB">No binario</option>
            <option value="NR">Prefiere no reportar</option>
          </select>
        </div>
        <div>
          <label className={etiqueta}>Ciclo al que aspira *</label>
          <select name="cicloId" required className={campo} defaultValue="">
            <option value="" disabled>Seleccione…</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>{c.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={etiqueta}>Jornada *</label>
          <select name="jornadaId" required className={campo} defaultValue="">
            <option value="" disabled>Seleccione…</option>
            {jornadas.map((j) => (
              <option key={j.id} value={j.id}>{j.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={etiqueta}>Nombre del acudiente *</label>
          <input name="nombreAcudiente" required className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Teléfono del acudiente *</label>
          <input name="telefonoAcudiente" required className={campo} />
        </div>
        <div>
          <label className={etiqueta}>Correo del acudiente</label>
          <input type="email" name="correoAcudiente" className={campo} />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-piedra">
        <input
          type="checkbox"
          checked={autorizacion}
          onChange={(e) => setAutorizacion(e.target.checked)}
          className="mt-1"
        />
        <span>
          Autorizo el tratamiento de mis datos personales conforme a la{' '}
          <Link href="/privacidad" className="text-carmin underline">política de tratamiento de datos</Link> de la institución. *
        </span>
      </label>

      <button
        type="submit"
        disabled={accion.isExecuting || !autorizacion}
        className="w-fit rounded-sm bg-carmin px-6 py-2 text-hueso disabled:opacity-50"
      >
        {accion.isExecuting ? 'Enviando…' : 'Enviar solicitud'}
      </button>

      {accion.hasErrored && <p className="text-sm text-error">{accion.result.serverError}</p>}
    </form>
  )
}
