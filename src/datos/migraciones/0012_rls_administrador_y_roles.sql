DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agora_rls_consulta') THEN
    RAISE EXCEPTION 'Falta el rol agora_rls_consulta. Ejecute infra/postgres-init/02-rol-consulta-rls.sql como superusuario de la base y vuelva a migrar.';
  END IF;
  IF NOT pg_has_role(current_user, 'agora_rls_consulta', 'MEMBER') THEN
    RAISE EXCEPTION 'El rol % no es miembro de agora_rls_consulta. Ejecute infra/postgres-init/02-rol-consulta-rls.sql como superusuario de la base.', current_user;
  END IF;
END $$;
--> statement-breakpoint
GRANT SELECT (id, persona_id, rol) ON usuario TO agora_rls_consulta;
--> statement-breakpoint
CREATE POLICY usuario_consulta_rls ON usuario
  FOR SELECT TO agora_rls_consulta
  USING (true);
--> statement-breakpoint
DO $$
DECLARE
  fuera text;
BEGIN
  SET LOCAL ROLE agora_rls_consulta;
  SELECT string_agg(DISTINCT rol, ', ' ORDER BY rol) INTO fuera
    FROM usuario
    WHERE rol NOT IN ('superadmin', 'admin', 'secretaria', 'contador', 'docente', 'estudiante', 'acudiente');
  RESET ROLE;
  IF fuera IS NOT NULL THEN
    RAISE EXCEPTION 'usuario.rol tiene valores fuera de los siete perfiles: %. Corríjalos a mano antes de migrar; esta migración no cambia datos.', fuera;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_valido
  CHECK (rol IN ('superadmin', 'admin', 'secretaria', 'contador', 'docente', 'estudiante', 'acudiente'));
--> statement-breakpoint
CREATE FUNCTION rol_de_persona(p_persona uuid) RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT u.rol
    FROM public.usuario u
    WHERE u.persona_id = p_persona
    ORDER BY (u.rol IN ('superadmin', 'admin')) DESC
    LIMIT 1
$$;
--> statement-breakpoint
ALTER FUNCTION rol_de_persona(uuid) OWNER TO agora_rls_consulta;
--> statement-breakpoint
REVOKE ALL ON FUNCTION rol_de_persona(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION rol_de_persona(uuid) TO agora_app;
--> statement-breakpoint
CREATE POLICY usuario_admin_select ON usuario
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'admin'
    AND rol IN ('docente', 'estudiante', 'acudiente', 'secretaria', 'contador')
  );
--> statement-breakpoint
CREATE POLICY usuario_admin_insert ON usuario
  FOR INSERT TO agora_app
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    AND rol IN ('docente', 'estudiante', 'acudiente', 'secretaria', 'contador')
  );
--> statement-breakpoint
CREATE POLICY usuario_admin_update ON usuario
  FOR UPDATE TO agora_app
  USING (
    current_setting('app.role', true) = 'admin'
    AND rol IN ('docente', 'estudiante', 'acudiente', 'secretaria', 'contador')
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    AND rol IN ('docente', 'estudiante', 'acudiente', 'secretaria', 'contador')
  );
--> statement-breakpoint
CREATE POLICY persona_admin_select ON persona
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'admin'
    AND coalesce(rol_de_persona(id), '') NOT IN ('superadmin', 'admin')
  );
--> statement-breakpoint
CREATE POLICY persona_admin_propia ON persona
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'admin'
    AND EXISTS (
      SELECT 1 FROM usuario u
      WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND u.persona_id = persona.id
    )
  );
--> statement-breakpoint
CREATE POLICY persona_admin_insert ON persona
  FOR INSERT TO agora_app
  WITH CHECK (current_setting('app.role', true) = 'admin');
--> statement-breakpoint
CREATE POLICY persona_admin_update ON persona
  FOR UPDATE TO agora_app
  USING (
    current_setting('app.role', true) = 'admin'
    AND coalesce(rol_de_persona(id), '') NOT IN ('superadmin', 'admin')
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    AND coalesce(rol_de_persona(id), '') NOT IN ('superadmin', 'admin')
  );
