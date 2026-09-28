import { expect, type Browser, type BrowserContext } from '@playwright/test'
import { urlBase } from './stack-local'

export const RUTAS_PUBLICAS = [
  '/inicio',
  '/institucion',
  '/modelo-clei',
  '/oferta',
  '/admisiones',
  '/contacto',
  '/blog',
  '/blog/bienvenida',
  '/galeria',
  '/galeria/album-de-prueba',
  '/aliados',
  '/privacidad',
  '/cookies',
  '/terminos',
  '/accesibilidad',
  '/login',
  '/esta-pagina-no-existe',
]

export const PANTALLAS_POR_PERFIL: Record<string, string[]> = {
  superadmin: [
    '/panel/admin',
    '/panel/admin/cuentas',
    '/panel/admin/estudiantes',
    '/panel/admin/profesores',
    '/panel/admin/materias',
    '/panel/admin/boletines',
    '/panel/admin/finanzas',
    '/panel/admin/configuracion',
    '/panel/admin/contenido',
  ],
  admin: ['/panel/administrador', '/panel/administrador/cuentas'],
  secretaria: ['/panel/secretaria'],
  contador: ['/panel/contador'],
  docente: ['/panel/docente'],
  estudiante: ['/panel/estudiante', '/panel/estudiante/calificaciones'],
  acudiente: ['/panel/acudiente'],
}

export const TEMAS = ['claro', 'oscuro'] as const
export const DISPOSITIVOS = [
  ['escritorio', { width: 1440, height: 900 }],
  ['movil', { width: 390, height: 844 }],
] as const


export const contrasenaDePrueba = process.env.SEMILLA_PERFILES_CONTRASENA ?? ''
export const dominioDePrueba = process.env.SEMILLA_PERFILES_DOMINIO ?? ''
let ip = Math.floor(Math.random() * 120)

export async function contextoConTema(
  browser: Browser,
  tema: (typeof TEMAS)[number],
  viewport: { width: number; height: number },
  baseURL = urlBase
): Promise<BrowserContext> {
  ip = (ip + 1) % 250
  const contexto = await browser.newContext({
    baseURL,
    viewport,
    colorScheme: tema === 'oscuro' ? 'dark' : 'light',
    reducedMotion: 'reduce',
    extraHTTPHeaders: { 'x-forwarded-for': `198.18.0.${ip + 1}` },
  })
  await contexto.addInitScript((valor) => {
    try {
      localStorage.setItem('agora-tema', valor)
    } catch {}
  }, tema)
  return contexto
}

export async function ingresarLocal(contexto: BrowserContext, clave: string) {
  const respuesta = await contexto.request.post(`${urlBase}/api/auth/sign-in/email`, {
    data: { email: `prueba.${clave}@${dominioDePrueba}`, password: contrasenaDePrueba },
    headers: { Origin: urlBase },
  })
  expect(respuesta.status(), `ingreso de prueba.${clave}`).toBe(200)
}
