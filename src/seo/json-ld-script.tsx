import { headers } from 'next/headers'
import { serializarJsonLd } from './json-ld'

export async function JsonLd({ datos }: { datos: unknown }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serializarJsonLd(datos) }}
    />
  )
}
