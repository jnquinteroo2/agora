CREATE TEMP TABLE anio_lectivo_duplicado AS
SELECT a.id
FROM anio_lectivo a
WHERE a.id <> (
  SELECT b.id
  FROM anio_lectivo b
  WHERE EXTRACT(YEAR FROM b.inicio) = EXTRACT(YEAR FROM a.inicio)
  ORDER BY b.creado_en ASC, b.id ASC
  LIMIT 1
);
--> statement-breakpoint
DELETE FROM escala_valoracion
WHERE anio_lectivo_id IN (SELECT id FROM anio_lectivo_duplicado);
--> statement-breakpoint
DELETE FROM periodo p
WHERE p.anio_lectivo_id IN (SELECT id FROM anio_lectivo_duplicado)
  AND NOT EXISTS (SELECT 1 FROM calificacion x WHERE x.periodo_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM documento_generado x WHERE x.periodo_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM nomina_bloque x WHERE x.periodo_id = p.id);
--> statement-breakpoint
DELETE FROM anio_lectivo a
WHERE a.id IN (SELECT id FROM anio_lectivo_duplicado)
  AND NOT EXISTS (SELECT 1 FROM asignacion_docente    x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM caja_menor_movimiento x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM curso                 x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM documento_generado    x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM egreso                x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM escala_valoracion     x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM matricula             x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM nomina_bloque         x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM periodo               x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM plan_asignatura       x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM recibo_caja           x WHERE x.anio_lectivo_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM secuencia             x WHERE x.anio_lectivo_id = a.id);
--> statement-breakpoint
DROP TABLE anio_lectivo_duplicado;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS anio_lectivo_anio_unico
  ON anio_lectivo ((EXTRACT(YEAR FROM inicio)));
