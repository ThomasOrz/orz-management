-- ─────────────────────────────────────────────────────────────────────────────
-- 011_trades_schema_v2.sql — Extiende la tabla trades con columnas Iter 7
-- Usa ADD COLUMN IF NOT EXISTS para no romper datos existentes
-- ─────────────────────────────────────────────────────────────────────────────

-- Referencia a estrategias
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;

-- Broker / cuenta
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS broker text DEFAULT 'manual';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS broker_account_id uuid;

-- Identificadores para el nuevo schema v2 (coexisten con los campos legacy)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS symbol text;        -- ej: 'XAUUSD', 'NAS100'
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS side text;          -- 'Long' | 'Short'
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS entry_time timestamptz;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_time  timestamptz;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS entry_price_v2 numeric;  -- alias limpio
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_price  numeric;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS size        numeric;     -- tamaño en lotes

-- P&L monetario
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS pnl_gross numeric;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS pnl_net   numeric;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fees      numeric DEFAULT 0;

-- Métricas adicionales
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS confidence    int CHECK (confidence    BETWEEN 1 AND 5);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS hold_time_min int;  -- duración en minutos
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS r_multiple    numeric;   -- alias de r_obtenido
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS won           boolean;   -- alias de resultado='Win'

-- Índice para queries rápidas por usuario + fecha
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_time
  ON public.trades(user_id, entry_time DESC);
