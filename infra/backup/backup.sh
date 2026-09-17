#!/usr/bin/env bash
set -euo pipefail

if [ -n "${PGPASSWORD_FILE:-}" ] && [ -f "${PGPASSWORD_FILE}" ]; then
  export PGPASSWORD
  PGPASSWORD="$(cat "${PGPASSWORD_FILE}")"
fi

FECHA=$(date +%Y%m%d_%H%M%S)
NOMBRE="agora_backup_${FECHA}.sql.gz"
DESTINO="/backups/${NOMBRE}"
CIFRADO="${DESTINO}.age"

echo "[${FECHA}] Iniciando backup de base de datos"

pg_dump \
  --host="${PGHOST}" \
  --port="${PGPORT:-5432}" \
  --dbname="${PGDATABASE}" \
  --username="${PGUSER}" \
  --no-password \
  --format=plain \
  --clean \
  --if-exists \
  | gzip -9 > "${DESTINO}"

echo "[${FECHA}] Dump completado: ${NOMBRE}"

if [ -f "/run/secrets/backup-age-key" ]; then
  CLAVE_PUBLICA=$(cat /run/secrets/backup-age-key)
  age --recipient "${CLAVE_PUBLICA}" --output "${CIFRADO}" "${DESTINO}"
  rm "${DESTINO}"
  echo "[${FECHA}] Cifrado con age: ${CIFRADO}"
else
  echo "[${FECHA}] AVISO: backup sin cifrar (sin clave age)"
fi

find /backups -name "agora_backup_*.sql.gz*" -mtime "+${BACKUP_RETAIN_DAYS:-30}" -delete
echo "[${FECHA}] Rotación completada. Retención: ${BACKUP_RETAIN_DAYS:-30} días"

if [ -d "/var/agora/storage" ]; then
  NOMBRE_STORAGE="agora_storage_${FECHA}.tar.gz"
  tar -czf "/backups/${NOMBRE_STORAGE}" -C /var/agora storage
  echo "[${FECHA}] Storage backup: ${NOMBRE_STORAGE}"
fi
