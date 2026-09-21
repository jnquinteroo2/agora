import type { MetadataRoute } from 'next'
import { sitioIndexable, urlAbsoluta } from '@/src/sitio'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (!sitioIndexable()) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/panel', '/login', '/api'] },
    sitemap: urlAbsoluta('/sitemap.xml'),
  }
}
