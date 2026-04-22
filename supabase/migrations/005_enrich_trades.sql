-- ─────────────────────────────────────────────────────────────────────────
-- Migración 005 — Enriquecer tabla `trades` (Iteración 1)
-- ─────────────────────────────────────────────────────────────────────────
-- Añade campos para análisis estadístico profesional:
--   • Contexto de mercado (snapshot al momento de entrada)
--   • Contexto operativo (capital, % riesgo, R arriesgado)
--   • MAE/MFE (se llenan al cerrar el trade)
--   • Justificación estructurada (razón entrada, plan invalidación, lección)
--   • Screenshot del chart
--   • Metadata de cierre
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS (Postgres 9.6+).
-- No toca datos existentes. Trades previos tendrán NULL en los nuevos campos.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Contexto de mercado ───────────────────────────────────────────────────
ALTER TABLE trades ADD COLUMN IF NOT EXISTS precio_activo_entrada  NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS vix_entrada            NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS dxy_entrada            NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS spread_pips            NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS hora_exacta_trigger    TIMESTAMPTZ;

-- ── Contexto operativo ────────────────────────────────────────────────────
ALTER TABLE trades ADD COLUMN IF NOT EXISTS capital_cuenta         NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS riesgo_pct             NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS riesgo_r               NUMERIC DEFAULT 1;

-- ── MAE / MFE (post-cierre) ───────────────────────────────────────────────
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mae_r                   NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mfe_r                   NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS tiempo_hasta_cierre_min INTEGER;

-- ── Justificación estructurada ────────────────────────────────────────────
ALTER TABLE trades ADD COLUMN IF NOT EXISTS razon_entrada          TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS plan_invalidacion      TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS leccion_aprendida      TEXT;

-- ── Screenshot ────────────────────────────────────────────────────────────
ALTER TABLE trades ADD COLUMN IF NOT EXISTS screenshot_url         TEXT;

-- ── Metadata de cierre ────────────────────────────────────────────────────
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_cerrado          BOOLEAN DEFAULT FALSE;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS fecha_cierre           TIMESTAMPTZ;

-- ── Backfill: trades legacy con resultado no-null se marcan como cerrados
-- (para no romper analytics de la vista trader_stats)
UPDATE trades
   SET trade_cerrado = TRUE,
       fecha_cierre  = COALESCE(fecha_cierre, created_at)
 WHERE resultado IS NOT NULL
   AND trade_cerrado IS NOT TRUE;

-- ── Índice para filtrar trades abiertos rápido ────────────────────────────
CREATE INDEX IF NOT EXISTS trades_open_idx
  ON trades (user_id, trade_cerrado)
  WHERE trade_cerrado = FALSE;

-- ── Comentarios de documentación ──────────────────────────────────────────
COMMENT ON COLUMN trades.precio_activo_entrada IS 'Snapshot del precio mid del activo al guardar (Finnhub).';
COMMENT ON COLUMN trades.vix_entrada           IS 'VIX al momento de entrada. NULL si Finnhub no lo devolvió.';
COMMENT ON COLUMN trades.dxy_entrada           IS 'DXY al momento de entrada. NULL si Finnhub no lo devolvió.';
COMMENT ON COLUMN trades.spread_pips           IS 'Spread estimado en pips/puntos según activo.';
COMMENT ON COLUMN trades.hora_exacta_trigger   IS 'Timestamp preciso del trigger (server-side).';
COMMENT ON COLUMN trades.capital_cuenta        IS 'Capital total de la cuenta al momento del trade. Opcional.';
COMMENT ON COLUMN trades.riesgo_pct            IS '% del capital arriesgado (calculado si capital_cuenta presente).';
COMMENT ON COLUMN trades.riesgo_r              IS 'R arriesgado: 0.5, 1, 1.5, 2. Default 1.';
COMMENT ON COLUMN trades.mae_r                 IS 'Maximum Adverse Excursion en R (post-cierre).';
COMMENT ON COLUMN trades.mfe_r                 IS 'Maximum Favorable Excursion en R (post-cierre).';
COMMENT ON COLUMN trades.tiempo_hasta_cierre_min IS 'Minutos entre hora_exacta_trigger y fecha_cierre.';
COMMENT ON COLUMN trades.razon_entrada         IS 'Qué vio el trader que lo hizo entrar. Mínimo 20 chars en UI.';
COMMENT ON COLUMN trades.plan_invalidacion     IS 'Qué invalidaría el setup. Mínimo 15 chars en UI.';
COMMENT ON COLUMN trades.leccion_aprendida     IS 'Qué aprendió el trader. Se llena al cerrar. Mínimo 20 chars en UI.';
COMMENT ON COLUMN trades.screenshot_url        IS 'URL pública de Supabase Storage bucket "trade-screenshots".';
COMMENT ON COLUMN trades.trade_cerrado         IS 'TRUE si el post-trade fue completado (resultado + MAE/MFE + lección).';
COMMENT ON COLUMN trades.fecha_cierre          IS 'Timestamp del cierre del trade.';
