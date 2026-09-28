FROM quay.io/keycloak/keycloak:26.7.4@sha256:82a77884f3af238beab1e7afd63b5f530e1b5c0590bd7aa60b40a40463e29b2c AS constructor
ENV KC_DB=postgres \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=false
COPY --chown=keycloak:keycloak themes/agora /opt/keycloak/themes/agora
RUN /opt/keycloak/bin/kc.sh build --db=postgres --health-enabled=true

FROM quay.io/keycloak/keycloak:26.7.4@sha256:82a77884f3af238beab1e7afd63b5f530e1b5c0590bd7aa60b40a40463e29b2c
COPY --from=constructor /opt/keycloak/ /opt/keycloak/
COPY --chown=keycloak:keycloak realm/agora-realm.json /opt/keycloak/data/import/agora-realm.json
COPY --chown=keycloak:keycloak realm/perfil-usuario.json /opt/keycloak/conf/agora/perfil-usuario.json
COPY --chown=keycloak:keycloak --chmod=0755 actualizar-realm.sh /opt/keycloak/bin/actualizar-realm-agora.sh
USER keycloak
EXPOSE 8080 9000
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=6 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/9000 && printf 'GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' >&3 && grep -q '\"status\": \"UP\"' <&3"]
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm"]
