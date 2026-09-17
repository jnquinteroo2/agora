import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/plugins/two-factor'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [twoFactorClient()],
})
