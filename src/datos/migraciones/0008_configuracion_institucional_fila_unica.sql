DELETE FROM configuracion_institucional
WHERE id NOT IN (
  SELECT id
  FROM configuracion_institucional
  ORDER BY creado_en ASC, id ASC
  LIMIT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS configuracion_institucional_fila_unica
  ON configuracion_institucional ((true));
