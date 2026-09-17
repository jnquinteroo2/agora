import { sql, eq } from 'drizzle-orm'
import { db } from './cliente'
import * as e from './esquema'
import { env } from '../env'

function linea(etiqueta: string, valor: unknown) {
  console.log(`  ${etiqueta.padEnd(34)} ${String(valor)}`)
}

async function diagnosticar() {
  console.log('\n=== DIAGNOSTICO DEL CAMINO DE LOGIN ===\n')

  console.log('Conexion:')
  const meta = (await db.execute(
    sql`SELECT current_database() AS bd, current_user AS rol, current_schemas(true)::text AS esquemas`
  )) as unknown as Array<Record<string, unknown>>
  linea('base de datos', meta[0]?.bd)
  linea('rol', meta[0]?.rol)
  linea('search_path efectivo', meta[0]?.esquemas)

  console.log('\nRLS sobre las tablas de Better Auth:')
  const rls = (await db.execute(
    sql`SELECT relname, relrowsecurity, relforcerowsecurity
        FROM pg_class WHERE relname IN ('ba_user','ba_account')`
  )) as unknown as Array<Record<string, unknown>>
  for (const r of rls) {
    linea(String(r.relname), `rowsecurity=${r.relrowsecurity} force=${r.relforcerowsecurity}`)
  }

  console.log('\nSQL directo sobre ba_user:')
  const crudo = (await db.execute(
    sql`SELECT id, email, length(email) AS largo FROM ba_user`
  )) as unknown as Array<Record<string, unknown>>
  linea('filas visibles', crudo.length)
  for (const f of crudo) {
    linea('· email', JSON.stringify(f.email))
    linea('  largo del email', f.largo)
    linea('  id', f.id)
  }

  console.log('\nConsulta de Drizzle con eq(email) -- lo que hace el adaptador:')
  const porEq = await db.select().from(e.baUser).where(eq(e.baUser.email, env.SUPERADMIN_EMAIL))
  linea('filas encontradas', porEq.length)
  linea('email buscado', JSON.stringify(env.SUPERADMIN_EMAIL))
  linea('largo buscado', env.SUPERADMIN_EMAIL.length)

  console.log('\nLlamada real a Better Auth (auth.api.signInEmail):')
  try {
    const { auth } = await import('../auth/config')
    const respuesta = await auth.api.signInEmail({
      body: { email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_CONTRASENA_INICIAL },
      asResponse: true,
    })
    linea('estado HTTP', `${respuesta.status} ${respuesta.statusText}`)
    const cuerpo = await respuesta.text()
    linea('cuerpo', cuerpo.slice(0, 500))
  } catch (error) {
    linea('EXCEPCION', (error as Error).message)
    const causa = (error as { cause?: unknown }).cause
    if (causa) linea('causa', String(causa))
    console.log((error as Error).stack?.split('\n').slice(0, 8).join('\n'))
  }

  console.log('\n=== FIN ===\n')
}

diagnosticar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
