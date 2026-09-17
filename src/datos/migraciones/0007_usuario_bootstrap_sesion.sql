CREATE POLICY usuario_bootstrap_sesion ON usuario
  FOR SELECT TO agora_app
  USING (id = NULLIF(current_setting('app.user_id', true), '')::uuid);
