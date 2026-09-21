import { describe, expect, it } from 'vitest'
import { serializarJsonLd } from '../../src/seo/json-ld'

describe('serializarJsonLd', () => {
  it('escapa el cierre de script para que un título no pueda inyectar código', () => {
    const salida = serializarJsonLd({
      '@type': 'Article',
      headline: 'Noticia </script><script>alert(1)</script>',
    })
    expect(salida).not.toContain('<')
    expect(salida).not.toContain('</script>')
    expect(salida).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>')
  })

  it('produce JSON que se lee de vuelta con el texto original', () => {
    const titulo = 'Noticia </script><script>alert(1)</script>'
    expect(JSON.parse(serializarJsonLd({ headline: titulo }))).toEqual({ headline: titulo })
  })
})
