export async function subirImagen(archivo: File): Promise<{ id: string }> {
  const formData = new FormData()
  formData.set('archivo', archivo)
  formData.set('tipo', 'imagen')

  const respuesta = await fetch('/api/archivos', { method: 'POST', body: formData })
  const cuerpo = await respuesta.json()

  if (!respuesta.ok) {
    throw new Error(cuerpo?.error ?? 'No se pudo subir la imagen')
  }

  return cuerpo as { id: string }
}
