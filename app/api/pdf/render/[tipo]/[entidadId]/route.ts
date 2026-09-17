import { NextRequest, NextResponse } from 'next/server'
import { validarTokenRenderPDF } from '@/src/datos/pdf-token'
import { construirBoletinHTML } from '@/src/pdf/boletin'
import { construirReciboHTML } from '@/src/pdf/recibo'
import { construirEgresoHTML } from '@/src/pdf/egreso'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; entidadId: string }> }
) {
  const { tipo, entidadId } = await params
  const token = request.nextUrl.searchParams.get('token')
  const periodoId = request.nextUrl.searchParams.get('periodo') ?? undefined

  if (!token) {
    return new NextResponse('Falta el token de renderizado', { status: 401 })
  }

  let solicitante
  try {
    solicitante = validarTokenRenderPDF(token, { tipo, entidadId, periodoId })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Token inválido'
    return new NextResponse(mensaje, { status: 401 })
  }

  try {
    if (tipo === 'boletin') {
      if (!periodoId) {
        return new NextResponse('Falta el periodo para renderizar el boletín', { status: 400 })
      }
      const html = await construirBoletinHTML(entidadId, periodoId, solicitante)
      return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    if (tipo === 'recibo_caja') {
      const html = await construirReciboHTML(entidadId, solicitante)
      return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    if (tipo === 'comprobante_egreso') {
      const html = await construirEgresoHTML(entidadId, solicitante)
      return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    return new NextResponse(`Tipo de documento no soportado todavía: ${tipo}`, { status: 501 })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error generando el documento'
    return new NextResponse(mensaje, { status: 500 })
  }
}
