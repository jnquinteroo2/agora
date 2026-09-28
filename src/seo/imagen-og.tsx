import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { resumir } from './metadatos'

export const TAMANO_OG = { width: 1200, height: 630 }

const FONDO = '#000000'
const TEXTO = '#FFFFFF'
const SECUNDARIO = '#A6A6A6'
const ACENTO = '#B3121C'

async function recursos() {
  const [fuente, logo] = await Promise.all([
    readFile(join(process.cwd(), 'assets', 'fuentes', 'Newsreader-500.woff')),
    readFile(join(process.cwd(), 'public', 'marca', 'logo-agora-blanco.png')),
  ])
  return { fuente, logo: `data:image/png;base64,${logo.toString('base64')}` }
}

function tamanoDelTitulo(titulo: string): number {
  const largo = titulo.length
  if (largo <= 40) return 84
  if (largo <= 70) return 72
  if (largo <= 110) return 60
  if (largo <= 160) return 50
  return 42
}

export async function imagenDelSitio(nombre: string) {
  const { fuente, logo } = await recursos()
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        background: FONDO,
        color: TEXTO,
        fontFamily: 'Newsreader',
      }}
    >
      <img src={logo} width={300} height={300} alt="" />
      <div style={{ display: 'flex', fontSize: 60, letterSpacing: -1 }}>{nombre}</div>
      <div style={{ display: 'flex', width: 72, height: 4, background: ACENTO }} />
    </div>,
    {
      ...TAMANO_OG,
      fonts: [{ name: 'Newsreader', data: fuente, weight: 500, style: 'normal' }],
    }
  )
}

export async function imagenDeEntrada(tituloCompleto: string, seccion: string, nombre: string) {
  const titulo = resumir(tituloCompleto, 220)
  const { fuente, logo } = await recursos()
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: FONDO,
        color: TEXTO,
        fontFamily: 'Newsreader',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <img src={logo} width={72} height={72} alt="" />
        <div style={{ display: 'flex', fontSize: 30, color: SECUNDARIO }}>
          {`${seccion}, ${nombre}`}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: tamanoDelTitulo(titulo),
          lineHeight: 1.08,
          letterSpacing: -0.5,
          maxWidth: 1040,
        }}
      >
        {titulo}
      </div>
    </div>,
    {
      ...TAMANO_OG,
      fonts: [{ name: 'Newsreader', data: fuente, weight: 500, style: 'normal' }],
    }
  )
}
