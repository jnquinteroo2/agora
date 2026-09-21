CREATE UNIQUE INDEX IF NOT EXISTS anio_lectivo_activo_unico
  ON anio_lectivo (activo)
  WHERE activo;
