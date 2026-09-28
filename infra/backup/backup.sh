#!/usr/bin/env bash
set -euo pipefail

FECHA=$(date +%Y%m%d_%H%M%S)
RETENCION="${BACKUP_RETAIN_DAYS:-30}"
CLAVE_AGE="${BACKUP_AGE_KEY_FILE:-/run/secrets/backup-age-key}"
FALLOS=0
ESTADO=/backups/estado
mkdir -p "$ESTADO"

leer_clave() {
  local archivo="$1"
  local valor="$2"
  if [ -n "$archivo" ] && [ -f "$archivo" ]; then
    cat "$archivo"
  else
    printf '%s' "$valor"
  fi
}

respaldar() {
  local prefijo="$1" host="$2" puerto="$3" base="$4" usuario="$5" clave="$6"
  local destino="/backups/${prefijo}_${FECHA}.sql.gz"
  local parcial="${destino}.parcial"

  echo "[${FECHA}] Respaldo de ${base} en ${host}"
  if ! PGPASSWORD="$clave" pg_dump \
      --host="$host" \
      --port="$puerto" \
      --dbname="$base" \
      --username="$usuario" \
      --no-password \
      --format=plain \
      --clean \
      --if-exists \
      | gzip -9 > "$parcial"; then
    rm -f "$parcial"
    echo "[${FECHA}] ERROR: falló el respaldo de ${base}; no se dejó ningún archivo" >&2
    FALLOS=$((FALLOS + 1))
    return 0
  fi
  mv "$parcial" "$destino"

  if [ -f "$CLAVE_AGE" ]; then
    age --recipient "$(cat "$CLAVE_AGE")" --output "${destino}.age" "$destino"
    rm "$destino"
    echo "[${FECHA}] Cifrado con age: ${destino}.age"
  else
    echo "[${FECHA}] AVISO: respaldo de ${base} sin cifrar (sin clave age)"
  fi

  date +%s > "${ESTADO}/${prefijo}.ultimo"
  find /backups -name "${prefijo}_*.sql.gz*" -mtime "+${RETENCION}" -delete
}

respaldar agora_backup \
  "${PGHOST}" "${PGPORT:-5432}" "${PGDATABASE}" "${PGUSER}" \
  "$(leer_clave "${PGPASSWORD_FILE:-}" "${PGPASSWORD:-${DB_BACKUP_PASSWORD:-}}")"

if [ -n "${KEYCLOAK_PGHOST:-}" ]; then
  respaldar keycloak_backup \
    "${KEYCLOAK_PGHOST}" "${KEYCLOAK_PGPORT:-5432}" "${KEYCLOAK_PGDATABASE:-keycloak}" "${KEYCLOAK_PGUSER:-keycloak_backup}" \
    "$(leer_clave "${KEYCLOAK_PGPASSWORD_FILE:-}" "${KEYCLOAK_PGPASSWORD:-${KEYCLOAK_BACKUP_DB_PASSWORD:-}}")"
fi

echo "[${FECHA}] Rotación completada. Retención: ${RETENCION} días"

if [ -d "/var/agora/storage" ]; then
  NOMBRE_STORAGE="agora_storage_${FECHA}.tar.gz"
  tar -czf "/backups/${NOMBRE_STORAGE}" -C /var/agora storage
  echo "[${FECHA}] Storage backup: ${NOMBRE_STORAGE}"
fi

if [ "$FALLOS" -gt 0 ]; then
  echo "[${FECHA}] ${FALLOS} respaldo(s) fallaron" >&2
  exit 1
fi
