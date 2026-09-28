DO $$
DECLARE
  repetidos text;
BEGIN
  SELECT string_agg(DISTINCT nombre, ', ' ORDER BY nombre) INTO repetidos FROM (
    SELECT nombre FROM concepto_ingreso WHERE eliminado_en IS NULL GROUP BY nombre HAVING count(*) > 1
    UNION ALL
    SELECT nombre FROM categoria_egreso WHERE eliminado_en IS NULL GROUP BY nombre HAVING count(*) > 1
  ) t;
  IF repetidos IS NOT NULL THEN
    RAISE EXCEPTION 'Hay conceptos o categorías repetidos (%). Ejecute infra/postgres/deduplicar-catalogos-financieros.sql como superusuario (DESPLIEGUE.md, sección 13) y vuelva a migrar.', repetidos;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX concepto_ingreso_nombre_vigente ON concepto_ingreso (nombre) WHERE eliminado_en IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX categoria_egreso_nombre_vigente ON categoria_egreso (nombre) WHERE eliminado_en IS NULL;
