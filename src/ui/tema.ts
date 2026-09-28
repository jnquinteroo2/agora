export type Tema = 'claro' | 'oscuro'

export const CLAVE_TEMA = 'agora-tema'

export const SCRIPT_TEMA = `(function(){try{var g=localStorage.getItem('${CLAVE_TEMA}');var o=g==='oscuro'||(g!=='claro'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',o);e.style.colorScheme=o?'dark':'light'}catch(_){}})();`

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement
  raiz.classList.toggle('dark', tema === 'oscuro')
  raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light'
}

export function temaActual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro'
}

export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {}
}

export function temaGuardado(): Tema | null {
  try {
    const valor = localStorage.getItem(CLAVE_TEMA)
    return valor === 'claro' || valor === 'oscuro' ? valor : null
  } catch {
    return null
  }
}

export function temaDelSistema(): Tema {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

export function seguirAlSistema(): () => void {
  const consulta = window.matchMedia('(prefers-color-scheme: dark)')
  const alCambiarSistema = () => {
    if (temaGuardado() === null) aplicarTema(consulta.matches ? 'oscuro' : 'claro')
  }
  const alCambiarOtraPestana = (evento: StorageEvent) => {
    if (evento.key !== CLAVE_TEMA) return
    aplicarTema(temaGuardado() ?? temaDelSistema())
  }
  consulta.addEventListener('change', alCambiarSistema)
  window.addEventListener('storage', alCambiarOtraPestana)
  return () => {
    consulta.removeEventListener('change', alCambiarSistema)
    window.removeEventListener('storage', alCambiarOtraPestana)
  }
}
