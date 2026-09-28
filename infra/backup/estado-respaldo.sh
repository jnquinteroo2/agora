#!/usr/bin/env bash
set -uo pipefail

ESTADO="${BACKUP_ESTADO_DIR:-/backups/estado}"
LIMITE_HORAS="${BACKUP_MAX_HORAS:-26}"
AHORA=$(date +%s)
FALLA=0

revisar() {
  local prefijo="$1"
  local archivo="${ESTADO}/${prefijo}.ultimo"
  if [ ! -s "$archivo" ]; then
    echo "${prefijo}: sin ningún volcado correcto registrado"
    FALLA=1
    return
  fi
  local ultimo
  ultimo=$(cat "$archivo")
  local horas=$(( (AHORA - ultimo) / 3600 ))
  local fecha
  fecha=$(date -d "@${ultimo}" '+%Y-%m-%d %H:%M:%S %Z' 2>/dev/null || echo "$ultimo")
  if [ $(( AHORA - ultimo )) -gt $(( LIMITE_HORAS * 3600 )) ]; then
    echo "${prefijo}: VENCIDO, último volcado correcto ${fecha} (hace ${horas} h, límite ${LIMITE_HORAS} h)"
    FALLA=1
  else
    echo "${prefijo}: al día, último volcado correcto ${fecha} (hace ${horas} h)"
  fi
}

revisar agora_backup
if [ -n "${KEYCLOAK_PGHOST:-}" ]; then
  revisar keycloak_backup
fi

exit "$FALLA"
