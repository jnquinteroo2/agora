import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { parse } from '@babel/parser'

const EXCLUIDOS =
  /^(node_modules|\.next|graphify-out|capturas|test-results|playwright-report|coverage|\.claude)\//
const EXTENSIONES_JS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function archivosDelRepositorio() {
  const salida = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], {
    encoding: 'utf8',
  })
  return salida.split('\n').filter((ruta) => ruta && !EXCLUIDOS.test(ruta) && existsSync(ruta))
}

function lineaDe(texto, indice) {
  return texto.slice(0, indice).split('\n').length
}

function comentariosJs(ruta, texto) {
  const plugins = ['jsx', 'importAttributes', 'decorators-legacy']
  if (ruta.endsWith('.ts') || ruta.endsWith('.tsx')) plugins.push('typescript')
  const arbol = parse(texto, {
    sourceType: 'unambiguous',
    plugins,
    errorRecovery: true,
    allowReturnOutsideFunction: true,
  })
  return (arbol.comments ?? [])
    .filter((c) => !(c.type === 'CommentLine' && c.value.startsWith('/ <reference')))
    .map((c) => ({ linea: c.loc.start.line, texto: texto.slice(c.start, c.end) }))
}

function comentariosCss(texto) {
  const hallados = []
  let comilla = null
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comilla) {
      if (c === '\\') i++
      else if (c === comilla) comilla = null
      continue
    }
    if (c === '"' || c === "'") comilla = c
    else if (c === '/' && texto[i + 1] === '*') {
      const fin = texto.indexOf('*/', i + 2)
      const cierre = fin === -1 ? texto.length : fin + 2
      hallados.push({ linea: lineaDe(texto, i), texto: texto.slice(i, cierre) })
      i = cierre - 1
    }
  }
  return hallados
}

function comentariosSql(texto) {
  const hallados = []
  let modo = null
  let dolar = ''
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (modo === "'") {
      if (c === "'" && texto[i + 1] === "'") i++
      else if (c === "'") modo = null
      continue
    }
    if (modo === '"') {
      if (c === '"') modo = null
      continue
    }
    if (modo === '$') {
      if (texto.startsWith(dolar, i)) {
        i += dolar.length - 1
        modo = null
      }
      continue
    }
    if (c === "'" || c === '"') {
      modo = c
      continue
    }
    if (c === '$') {
      const etiqueta = texto.slice(i).match(/^\$[A-Za-z_]*\$/)
      if (etiqueta) {
        dolar = etiqueta[0]
        modo = '$'
        i += dolar.length - 1
        continue
      }
    }
    if (c === '-' && texto[i + 1] === '-') {
      let fin = texto.indexOf('\n', i)
      if (fin === -1) fin = texto.length
      const linea = texto.slice(i, fin)
      if (!linea.startsWith('--> statement-breakpoint'))
        hallados.push({ linea: lineaDe(texto, i), texto: linea })
      i = fin
      continue
    }
    if (c === '/' && texto[i + 1] === '*') {
      const fin = texto.indexOf('*/', i + 2)
      const cierre = fin === -1 ? texto.length : fin + 2
      hallados.push({ linea: lineaDe(texto, i), texto: texto.slice(i, cierre) })
      i = cierre - 1
    }
  }
  return hallados
}

function almohadillaFueraDeComillas(linea) {
  let comilla = null
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (comilla) {
      if (c === '\\' && comilla === '"') i++
      else if (c === comilla) comilla = null
      continue
    }
    if (c === '"' || c === "'") comilla = c
    else if (c === '#' && (i === 0 || /\s/.test(linea[i - 1]))) return i
  }
  return -1
}

function comentariosYaml(texto) {
  const hallados = []
  let sangriaBloque = -1
  texto.split('\n').forEach((linea, indice) => {
    const sangria = linea.search(/\S/)
    if (sangriaBloque >= 0) {
      if (sangria === -1 || sangria > sangriaBloque) return
      sangriaBloque = -1
    }
    const posicion = almohadillaFueraDeComillas(linea)
    if (posicion >= 0) hallados.push({ linea: indice + 1, texto: linea.slice(posicion) })
    if (/:\s*[|>][-+0-9]*\s*$/.test(linea)) sangriaBloque = sangria
  })
  return hallados
}

function comentariosShell(texto) {
  const hallados = []
  let finDeDocumento = null
  texto.split('\n').forEach((linea, indice) => {
    if (finDeDocumento) {
      if (linea.trim() === finDeDocumento) finDeDocumento = null
      return
    }
    if (indice === 0 && linea.startsWith('#!')) return
    const documento = linea.match(/<<-?\s*['"]?([A-Za-z_]+)['"]?/)
    const sinVariables = linea.replace(/\$\{#|\$#/g, '__')
    const posicion = almohadillaFueraDeComillas(sinVariables)
    if (posicion >= 0) hallados.push({ linea: indice + 1, texto: linea.slice(posicion) })
    if (documento) finDeDocumento = documento[1]
  })
  return hallados
}

function comentariosDockerfile(texto) {
  return texto
    .split('\n')
    .map((linea, indice) => ({ linea: indice + 1, texto: linea.trim() }))
    .filter(({ texto: linea }) => linea.startsWith('#'))
}

function comentariosIgnorados(texto) {
  return texto
    .split('\n')
    .map((linea, indice) => ({ linea: indice + 1, texto: linea.trim() }))
    .filter(({ texto: linea }) => linea.startsWith('#'))
}

function comentariosMarcado(texto) {
  const hallados = []
  for (const coincidencia of texto.matchAll(/<!--[\s\S]*?-->|<#--[\s\S]*?-->/g)) {
    hallados.push({ linea: lineaDe(texto, coincidencia.index), texto: coincidencia[0] })
  }
  return hallados
}

function comentariosDe(ruta) {
  const nombre = basename(ruta)
  const extension = extname(ruta)
  if (nombre === 'next-env.d.ts') return []
  const texto = readFileSync(ruta, 'utf8')
  if (EXTENSIONES_JS.has(extension)) return comentariosJs(ruta, texto)
  if (extension === '.css') return comentariosCss(texto)
  if (extension === '.sql') return comentariosSql(texto)
  if (extension === '.yml' || extension === '.yaml') return comentariosYaml(texto)
  if (extension === '.sh') return comentariosShell(texto)
  if (nombre === 'Dockerfile' || nombre.endsWith('.Dockerfile')) return comentariosDockerfile(texto)
  if (nombre === '.gitignore' || nombre === '.dockerignore') return comentariosIgnorados(texto)
  if (['.html', '.ftl', '.xhtml'].includes(extension)) return comentariosMarcado(texto)
  return []
}

const hallazgos = []
for (const ruta of archivosDelRepositorio()) {
  let comentarios
  try {
    comentarios = comentariosDe(ruta)
  } catch (error) {
    hallazgos.push(`${ruta}: no se pudo analizar (${error.message})`)
    continue
  }
  for (const { linea, texto } of comentarios) {
    hallazgos.push(`${ruta}:${linea}: ${texto.split('\n')[0].slice(0, 120)}`)
  }
}

if (hallazgos.length > 0) {
  console.error(
    `Se encontraron ${hallazgos.length} comentarios. El proyecto no admite comentarios en el código:`
  )
  for (const hallazgo of hallazgos) console.error(`  ${hallazgo}`)
  process.exit(1)
}

console.log('Sin comentarios en el código.')
