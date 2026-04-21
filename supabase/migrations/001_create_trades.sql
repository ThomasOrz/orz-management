-- ─────────────────────────────────────────────────────────────────────────
-- Migración 001 — Crear tabla `trades` (ORZ Methodology)
-- ─────────────────────────────────────────────────────────────────────────
-- Descripción: Tabla principal de registro de trades del módulo /sesion.
-- Schema diseñado para coincidir 100% con SesionClient.tsx.
-- Idempotente: usa IF NOT EXISTS y CREATE POLICY IF NOT EXISTS.
--
-- Ejecutar en: Supabase SQL Editor del proyecto ymosnytxyveedpsubdke
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trades (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contexto pre-trade
  activo              TEXT        NOT NULL CHECK (activo IN ('XAUUSD', 'NAS100')),
  sesion              TEXT        NOT NULL CHECK (sesion IN ('Londres', 'Nueva York', 'Overlap')),
  fecha_entrada       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zona_diario         TEXT        NOT NULL CHECK (zona_diario IN ('Baja', 'Media', 'Alta')),
  zona_h4             TEXT        NOT NULL CHECK (zona_h4 IN ('Baja', 'Media', 'Alta')),
  sesgo               TEXT        NOT NULL CHECK (sesgo IN ('Alcista', 'Bajista')),

  -- Setup
  tipo_vela           TEXT        NOT NULL CHECK (tipo_vela IN ('V85 alcista', 'V85 bajista')),
  "trigger"           TEXT        NOT NULL CHECK ("trigger" IN ('T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación')),
  t1_fallido_previo   BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Gestión
  precio_entrada      NUMERIC     NOT NULL,
  stop_loss           NUMERIC     NOT NULL,
  take_profit         NUMERIC     NOT NULL,
  resultado           TEXT        CHECK (resultado IN ('Win', 'Loss', 'Breakeven')),
  r_obtenido          NUMERIC,

  -- Disciplina
  siguio_reglas       BOOLEAN     NOT NULL DEFAULT TRUE,
  regla_rota          TEXT,
  emocion             TEXT        NOT NULL CHECK (emocion IN ('Tranquilo', 'Ansioso', 'Revanchista', 'Sobreconfiado', 'Con miedo')),
  notas               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance de queries comunes
CREATE INDEX IF NOT EXISTS idx_trades_user_created    ON trades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_fecha      ON trades(user_id, fecha_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_resultado  ON trades(user_id, resultado);

-- Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own trades" ON trades;
CREATE POLICY "Users can manage own trades"
  ON trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Comentarios para futura referencia
COMMENT ON TABLE trades IS 'Trades registrados por el módulo /sesion con metodología ORZ completa';
COMMENT ON COLUMN trades.r_obtenido IS 'R multiple obtenido: Win=+2, Loss=-1, Breakeven=0';
COMMENT ON COLUMN trades.t1_fallido_previo IS 'Si TRUE, bloquea el trigger T1 por regla post-pérdida';
