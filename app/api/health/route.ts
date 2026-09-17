import { NextResponse } from 'next/server'
import { db } from '@/src/datos/cliente'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json(
      { estado: 'ok', servicio: 'agora-plataforma', db: 'conectada' },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { estado: 'error', servicio: 'agora-plataforma', db: 'sin-conexion' },
      { status: 503 }
    )
  }
}
