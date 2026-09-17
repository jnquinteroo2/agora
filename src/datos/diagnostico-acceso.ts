import { verify } from '@node-rs/argon2'
import { db, conContextoRLS } from './cliente'
import * as e from './esquema'
import { env } from '../env'

const CONTEXTO = {
  usuarioId: '00000000-0000-0000-0000-000000000000',
  rol: 'superadmin' as const,
}

function linea(etiqueta: string, valor: unknown) {
  console.log(`  ${etiqueta.padEnd(30)} ${String(valor)}`)
}

async function diagnosticar() {
  console.log('\n=== DIAGNOSTICO DE ACCESO ===\n')

  console.log('Variables de entorno vistas por el contenedor:')
  linea('SUPERADMIN_EMAIL', JSON.stringify(env.SUPERADMIN_EMAIL))
  linea('largo de la contrasena', env.SUPERADMIN_CONTRASENA_INICIAL.length)
  linea('BETTER_AUTH_URL', env.BETTER_AUTH_URL)
  linea('NEXT_PUBLIC_APP_URL', env.NEXT_PUBLIC_APP_URL)

  console.log('\nTabla ba_user (contra la que autentica Better Auth):')
  const usuariosBA = await db.select().from(e.baUser)
  linea('filas totales', usuariosBA.length)
  for (const u of usuariosBA) {
    linea('· email', JSON.stringify(u.email))
    linea('  id', u.id)
    linea('  emailVerified', u.emailVerified)
  }

  const baCoincide = usuariosBA.find(
    (u) => u.email.toLowerCase() === env.SUPERADMIN_EMAIL.toLowerCase()
  )
  linea('coincide con SUPERADMIN_EMAIL', baCoincide ? 'SI' : 'NO')
  if (baCoincide && baCoincide.email !== env.SUPERADMIN_EMAIL) {
    linea('AVISO mayusculas distintas', JSON.stringify(baCoincide.email))
  }

  console.log('\nTabla ba_account (donde vive la contrasena):')
  const cuentas = await db.select().from(e.baAccount)
  linea('filas totales', cuentas.length)
  for (const c of cuentas) {
    linea('· providerId', JSON.stringify(c.providerId))
    linea('  userId', c.userId)
    linea('  password presente', c.password ? `si (${c.password.length} chars)` : 'NO -- esta es la causa')
    if (c.password) linea('  prefijo del hash', c.password.slice(0, 30) + '...')
  }

  console.log('\nVerificacion del hash contra SUPERADMIN_CONTRASENA_INICIAL:')
  if (!baCoincide) {
    linea('resultado', 'no hay ba_user con ese correo -- imposible verificar')
  } else {
    const cuenta = cuentas.find(
      (c) => c.userId === baCoincide.id && c.providerId === 'credential'
    )
    if (!cuenta) {
      linea('resultado', 'hay ba_user pero NO su ba_account providerId=credential')
    } else if (!cuenta.password) {
      linea('resultado', 'la fila existe pero password esta vacio')
    } else {
      try {
        const valido = await verify(cuenta.password, env.SUPERADMIN_CONTRASENA_INICIAL)
        linea('resultado', valido ? 'VALIDO -- la contrasena del .env abre esta cuenta' : 'INVALIDO -- el hash es de otra contrasena')
      } catch (error) {
        linea('resultado', `error al verificar: ${(error as Error).message}`)
      }
    }
  }

  console.log('\nSegundo factor (ba_two_factor):')
  try {
    const filas = (await db.execute('SELECT user_id FROM ba_two_factor')) as unknown as unknown[]
    const n = Array.isArray(filas) ? filas.length : 0
    linea('filas', n)
    linea('nota', n > 0 ? 'hay TOTP configurado: el login pedira codigo' : 'sin TOTP, el login es directo')
  } catch (error) {
    linea('error', (error as Error).message)
  }

  console.log('\nTablas del dominio (usuario):')
  await conContextoRLS(db, CONTEXTO, async (tx) => {
    const usuarios = await tx.select().from(e.usuario)
    linea('filas en usuario', usuarios.length)
    for (const u of usuarios) {
      linea('· correo', JSON.stringify(u.correo))
      linea('  id', u.id)
      linea('  rol', u.rol)
      linea('  primerIngreso', u.primerIngreso)
      linea('  id enlazado con ba_user', usuariosBA.some((b) => b.id === u.id) ? 'si' : 'NO -- ids distintos')
    }
  })

  console.log('\n=== FIN DEL DIAGNOSTICO ===\n')
}

diagnosticar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error en el diagnostico:', error)
    process.exit(1)
  })
