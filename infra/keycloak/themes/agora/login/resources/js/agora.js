document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-agora-ver-clave]')
  if (!boton) return
  const campo = document.getElementById(boton.getAttribute('aria-controls'))
  if (!campo) return
  const visible = campo.type === 'password'
  campo.type = visible ? 'text' : 'password'
  boton.setAttribute('aria-pressed', String(visible))
  boton.setAttribute('aria-label', visible ? boton.dataset.etiquetaOcultar : boton.dataset.etiquetaMostrar)
})

document.addEventListener('submit', (evento) => {
  const formulario = evento.target
  if (!formulario.hasAttribute('data-agora-envio')) return
  const boton = formulario.querySelector('button[type="submit"]:not([name="cancel-aia"])')
  if (boton) window.setTimeout(() => boton.setAttribute('disabled', 'disabled'), 0)
})

window.addEventListener('DOMContentLoaded', () => {
  const aviso = document.getElementById('agora-error-credenciales') || document.getElementById('agora-aviso')
  if (aviso && aviso.getAttribute('role') === 'alert') aviso.focus()
})
