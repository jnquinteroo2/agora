
DROP POLICY IF EXISTS doc_generado_docente_select ON documento_generado;
DROP POLICY IF EXISTS doc_generado_estudiante_select ON documento_generado;
DROP POLICY IF EXISTS archivo_estudiante_select ON archivo;

CREATE POLICY doc_generado_docente_select ON documento_generado
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'docente'
    AND documento_generado.tipo = 'boletin'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN asignacion_docente ad ON ad.curso_id = m.curso_id
      WHERE m.id = documento_generado.entidad_id
        AND ad.docente_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        AND ad.anio_lectivo_id = NULLIF(current_setting('app.year', true), '')::uuid
    )
  );

CREATE POLICY doc_generado_estudiante_select_boletin ON documento_generado
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND documento_generado.tipo = 'boletin'
    AND EXISTS (
      SELECT 1 FROM matricula m
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE m.id = documento_generado.entidad_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY doc_generado_estudiante_select_recibo ON documento_generado
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) = 'estudiante'
    AND documento_generado.tipo = 'recibo_caja'
    AND EXISTS (
      SELECT 1 FROM recibo_caja rc
      JOIN matricula m ON m.id = rc.matricula_id
      JOIN usuario u ON u.persona_id = m.estudiante_id
      WHERE rc.id = documento_generado.entidad_id
        AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY archivo_via_documento_generado ON archivo
  FOR SELECT TO agora_app
  USING (
    EXISTS (
      SELECT 1 FROM documento_generado dg
      WHERE dg.archivo_id = archivo.id
    )
  );

ALTER TABLE cms_entrada    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_album_foto ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_entrada    FORCE ROW LEVEL SECURITY;
ALTER TABLE cms_album_foto FORCE ROW LEVEL SECURITY;

CREATE POLICY cms_entrada_superadmin ON cms_entrada
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY cms_entrada_publica ON cms_entrada
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) IN ('anonimo', 'estudiante', 'docente')
    AND cms_entrada.estado = 'publicado'
    AND cms_entrada.eliminado_en IS NULL
    AND (cms_entrada.publicar_en IS NULL OR cms_entrada.publicar_en <= now())
  );

CREATE POLICY cms_album_foto_superadmin ON cms_album_foto
  FOR ALL TO agora_app
  USING (current_setting('app.role', true) = 'superadmin')
  WITH CHECK (current_setting('app.role', true) = 'superadmin');

CREATE POLICY cms_album_foto_publica ON cms_album_foto
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) IN ('anonimo', 'estudiante', 'docente')
    AND EXISTS (
      SELECT 1 FROM cms_entrada ce
      WHERE ce.id = cms_album_foto.album_id
        AND ce.estado = 'publicado'
        AND ce.eliminado_en IS NULL
        AND (ce.publicar_en IS NULL OR ce.publicar_en <= now())
    )
  );

