const { readFileSync } = require('fs')
const postgres = require('postgres')

const ARCHIVO_LATIDO = process.env.WORKER_LATIDO || '/tmp/agora-worker-latido'
const LATIDO_MAXIMO_MS = 2 * 60 * 1000

function fallar(motivo) {
  console.error(`No saludable: ${motivo}`)
  process.exit(1)
}

async function revisar() {
  let latido
  try {
    latido = JSON.parse(readFileSync(ARCHIVO_LATIDO, 'utf8'))
  } catch {
    fallar('el worker no ha registrado ningún latido')
  }
  const edad = Date.now() - Number(latido.momento)
  if (!(edad <= LATIDO_MAXIMO_MS)) {
    fallar(`último latido de ${latido.servicio} hace ${Math.round(edad / 1000)} s (máximo 120 s)`)
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5, idle_timeout: 1 })
  try {
    await sql`SELECT 1`
  } catch (error) {
    fallar(`sin conexión a la base (${error && error.code ? error.code : 'error'})`)
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {})
  }
  console.log(`Saludable: ${latido.servicio}, último latido hace ${Math.round(edad / 1000)} s, base conectada`)
  process.exit(0)
}

revisar().catch((error) => fallar(error && error.message ? error.message : String(error)))
