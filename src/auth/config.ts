import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
import { hash, verify } from '@node-rs/argon2'
import { contraseñaComprometida } from './hibp'
import { db } from '../datos/cliente'
import * as esquema from '../datos/esquema'
import { env } from '../env'

const ARGON2_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: esquema.baUser,
      session: esquema.baSession,
      account: esquema.baAccount,
      verification: esquema.baVerification,
      twoFactor: esquema.baTwoFactor,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    password: {
      hash: async (password) => {
        if (await contraseñaComprometida(password)) {
          throw new Error('Esta contraseña aparece en filtraciones de datos conocidas. Elija otra contraseña.')
        }
        return hash(password, ARGON2_CONFIG)
      },
      verify: ({ hash: h, password }) => verify(h, password),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 8,
    cookieCache: {
      enabled: false,
    },
  },
  plugins: [
    twoFactor({
      issuer: 'Colegio Ágora',
      totpOptions: { digits: 6, period: 30 },
    }),
  ],
  advanced: {
    cookiePrefix: 'agora',
    generateId: () => crypto.randomUUID(),
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
