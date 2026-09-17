
CREATE POLICY doc_generado_docente_insert ON documento_generado
  FOR INSERT TO agora_app
  WITH CHECK (
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
