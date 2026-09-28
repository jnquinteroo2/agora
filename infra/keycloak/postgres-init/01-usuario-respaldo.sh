#!/usr/bin/env bash
set -euo pipefail

if [ -n "${KEYCLOAK_BACKUP_DB_PASSWORD_FILE:-}" ] && [ -f "${KEYCLOAK_BACKUP_DB_PASSWORD_FILE}" ]; then
  CLAVE="$(cat "${KEYCLOAK_BACKUP_DB_PASSWORD_FILE}")"
else
  CLAVE="${KEYCLOAK_BACKUP_DB_PASSWORD:-}"
fi

if [ -z "$CLAVE" ]; then
  echo "[01-usuario-respaldo.sh] Falta KEYCLOAK_BACKUP_DB_PASSWORD (o _FILE)" >&2
  exit 1
fi
if ! printf '%s' "$CLAVE" | grep -Eq '^[A-Za-z0-9_+/=-]+$'; then
  echo "[01-usuario-respaldo.sh] La clave de respaldo solo admite letras, dígitos y _ + / = -" >&2
  exit 1
fi

{
  printf "\\set clave '%s'\n" "$CLAVE"
  cat <<'EOSQL'
SELECT format('CREATE ROLE keycloak_backup WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keycloak_backup') \gexec
SELECT format('ALTER ROLE keycloak_backup WITH PASSWORD %L', :'clave') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO keycloak_backup', current_database()) \gexec
ALTER ROLE keycloak_backup WITH INHERIT NOBYPASSRLS;
GRANT pg_read_all_data TO keycloak_backup WITH INHERIT TRUE;
ALTER ROLE keycloak_backup SET default_transaction_read_only = on;
EOSQL
} | psql -v ON_ERROR_STOP=1 --quiet --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}"

echo "[01-usuario-respaldo.sh] Usuario keycloak_backup listo (solo lectura)."
