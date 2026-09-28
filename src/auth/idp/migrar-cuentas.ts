import { randomUUID } from 'crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria, type ContextoRLS } from '../../datos/cliente'
import { usuario, persona, baAccount } from '../../datos/esquema'
import { logger } from '../../logger'
import {
  crearUsuarioIdp,
  buscarUsuarioIdpPorUsuarioAgora,
  enviarInvitacionIdp,
  ErrorIdpConflicto,
} from './keycloak-admin'
import {
  PROVEEDOR_KEYCLOAK,
  accionesRequeridasPara,
  emisorKeycloak,
  mensajeDeError,
  nombreDeUsuarioVisible,
} from './cuentas'

const CONTEXTO: ContextoRLS = { usuarioId: '', rol: 'superadmin' }

interface Resumen {
  revisadas: number
  enlazadas: number
  reutilizadas: number
  invitadas: number
  conflictos: string[]
  errores: string[]
}

async function migrar(opciones: { simulacro: boolean; invitar: boolean }): Promise<Resumen> {
  const resumen: Resumen = {
    revisadas: 0,
    enlazadas: 0,
    reutilizadas: 0,
    invitadas: 0,
    conflictos: [],
    errores: [],
  }

  const pendientes = await conContextoRLS(db, CONTEXTO, (tx) =>
    tx
      .select({ usuario, persona })
      .from(usuario)
      .innerJoin(persona, eq(persona.id, usuario.personaId))
      .leftJoin(
        baAccount,
        and(eq(baAccount.userId, sql`${usuario.id}::text`), eq(baAccount.providerId, PROVEEDOR_KEYCLOAK))
      )
      .where(and(eq(usuario.activo, true), isNull(baAccount.id)))
  )

  for (const { usuario: u, persona: p } of pendientes) {
    resumen.revisadas++
    const etiqueta = nombreDeUsuarioVisible(u.correo, u.sinCorreo)
    if (opciones.simulacro) {
      logger.info({ usuario: etiqueta, rol: u.rol }, 'Se enlazaría con Keycloak')
      continue
    }
    try {
      let sub = await buscarUsuarioIdpPorUsuarioAgora(u.id)
      if (sub) {
        resumen.reutilizadas++
      } else {
        sub = await crearUsuarioIdp({
          usuarioId: u.id,
          nombreUsuario: u.sinCorreo ? etiqueta : u.correo,
          correo: u.sinCorreo ? null : u.correo,
          nombres: [p.primerNombre, p.segundoNombre].filter(Boolean).join(' '),
          apellidos: [p.primerApellido, p.segundoApellido].filter(Boolean).join(' '),
          accionesRequeridas: accionesRequeridasPara(u.rol),
        })
      }
      const ahora = new Date()
      await conContextoRLS(db, CONTEXTO, async (tx) => {
        await tx.insert(baAccount).values({
          id: randomUUID(),
          accountId: sub,
          providerId: PROVEEDOR_KEYCLOAK,
          issuer: emisorKeycloak(),
          userId: u.id,
          createdAt: ahora,
          updatedAt: ahora,
        })
        await registrarAuditoria(tx, {
          actorRol: 'sistema',
          accion: 'migracion_idp',
          entidad: 'usuario',
          entidadId: u.id,
          diferencia: { sub },
        })
      })
      resumen.enlazadas++
      if (opciones.invitar && !u.sinCorreo) {
        await enviarInvitacionIdp(sub, accionesRequeridasPara(u.rol))
        resumen.invitadas++
      }
    } catch (error) {
      if (error instanceof ErrorIdpConflicto) {
        resumen.conflictos.push(etiqueta)
        logger.warn(
          { usuario: etiqueta },
          'Keycloak ya tiene una cuenta con ese correo sin el identificador de la plataforma: revísela a mano'
        )
      } else {
        resumen.errores.push(`${etiqueta}: ${mensajeDeError(error)}`)
        logger.error({ usuario: etiqueta, error: mensajeDeError(error) }, 'No se pudo migrar')
      }
    }
  }
  return resumen
}

const argumentos = new Set(process.argv.slice(2))

migrar({
  simulacro: argumentos.has('--simulacro'),
  invitar: !argumentos.has('--sin-invitacion'),
})
  .then((resumen) => {
    logger.info(resumen, 'Migración de cuentas a Keycloak terminada')
    process.exit(resumen.errores.length > 0 || resumen.conflictos.length > 0 ? 1 : 0)
  })
  .catch((error) => {
    logger.error({ error: mensajeDeError(error) }, 'La migración de cuentas falló')
    process.exit(1)
  })
