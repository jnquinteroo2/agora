
REVOKE UPDATE, DELETE ON auditoria FROM agora_app;

ALTER TABLE persona                ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario                ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiante_familiar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aspirante              ENABLE ROW LEVEL SECURITY;
ALTER TABLE matricula              ENABLE ROW LEVEL SECURITY;
ALTER TABLE historia_academica     ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_docente     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificacion           ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificacion_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE observador_registro    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_cobro             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibo_caja            ENABLE ROW LEVEL SECURITY;
ALTER TABLE egreso                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina_bloque          ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_menor_movimiento  ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivo                ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_generado     ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria              ENABLE ROW LEVEL SECURITY;

ALTER TABLE persona                FORCE ROW LEVEL SECURITY;
ALTER TABLE usuario                FORCE ROW LEVEL SECURITY;
ALTER TABLE estudiante_familiar    FORCE ROW LEVEL SECURITY;
ALTER TABLE aspirante              FORCE ROW LEVEL SECURITY;
ALTER TABLE matricula              FORCE ROW LEVEL SECURITY;
ALTER TABLE historia_academica     FORCE ROW LEVEL SECURITY;
ALTER TABLE asignacion_docente     FORCE ROW LEVEL SECURITY;
ALTER TABLE calificacion           FORCE ROW LEVEL SECURITY;
ALTER TABLE calificacion_historial FORCE ROW LEVEL SECURITY;
ALTER TABLE observador_registro    FORCE ROW LEVEL SECURITY;
ALTER TABLE plan_cobro             FORCE ROW LEVEL SECURITY;
ALTER TABLE recibo_caja            FORCE ROW LEVEL SECURITY;
ALTER TABLE egreso                 FORCE ROW LEVEL SECURITY;
ALTER TABLE nomina_bloque          FORCE ROW LEVEL SECURITY;
ALTER TABLE caja_menor_movimiento  FORCE ROW LEVEL SECURITY;
ALTER TABLE archivo                FORCE ROW LEVEL SECURITY;
ALTER TABLE documento_generado     FORCE ROW LEVEL SECURITY;
ALTER TABLE auditoria              FORCE ROW LEVEL SECURITY;


CREATE POLICY persona_superadmin ON persona
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY persona_docente_select ON persona
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND (
      EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND u.persona_id = persona.id
      )
      OR EXISTS (
        SELECT 1 FROM matricula m
        JOIN asignacion_docente ad ON ad.curso_id = m.curso_id
        WHERE ad.docente_id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND m.estudiante_id = persona.id
          AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
      )
    )
  );

CREATE POLICY persona_estudiante_select ON persona
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND (
      EXISTS (
        SELECT 1 FROM usuario u
        WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND u.persona_id = persona.id
      )
      OR EXISTS (
        SELECT 1 FROM estudiante_familiar ef
        JOIN usuario u ON u.persona_id = ef.estudiante_id
        WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND ef.familiar_id = persona.id
      )
    )
  );

CREATE POLICY usuario_superadmin ON usuario
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY usuario_self ON usuario
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) IN ('docente', 'estudiante')
    AND id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

CREATE POLICY asignacion_docente_superadmin ON asignacion_docente
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY asignacion_docente_docente_select ON asignacion_docente
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND docente_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

CREATE POLICY matricula_superadmin ON matricula
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY matricula_docente_select ON matricula
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND EXISTS (
      SELECT 1 FROM asignacion_docente ad
      WHERE ad.docente_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND ad.curso_id = matricula.curso_id
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
    )
  );

CREATE POLICY matricula_estudiante_select ON matricula
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM usuario u
      WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND u.persona_id = matricula.estudiante_id
    )
  );

CREATE POLICY estudiante_familiar_superadmin ON estudiante_familiar
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY estudiante_familiar_estudiante_select ON estudiante_familiar
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM usuario u
      WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND u.persona_id = estudiante_familiar.estudiante_id
    )
  );

CREATE POLICY calificacion_superadmin ON calificacion
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY calificacion_docente_select ON calificacion
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND EXISTS (
      SELECT 1 FROM asignacion_docente ad
      JOIN matricula m ON m.curso_id = ad.curso_id
      WHERE ad.docente_id    = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND ad.asignatura_id = calificacion.asignatura_id
        AND m.id             = calificacion.matricula_id
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
    )
  );

