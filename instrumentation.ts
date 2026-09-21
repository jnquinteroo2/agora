export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { verificarArranque } = await import('./src/arranque')
  verificarArranque()
}
