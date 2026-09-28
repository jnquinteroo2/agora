BEGIN;

CREATE TEMP TABLE concepto_canonico ON COMMIT DROP AS
  SELECT id, first_value(id) OVER (PARTITION BY nombre ORDER BY id) AS canonico
    FROM concepto_ingreso
    WHERE eliminado_en IS NULL;

CREATE TEMP TABLE categoria_canonica ON COMMIT DROP AS
  SELECT id, first_value(id) OVER (PARTITION BY nombre ORDER BY id) AS canonica
    FROM categoria_egreso
    WHERE eliminado_en IS NULL;

UPDATE plan_cobro p SET concepto_id = c.canonico
  FROM concepto_canonico c WHERE p.concepto_id = c.id AND c.id <> c.canonico;

UPDATE recibo_caja r SET concepto_id = c.canonico
  FROM concepto_canonico c WHERE r.concepto_id = c.id AND c.id <> c.canonico;

UPDATE egreso e SET categoria_id = c.canonica
  FROM categoria_canonica c WHERE e.categoria_id = c.id AND c.id <> c.canonica;

DELETE FROM concepto_ingreso WHERE id IN (SELECT id FROM concepto_canonico WHERE id <> canonico);

DELETE FROM categoria_egreso WHERE id IN (SELECT id FROM categoria_canonica WHERE id <> canonica);

SELECT 'concepto_ingreso' AS tabla, nombre, count(*) AS vigentes
  FROM concepto_ingreso WHERE eliminado_en IS NULL GROUP BY nombre HAVING count(*) > 1
UNION ALL
SELECT 'categoria_egreso', nombre, count(*)
  FROM categoria_egreso WHERE eliminado_en IS NULL GROUP BY nombre HAVING count(*) > 1;

COMMIT;
