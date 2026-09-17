export const COLAS = {
  GENERAR_PDF: 'pdf.generar',
  LIMPIAR_RATE_LIMIT: 'rate-limit.limpiar',
} as const

export interface TrabajoPDF {
  tipo: 'boletin' | 'recibo_caja' | 'comprobante_egreso' | 'constancia' | 'certificado' | 'contrato'
  entidadId: string
  solicitadoPor: { id: string; rol: 'superadmin' | 'docente' }
  anioLectivoId?: string
  periodoId?: string
  parametros?: Record<string, unknown>
}
