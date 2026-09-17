import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parsearExcelPersonas } from '../../src/acciones/importar/excel'

function crearExcelBuffer(filas: Record<string, string>[]): Buffer {
  const hoja = XLSX.utils.json_to_sheet(filas)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Personas')
  return Buffer.from(XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }))
}

describe('parsearExcelPersonas()', () => {

  it('parsea filas válidas y devuelve el array de personas', () => {
    const buffer = crearExcelBuffer([
      {
        tipo_documento: 'CC',
        numero_documento: '12345678',
        primer_nombre: 'Ana',
        primer_apellido: 'Rodríguez',
        genero: 'F',
        correo: 'ana@colegio.edu.co',
      },
      {
        tipo_documento: 'TI',
        numero_documento: '98765432',
        primer_nombre: 'Carlos',
        segundo_nombre: 'Alberto',
        primer_apellido: 'Gómez',
        segundo_apellido: 'Pérez',
        fecha_nacimiento: '2010-05-15',
        genero: 'M',
      },
    ])

    const personas = parsearExcelPersonas(buffer)

    expect(personas).toHaveLength(2)
    expect(personas[0]!.primerNombre).toBe('Ana')
    expect(personas[0]!.tipoDocumento).toBe('CC')
    expect(personas[1]!.segundoNombre).toBe('Alberto')
    expect(personas[1]!.fechaNacimiento).toBe('2010-05-15')
  })

  it('acepta encabezados en camelCase', () => {
    const buffer = crearExcelBuffer([
      {
        tipoDocumento: 'CE',
        numeroDocumento: '55551111',
        primerNombre: 'María',
        primerApellido: 'López',
      },
    ])

    const personas = parsearExcelPersonas(buffer)
    expect(personas[0]!.tipoDocumento).toBe('CE')
    expect(personas[0]!.primerNombre).toBe('María')
  })

  it('lanza error en fila con tipo_documento inválido', () => {
    const buffer = crearExcelBuffer([
      {
        tipo_documento: 'XX',
        numero_documento: '11111111',
        primer_nombre: 'Pedro',
        primer_apellido: 'Ramírez',
      },
    ])

    expect(() => parsearExcelPersonas(buffer)).toThrow('Fila 2')
  })

  it('lanza error en fila con correo inválido', () => {
    const buffer = crearExcelBuffer([
      {
        tipo_documento: 'CC',
        numero_documento: '22222222',
        primer_nombre: 'Luis',
        primer_apellido: 'Torres',
        correo: 'no-es-correo',
      },
    ])

    expect(() => parsearExcelPersonas(buffer)).toThrow()
  })

  it('omite correo vacío sin lanzar error', () => {
    const buffer = crearExcelBuffer([
      {
        tipo_documento: 'TI',
        numero_documento: '33333333',
        primer_nombre: 'Sofía',
        primer_apellido: 'Castro',
        correo: '',
      },
    ])

    const personas = parsearExcelPersonas(buffer)
    expect(personas[0]!.correo).toBeUndefined()
  })

})
