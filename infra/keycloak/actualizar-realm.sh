#!/usr/bin/env bash
set -euo pipefail

KCADM=/opt/keycloak/bin/kcadm.sh
CONFIG=/tmp/kcadm-agora.config
REALM=agora
PERFIL=${PERFIL_USUARIO:-/opt/keycloak/conf/agora/perfil-usuario.json}
USUARIO=${KCADM_USUARIO:-${KC_BOOTSTRAP_ADMIN_USERNAME:-}}
export KC_CLI_PASSWORD=${KCADM_CLAVE:-${KC_BOOTSTRAP_ADMIN_PASSWORD:-}}

if [ -z "$USUARIO" ] || [ -z "$KC_CLI_PASSWORD" ]; then
  echo "Faltan KCADM_USUARIO y KCADM_CLAVE (o las variables de arranque del administrador)" >&2
  exit 1
fi
if [ -z "${PLATAFORMA_URL:-}" ]; then
  echo "Falta PLATAFORMA_URL" >&2
  exit 1
fi
if [ -z "${KEYCLOAK_ADMIN_CLIENTE_SECRETO:-}" ]; then
  echo "Falta KEYCLOAK_ADMIN_CLIENTE_SECRETO" >&2
  exit 1
fi

kc() {
  "$KCADM" "$@" --config "$CONFIG"
}

trap 'rm -f "$CONFIG"' EXIT

kc config credentials --server http://localhost:8080 --realm master --user "$USUARIO" >/dev/null

kc update "realms/$REALM" \
  -s registrationEmailAsUsername=false \
  -s editUsernameAllowed=true \
  -s emailTheme=agora \
  -s actionTokenGeneratedByAdminLifespan=259200 \
  -s "browserSecurityHeaders.contentSecurityPolicy=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' ${PLATAFORMA_URL}" \
  -s browserSecurityHeaders.xFrameOptions=DENY
echo "Realm: nombre de usuario editable solo por administradores, tema de correo, vigencia de invitaciones y encabezados de seguridad"

kc update "realms/$REALM/users/profile" -f "$PERFIL" >/dev/null
echo "Perfil de usuario: agora_usuario_id visible y editable solo por administradores"

ID_ADMIN=$(kc get clients -r "$REALM" -q clientId=plataforma-admin --fields id --format csv --noquotes)
if [ -z "$ID_ADMIN" ]; then
  kc create clients -r "$REALM" -f - >/dev/null 2>&1 <<JSON
{
  "clientId": "plataforma-admin",
  "name": "Plataforma Ágora: administración de cuentas",
  "enabled": true,
  "protocol": "openid-connect",
  "publicClient": false,
  "clientAuthenticatorType": "client-secret",
  "secret": "${KEYCLOAK_ADMIN_CLIENTE_SECRETO}",
  "standardFlowEnabled": false,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": true,
  "authorizationServicesEnabled": false,
  "frontchannelLogout": false,
  "consentRequired": false,
  "fullScopeAllowed": true,
  "redirectUris": [],
  "webOrigins": [],
  "attributes": {
    "access.token.lifespan": "120",
    "oauth2.device.authorization.grant.enabled": "false",
    "oidc.ciba.grant.enabled": "false",
    "client_credentials.use_refresh_token": "false",
    "use.refresh.tokens": "false"
  }
}
JSON
  echo "Cliente plataforma-admin creado"
else
  printf '{"secret":"%s"}' "$KEYCLOAK_ADMIN_CLIENTE_SECRETO" | kc update "clients/$ID_ADMIN" -r "$REALM" -f - >/dev/null
  echo "Cliente plataforma-admin: secreto actualizado"
fi

kc add-roles -r "$REALM" --uusername service-account-plataforma-admin \
  --cclientid realm-management --rolename manage-users --rolename view-users
echo "Cuenta de servicio: manage-users y view-users en el realm $REALM"

ID_WEB=$(kc get clients -r "$REALM" -q clientId=plataforma-agora --fields id --format csv --noquotes)
if [ -z "$ID_WEB" ]; then
  echo "No existe el cliente plataforma-agora en el realm $REALM" >&2
  exit 1
fi
MAPPER=$(kc get "clients/$ID_WEB/protocol-mappers/models" -r "$REALM" --fields name --format csv --noquotes | grep -x agora_usuario_id || true)
if [ -z "$MAPPER" ]; then
  kc create "clients/$ID_WEB/protocol-mappers/models" -r "$REALM" -f - >/dev/null 2>&1 <<'JSON'
{
  "name": "agora_usuario_id",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "consentRequired": false,
  "config": {
    "user.attribute": "agora_usuario_id",
    "claim.name": "agora_usuario_id",
    "jsonType.label": "String",
    "id.token.claim": "true",
    "access.token.claim": "false",
    "userinfo.token.claim": "false",
    "introspection.token.claim": "false",
    "lightweight.claim": "false",
    "multivalued": "false",
    "aggregate.attrs": "false"
  }
}
JSON
  echo "Mapper agora_usuario_id creado en plataforma-agora"
else
  echo "Mapper agora_usuario_id ya existía"
fi

for CONSOLA in account-console account; do
  ID_CONSOLA=$(kc get clients -r "$REALM" -q clientId="$CONSOLA" --fields id --format csv --noquotes)
  if [ -n "$ID_CONSOLA" ]; then
    kc update "clients/$ID_CONSOLA" -r "$REALM" -s enabled=false
  fi
done
echo "Consola de cuenta deshabilitada: la administración gestiona las cuentas desde el panel"

echo "Realm $REALM actualizado"
