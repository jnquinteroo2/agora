export const TIPOS_DOCUMENTO = {
  CC: 'Cédula de ciudadanía',
  TI: 'Tarjeta de identidad',
  CE: 'Cédula de extranjería',
  PPT: 'Permiso por Protección Temporal',
  RC: 'Registro civil',
  PA: 'Pasaporte',
  NIP: 'Número de identificación personal',
} as const

export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO

export const CODIGOS_TIPO_DOCUMENTO = Object.keys(TIPOS_DOCUMENTO) as [
  TipoDocumento,
  ...TipoDocumento[],
]

export function etiquetaTipoDocumento(codigo: TipoDocumento): string {
  return `${codigo} · ${TIPOS_DOCUMENTO[codigo]}`
}
