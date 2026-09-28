import { env } from '@/src/env'
import type { ContextoRLS } from '@/src/datos/cliente'
import { tarjeta, tituloTarjeta, encabezadoTabla } from '@/src/ui/estilos'
import { PERFILES, perfilPorClave } from '@/src/ui/perfiles'
import { rolesAsignablesPor } from '@/src/auth/roles'
import { cargarCuentas } from './datos'
import { FormularioCrearCuenta, FilaCuenta, type OpcionRol } from './formularios'

export async function PantallaCuentas({ contexto }: { contexto: ContextoRLS }) {
  const asignables = rolesAsignablesPor(contexto.rol)
  const roles: OpcionRol[] = PERFILES.filter((p) => asignables.includes(p.clave)).map((p) => ({
    clave: p.clave,
    nombre: p.nombre,
  }))
  const cuentas = await cargarCuentas(contexto)
  const conKeycloak = env.AUTH_KEYCLOAK_HABILITADO
  const pendientes = cuentas.filter((c) => c.pendienteSincronizar).length

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-titulo text-titulo font-medium">Cuentas</h1>
        <p className="max-w-prose text-nota text-texto-secundario">
          Solo la administración crea cuentas. El perfil que asigne define qué ve cada persona en la
          plataforma.
          {contexto.rol === 'admin'
            ? ' Como Administrador puede crear y gestionar cuentas de Profesor, Estudiante, Acudiente, Secretaría y Contador.'
            : null}
          {conKeycloak
            ? ' El ingreso se hace por Keycloak: al desactivar una cuenta se cierran sus sesiones en los dos lados.'
            : null}
        </p>
        {pendientes > 0 ? (
          <p className="text-nota text-alerta">
            {pendientes === 1
              ? 'Hay 1 cuenta pendiente de sincronizar con Keycloak.'
              : `Hay ${pendientes} cuentas pendientes de sincronizar con Keycloak.`}{' '}
            Se reintenta cada 10 minutos.
          </p>
        ) : null}
      </div>

      <section className={tarjeta} aria-labelledby="titulo-crear-cuenta">
        <h2 id="titulo-crear-cuenta" className={tituloTarjeta}>
          Crear cuenta
        </h2>
        <FormularioCrearCuenta roles={roles} conKeycloak={conKeycloak} />
      </section>

      <section className={tarjeta} aria-labelledby="titulo-lista-cuentas">
        <h2 id="titulo-lista-cuentas" className={tituloTarjeta}>
          Cuentas registradas ({cuentas.length})
        </h2>
        <div
          role="region"
          aria-label="Tabla de cuentas con desplazamiento horizontal"
          tabIndex={0}
          className="-mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <table className="w-full border-collapse text-nota">
            <thead>
              <tr className={encabezadoTabla}>
                <th className="py-2">Nombre</th>
                <th className="py-2">Acceso</th>
                <th className="py-2">Perfil</th>
                <th className="py-2">Estado</th>
                <th className="py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((cuenta) => (
                <FilaCuenta
                  key={cuenta.id}
                  cuenta={cuenta}
                  nombreRol={perfilPorClave(cuenta.rol)?.nombre ?? cuenta.rol}
                  conKeycloak={conKeycloak}
                  esPropia={cuenta.id === contexto.usuarioId}
                  roles={roles}
                />
              ))}
              {cuentas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-texto-secundario">
                    Todavía no hay cuentas registradas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