CREATE POLICY calificacion_docente_write ON calificacion
  FOR INSERT TO agora_app
  WITH CHECK (
    current_setting('app.role', true) = 'docente'
    AND EXISTS (
      SELECT 1 FROM asignacion_docente ad
      JOIN matricula m ON m.curso_id = ad.curso_id
      JOIN periodo p ON p.id = calificacion.periodo_id
      WHERE ad.docente_id    = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND ad.asignatura_id = calificacion.asignatura_id
        AND m.id             = calificacion.matricula_id
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
        AND p.notas_abiertas  = true
    )
  );

CREATE POLICY calificacion_docente_update ON calificacion
  FOR UPDATE TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND NOT calificacion.bloqueado
    AND EXISTS (
      SELECT 1 FROM asignacion_docente ad
      JOIN matricula m ON m.curso_id = ad.curso_id
      JOIN periodo p ON p.id = calificacion.periodo_id
      WHERE ad.docente_id    = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND ad.asignatura_id = calificacion.asignatura_id
        AND m.id             = calificacion.matricula_id
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
        AND p.notas_abiertas  = true
    )
  )
  WITH CHECK (current_setting('app.role', true) = 'docente');

CREATE POLICY calificacion_estudiante_select ON calificacion
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE m.id = calificacion.matricula_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY cal_hist_superadmin ON calificacion_historial
  FOR SELECT TO agora_app
  USING (current_setting('app.role', true) = 'superadmin');

CREATE POLICY cal_hist_insert ON calificacion_historial
  FOR INSERT TO agora_app
  WITH CHECK (true);

CREATE POLICY observador_superadmin ON observador_registro
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY observador_docente ON observador_registro
  FOR ALL TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND EXISTS (
      SELECT 1 FROM asignacion_docente ad
      JOIN matricula m ON m.curso_id = ad.curso_id
      WHERE ad.docente_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND m.id = observador_registro.matricula_id
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
    )
  )
  WITH CHECK (
    current_setting('app.role', true) = 'docente'
  );

CREATE POLICY observador_estudiante_select ON observador_registro
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND observador_registro.tipo IN ('compromiso', 'decision_final')
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE m.id = observador_registro.matricula_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY recibo_caja_superadmin ON recibo_caja
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY recibo_caja_estudiante_select ON recibo_caja
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE m.id = recibo_caja.matricula_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY egreso_superadmin ON egreso
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY nomina_superadmin ON nomina_bloque
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY caja_menor_superadmin ON caja_menor_movimiento
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY plan_cobro_superadmin ON plan_cobro
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY plan_cobro_estudiante_select ON plan_cobro
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE m.id = plan_cobro.matricula_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY aspirante_superadmin ON aspirante
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY aspirante_insert_anonimo ON aspirante
  FOR INSERT TO agora_app
  WITH CHECK (current_setting('app.role', true) = 'anonimo');

CREATE POLICY historia_superadmin ON historia_academica
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY archivo_superadmin ON archivo
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY archivo_docente_own ON archivo
  FOR ALL TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND subido_por = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (current_setting('app.role', true) = 'docente');

CREATE POLICY archivo_estudiante_select ON archivo
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM documento_generado dg
      JOIN matricula m ON m.id = dg.entidad_id
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE dg.archivo_id = archivo.id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY doc_generado_superadmin ON documento_generado
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY doc_generado_docente_select ON documento_generado
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN asignacion_docente ad ON ad.curso_id = m.curso_id
      WHERE m.id = documento_generado.entidad_id
        AND ad.docente_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
    )
  );

CREATE POLICY doc_generado_estudiante_select ON documento_generado
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE m.id = documento_generado.entidad_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY doc_generado_verificacion_publica ON documento_generado
  FOR SELECT TO agora_app
  USING (current_setting('app.role', true) = 'verificacion_publica');

CREATE POLICY auditoria_superadmin_select ON auditoria
  FOR SELECT TO agora_app
  USING (current_setting('app.role', true) = 'superadmin');

CREATE POLICY auditoria_insert ON auditoria
  FOR INSERT TO agora_app
  WITH CHECK (true);
