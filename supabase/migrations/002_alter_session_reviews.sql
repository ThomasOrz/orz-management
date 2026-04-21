-- ─────────────────────────────────────────────────────────────────────────
-- Migración 002 — Actualizar `session_reviews` al schema nuevo
-- ─────────────────────────────────────────────────────────────────────────
-- Descripción: Añade columnas requeridas por el nuevo evaluate-session EF
-- (que reemplaza el formato antiguo {patrones: {positivos, negativos}}
-- por arrays planos separados, y `pnl_neto` por `pnl` en R multiples).
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS.
-- Conserva datos existentes — los registros viejos tendrán NULL en las
-- nuevas columnas hasta que se re-evalúen sus respectivas sesiones.
-- ─────────────────────────────────────────────────────────────────────────

-- Nuevas columnas que el EF actualizado necesita
ALTER TABLE session_reviews
  ADD COLUMN IF NOT EXISTS pnl                 NUMERIC,
  ADD COLUMN IF NOT EXISTS patrones_positivos  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS patrones_negativos  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nota_general        TEXT;

-- Backfill: si existen filas viejas con el campo `patrones` (objeto),
-- intentar copiar a las nuevas columnas separadas.
-- Si la columna `patrones` no existe, este UPDATE no afecta nada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_reviews' AND column_name = 'patrones'
  ) THEN
    UPDATE session_reviews
    SET patrones_positivos = COALESCE(patrones->'positivos', '[]'::jsonb),
        patrones_negativos = COALESCE(patrones->'negativos', '[]'::jsonb)
    WHERE patrones IS NOT NULL
      AND (patrones_positivos IS NULL OR patrones_positivos = '[]'::jsonb);
  END IF;
END $$;

-- Backfill: si existe `pnl_neto` y no hay `pnl`, copiar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_reviews' AND column_name = 'pnl_neto'
  ) THEN
    UPDATE session_reviews
    SET pnl = pnl_neto
    WHERE pnl IS NULL AND pnl_neto IS NOT NULL;
  END IF;
END $$;

-- Constraint UNIQUE para que upsert(onConflict: user_id,fecha) funcione
-- (el nuevo EF usa esto para re-evaluación idempotente del mismo día)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_reviews_user_fecha_unique'
  ) THEN
    ALTER TABLE session_reviews
      ADD CONSTRAINT session_reviews_user_fecha_unique UNIQUE (user_id, fecha);
  END IF;
END $$;

COMMENT ON COLUMN session_reviews.pnl IS 'P&L expresado en R multiples (suma de r_obtenido del día)';
COMMENT ON COLUMN session_reviews.patrones_positivos IS 'Array plano de strings — patrones positivos detectados por Tefa';
COMMENT ON COLUMN session_reviews.patrones_negativos IS 'Array plano de strings — patrones negativos detectados por Tefa';
COMMENT ON COLUMN session_reviews.nota_general IS 'Evaluación general en 1-2 oraciones';
