import { readFileSync } from 'fs'
import { join } from 'path'
import type { Sql } from 'postgres'

const SCRIPT = join(__dirname, '../../infra/postgres-init/02-rol-consulta-rls.sql')

export async function prepararRolConsultaRls(sqlSuperusuario: Sql): Promise<void> {
  await sqlSuperusuario.unsafe(readFileSync(SCRIPT, 'utf8'))
}
