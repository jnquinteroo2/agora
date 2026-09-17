
export interface BandaEscala {
  nivel: string
  desde: number
  hasta: number
  orden: number
}

export function redondearNota(nota: number): number {
  const corregido = nota * 10 + Number.EPSILON * Math.sign(nota) * 10
  return Math.round(corregido) / 10
}

export function obtenerNivelDesempeno(
  nota: number | null | undefined,
  escala: BandaEscala[]
): string | null {
  if (nota === null || nota === undefined) return null
  const banda = escala.find((b) => nota >= b.desde && nota <= b.hasta)
  return banda?.nivel ?? null
}

export function calcularPromedio(notas: Array<number | null | undefined>): number | null {
  const validas = notas.filter((n): n is number => n !== null && n !== undefined)
  if (validas.length === 0) return null
  const suma = validas.reduce((acc, n) => acc + n, 0)
  return redondearNota(suma / validas.length)
}

export function calcularDefinitivaAsignatura(
  notasPorPeriodo: Array<number | null | undefined>
): number | null {
  if (notasPorPeriodo.length === 0) return null
  if (notasPorPeriodo.some((n) => n === null || n === undefined)) return null
  const suma = (notasPorPeriodo as number[]).reduce((acc, n) => acc + n, 0)
  return redondearNota(suma / notasPorPeriodo.length)
}

export interface ResultadoAprobacion {
  aprobado: boolean
  asignaturasReprobadas: string[]
  asignaturasPendientes: string[]
}

export function evaluarAprobacion(
  definitivasPorAsignatura: Record<string, number | null>,
  umbralAprobacion = 3.0
): ResultadoAprobacion {
  const asignaturasReprobadas: string[] = []
  const asignaturasPendientes: string[] = []

  for (const [asignatura, definitiva] of Object.entries(definitivasPorAsignatura)) {
    if (definitiva === null) {
      asignaturasPendientes.push(asignatura)
    } else if (definitiva < umbralAprobacion) {
      asignaturasReprobadas.push(asignatura)
    }
  }

  return {
    aprobado: asignaturasReprobadas.length === 0 && asignaturasPendientes.length === 0,
    asignaturasReprobadas,
    asignaturasPendientes,
  }
}
