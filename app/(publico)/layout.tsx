import type { Metadata } from 'next'
import { obtenerConfiguracion, nombreCorto, nombreLegal } from '@/src/datos/configuracion-publica'
import { MarcoPublico } from '@/src/ui/marco-publico'
import { JsonLd } from '@/src/seo/json-ld-script'
import { urlAbsoluta } from '@/src/sitio'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/marca/icono-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/marca/icono-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  const config = await obtenerConfiguracion()
  const corto = nombreCorto(config)
  const legal = nombreLegal(config)

  const direccionPostal = {
    '@type': 'PostalAddress',
    addressCountry: 'CO',
    ...(config?.direccion ? { streetAddress: config.direccion } : {}),
    ...(config?.municipio ? { addressLocality: config.municipio } : {}),
    ...(config?.departamento ? { addressRegion: config.departamento } : {}),
  }
  const organizacion = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: legal,
    ...(corto !== legal ? { alternateName: corto } : {}),
    url: urlAbsoluta('/inicio'),
    logo: urlAbsoluta('/marca/logo-agora.png'),
    ...(config?.lema ? { slogan: config.lema } : {}),
    ...(config?.telefono ? { telephone: config.telefono } : {}),
    ...(config?.correo ? { email: config.correo } : {}),
    ...(config?.municipio || config?.departamento || config?.direccion
      ? { address: direccionPostal }
      : {}),
  }

  return (
    <>
      <JsonLd datos={organizacion} />
      <MarcoPublico>{children}</MarcoPublico>
    </>
  )
}
