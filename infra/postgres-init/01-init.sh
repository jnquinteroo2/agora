#!/usr/bin/env bash
set -euo pipefail

leer_password() {
  local var_file="${1}_FILE"
  local var_plain="$1"
  local por_defecto="$2"
  if [ -n "${!var_file:-}" ] && [ -f "${!var_file}" ]; then
    cat "${!var_file}"
  else
    echo "${!var_plain:-$por_defecto}"
  fi
}

PW_MIGRACIONES="$(leer_password DB_MIGRACIONES_PASSWORD dev_migrations_insegura)"
PW_APP="$(leer_password DB_APP_PASSWORD dev_password_insegura)"
PW_BACKUP="$(leer_password DB_BACKUP_PASSWORD dev_backup_insegura)"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agora_migraciones') THEN
      CREATE ROLE agora_migraciones WITH
        LOGIN
        PASSWORD '${PW_MIGRACIONES}'
        NOSUPERUSER CREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
  END \$\$;

  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agora_app') THEN
      CREATE ROLE agora_app WITH
        LOGIN
        PASSWORD '${PW_APP}'
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
  END \$\$;

  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agora_backup') THEN
      CREATE ROLE agora_backup WITH
        LOGIN
        PASSWORD '${PW_BACKUP}'
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
  END \$\$;

  GRANT CONNECT ON DATABASE agora TO agora_migraciones;
  GRANT CONNECT ON DATABASE agora TO agora_app;
  GRANT CONNECT ON DATABASE agora TO agora_backup;

  GRANT CREATE ON DATABASE agora TO agora_migraciones;
  GRANT USAGE, CREATE ON SCHEMA public TO agora_migraciones;
  GRANT USAGE ON SCHEMA public TO agora_app;
  GRANT USAGE ON SCHEMA public TO agora_backup;

  GRANT SELECT ON ALL TABLES IN SCHEMA public TO agora_backup;
  ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA public
    GRANT SELECT ON TABLES TO agora_backup;
EOSQL

echo "[01-init.sh] Roles agora_migraciones, agora_app y agora_backup listos (sin privilegios de superusuario)."
