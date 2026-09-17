CREATE POLICY archivo_cms_publica ON archivo
  FOR SELECT TO agora_app
  USING (
    current_setting('app.role', true) IN ('anonimo', 'estudiante', 'docente')
    AND EXISTS (
      SELECT 1 FROM cms_album_foto af
      JOIN cms_entrada ce ON ce.id = af.album_id
      WHERE af.archivo_id = archivo.id
        AND ce.estado = 'publicado'
        AND ce.eliminado_en IS NULL
    )
  );
