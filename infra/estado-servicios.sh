#!/usr/bin/env bash
set -uo pipefail

ARCHIVO="${1:-docker-compose.yml}"
CARPETA="$(cd "$(dirname "$0")" && pwd)"
FALLA=0

for servicio in pdf cuentas-idp backup; do
  id=$(docker compose -f "${CARPETA}/${ARCHIVO}" ps -q "$servicio" 2>/dev/null)
  if [ -z "$id" ]; then
    echo "${servicio}: no está corriendo"
    FALLA=1
    continue
  fi
  estado=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sin healthcheck{{end}}' "$id")
  detalle=$(docker inspect --format '{{if .State.Health}}{{range .State.Health.Log}}{{.Output}}{{end}}{{end}}' "$id" 2>/dev/null | grep -v '^[[:space:]]*$' | tail -n 1)
  echo "${servicio}: ${estado}. ${detalle}"
  [ "$estado" = "healthy" ] || FALLA=1
done

exit "$FALLA"
