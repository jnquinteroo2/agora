DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agora_rls_consulta') THEN
    CREATE ROLE agora_rls_consulta WITH
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

GRANT agora_rls_consulta TO agora_migraciones;
GRANT USAGE, CREATE ON SCHEMA public TO agora_rls_consulta;
