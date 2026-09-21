import { exigirConfiguracionDelSitio } from './sitio'

export function verificarArranque(): void {
  try {
    exigirConfiguracionDelSitio()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
