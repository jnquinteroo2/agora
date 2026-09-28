import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
import { genericOAuth, keycloak } from 'better-auth/plugins/generic-oauth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { hash, verify } from '@node-rs/argon2'
import { contraseñaComprometida } from './hibp'
import { db } from '../datos/cliente'
import * as esquema from '../datos/esquema'
import { env } from '../env'
import {
  esCallbackDeKeycloak,
  leerReclamos,
  perfilDesdeReclamos,
  verificarIngresoKeycloak,
} from './idp/doble-control'

const ARGON2_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const

const RUTAS_QUE_FIJAN_CONTRASENA: Record<string, 'password' | 'newPassword'> = {
  '/change-password': 'newPassword',
  '/reset-password': 'newPassword',
  '/set-password': 'newPassword',
}

const rechazarContrasenasFiltradas = createAuthMiddleware(async (ctx) => {
  const campo = RUTAS_QUE_FIJAN_CONTRASENA[ctx.path]
  if (!campo) return
  const valor: unknown = ctx.body?.[campo]
  if (typeof valor === 'string' && (await contraseñaComprometida(valor))) {
    throw new APIError('BAD_REQUEST', {
      message: 'Esta contraseña aparece en filtraciones de datos conocidas. Elija otra contraseña.',
    })
  }
})

function proveedorKeycloak() {
  const emisor = env.KEYCLOAK_EMISOR!.replace(/\/$/, '')
  const interna = (env.KEYCLOAK_URL_INTERNA ?? emisor).replace(/\/$/, '')
  const base = keycloak({
    clientId: env.KEYCLOAK_CLIENTE_ID!,
    clientSecret: env.KEYCLOAK_CLIENTE_SECRETO!,
    issuer: emisor,
    pkce: true,
    disableImplicitSignUp: true,
    disableSignUp: true,
    postLogoutRedirectURI: '/login',
  })
  return {
    ...base,
    discoveryUrl: `${interna}/.well-known/openid-configuration`,
    authorizationUrl: `${emisor}/protocol/openid-connect/auth`,
    endSessionEndpoint: `${emisor}/protocol/openid-connect/logout`,
    accountIssuer: emisor,
    requireIdTokenVerification: true,
    responseMode: 'query' as const,
    getUserInfo: async (tokens: { idToken?: string }) => {
      const reclamos = tokens.idToken ? leerReclamos(tokens.idToken) : null
      const perfil = reclamos ? perfilDesdeReclamos(reclamos) : null
      if (!perfil) return null
      return {
        id: perfil.id,
        sub: perfil.id,
        email: perfil.email,
        emailVerified: perfil.emailVerified,
        name: perfil.name,
      }
    },
  }
}

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
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    password: {
      hash: (password) => hash(password, ARGON2_CONFIG),
      verify: ({ hash: h, password }) => verify(h, password),
    },
  },
  hooks: {
    before: rechazarContrasenasFiltradas,
  },
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 8,
    cookieCache: {
      enabled: false,
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (sesion, contexto) => {
          if (!esCallbackDeKeycloak(contexto)) return
          const motivo = await verificarIngresoKeycloak(sesion.userId)
          if (motivo) return false
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  plugins: [
    twoFactor({
      issuer: 'Colegio Ágora',
      totpOptions: { digits: 6, period: 30 },
    }),
    ...(env.AUTH_KEYCLOAK_HABILITADO ? [genericOAuth({ config: [proveedorKeycloak()] })] : []),
  ],
  advanced: {
    cookiePrefix: 'agora',
    generateId: () => crypto.randomUUID(),
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
