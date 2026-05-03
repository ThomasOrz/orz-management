-- ═══════════════════════════════════════════════════════════
-- ORZ MANAGEMENT — Migración Fase 1: Schema Cleanup
-- Fecha: 2026-05-03
-- Objetivo: alinear schema con flujo real de la app
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- 1. TABLA `trades` — Agregar campos faltantes del flujo
-- ───────────────────────────────────────────────────────────

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS trade_cerrado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_cierre timestamp with time zone,
  ADD COLUMN IF NOT EXISTS exit_time timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pnl_usd numeric,
  ADD COLUMN IF NOT EXISTS pnl_neto numeric,
  ADD COLUMN IF NOT EXISTS leccion_aprendida text,
  ADD COLUMN IF NOT EXISTS emotion_pre text,
  ADD COLUMN IF NOT EXISTS emotion_post text,
  ADD COLUMN IF NOT EXISTS screenshots_urls text[],
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES trading_account(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES lab_setups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trade_rating integer CHECK (trade_rating >= 1 AND trade_rating <= 5);

-- Index para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_trades_user_cerrado ON trades(user_id, trade_cerrado);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_fecha_cierre ON trades(fecha_cierre);

-- ───────────────────────────────────────────────────────────
-- 2. TABLA `trading_account` — Agregar campos USD para MFFU
-- ───────────────────────────────────────────────────────────

ALTER TABLE trading_account
  ADD COLUMN IF NOT EXISTS limite_diario_usd numeric,
  ADD COLUMN IF NOT EXISTS limite_total_usd numeric,
  ADD COLUMN IF NOT EXISTS max_perdida_por_trade_usd numeric,
  ADD COLUMN IF NOT EXISTS max_stops_dia integer,
  ADD COLUMN IF NOT EXISTS trailing_drawdown boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS peak_balance numeric,
  ADD COLUMN IF NOT EXISTS payout_porcentaje numeric DEFAULT 80;

-- ───────────────────────────────────────────────────────────
-- 3. TABLA `session_reviews` — Limpiar schema legacy
-- ───────────────────────────────────────────────────────────

-- Migrar datos legacy a columnas nuevas (si hay datos)
UPDATE session_reviews SET
  pnl = COALESCE(pnl, pnl_neto),
  patrones_positivos = CASE
    WHEN patrones_positivos IS NULL AND patrones IS NOT NULL
    THEN (patrones->'positivos')::jsonb
    ELSE patrones_positivos
  END,
  patrones_negativos = CASE
    WHEN patrones_negativos IS NULL AND patrones IS NOT NULL
    THEN (patrones->'negativos')::jsonb
    ELSE patrones_negativos
  END
WHERE pnl IS NULL OR patrones_positivos IS NULL;

-- Drop columnas legacy
ALTER TABLE session_reviews
  DROP COLUMN IF EXISTS pnl_neto,
  DROP COLUMN IF EXISTS errores,
  DROP COLUMN IF EXISTS patrones;

-- ───────────────────────────────────────────────────────────
-- 4. TABLA `trader_stats` — Trigger automático
-- ───────────────────────────────────────────────────────────

-- Función para recalcular stats de un usuario
CREATE OR REPLACE FUNCTION recalculate_trader_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_trades integer;
  v_wins integer;
  v_losses integer;
  v_breakevens integer;
  v_win_rate numeric;
  v_avg_r numeric;
  v_total_r numeric;
  v_profit_factor numeric;
  v_max_dd numeric;
  v_trades_7d integer;
  v_trades_30d integer;
  v_discipline_pct numeric;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE trade_cerrado = true),
    COUNT(*) FILTER (WHERE resultado = 'Win'),
    COUNT(*) FILTER (WHERE resultado = 'Loss'),
    COUNT(*) FILTER (WHERE resultado = 'BE'),
    COALESCE(AVG(r_obtenido) FILTER (WHERE trade_cerrado = true), 0),
    COALESCE(SUM(r_obtenido) FILTER (WHERE trade_cerrado = true), 0),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND trade_cerrado = true),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND trade_cerrado = true),
    COALESCE(AVG(CASE WHEN siguio_reglas THEN 100 ELSE 0 END) FILTER (WHERE trade_cerrado = true), 0)
  INTO
    v_total_trades, v_wins, v_losses, v_breakevens,
    v_avg_r, v_total_r, v_trades_7d, v_trades_30d, v_discipline_pct
  FROM trades
  WHERE user_id = p_user_id;

  v_win_rate := CASE WHEN v_total_trades > 0 THEN (v_wins::numeric / v_total_trades) * 100 ELSE 0 END;
  v_profit_factor := CASE
    WHEN v_losses > 0 THEN
      ABS(COALESCE((SELECT SUM(r_obtenido) FROM trades WHERE user_id = p_user_id AND resultado = 'Win'), 0)) /
      ABS(NULLIF((SELECT SUM(r_obtenido) FROM trades WHERE user_id = p_user_id AND resultado = 'Loss'), 0))
    ELSE 0
  END;

  INSERT INTO trader_stats (
    user_id, total_trades, wins, losses, breakevens,
    win_rate, avg_r, profit_factor, total_r,
    trades_last_7_days, trades_last_30_days, discipline_pct
  )
  VALUES (
    p_user_id, v_total_trades, v_wins, v_losses, v_breakevens,
    v_win_rate, v_avg_r, v_profit_factor, v_total_r,
    v_trades_7d, v_trades_30d, v_discipline_pct
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    breakevens = EXCLUDED.breakevens,
    win_rate = EXCLUDED.win_rate,
    avg_r = EXCLUDED.avg_r,
    profit_factor = EXCLUDED.profit_factor,
    total_r = EXCLUDED.total_r,
    trades_last_7_days = EXCLUDED.trades_last_7_days,
    trades_last_30_days = EXCLUDED.trades_last_30_days,
    discipline_pct = EXCLUDED.discipline_pct;
END;
$$;

-- Asegurar que trader_stats tenga unique constraint en user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trader_stats_user_id_key'
  ) THEN
    ALTER TABLE trader_stats ADD CONSTRAINT trader_stats_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Trigger automático: recalcular stats cuando insert/update/delete en trades
CREATE OR REPLACE FUNCTION trigger_recalc_trader_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_trader_stats(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_trader_stats(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trades_stats_trigger ON trades;
CREATE TRIGGER trades_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON trades
FOR EACH ROW
EXECUTE FUNCTION trigger_recalc_trader_stats();

-- ───────────────────────────────────────────────────────────
-- 5. RLS — Asegurar políticas correctas en tablas nuevas
-- ───────────────────────────────────────────────────────────

-- (Las políticas RLS ya deberían existir; este es solo un check)
DO $$
BEGIN
  -- trades
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'trades_user_isolation') THEN
    EXECUTE 'CREATE POLICY trades_user_isolation ON trades FOR ALL USING (auth.uid() = user_id)';
  END IF;

  -- trading_account
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_account' AND policyname = 'trading_account_user_isolation') THEN
    EXECUTE 'CREATE POLICY trading_account_user_isolation ON trading_account FOR ALL USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────
-- FIN MIGRACIÓN
-- ───────────────────────────────────────────────────────────
