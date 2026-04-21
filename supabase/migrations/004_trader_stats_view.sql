-- ─────────────────────────────────────────────────────────────────────────
-- Migración 004 — Vista `trader_stats` (Analytics Engine — Fase 3)
-- ─────────────────────────────────────────────────────────────────────────
-- Descripción: Vista por usuario con métricas agregadas calculadas en
-- tiempo real desde la tabla `trades`. Solo considera trades cerrados
-- (resultado IS NOT NULL).
--
-- Acceso: usa SECURITY INVOKER (la vista corre con permisos del usuario
-- que la consulta), por lo que el RLS de `trades` aplica automáticamente.
-- Cada usuario solo ve su propia fila.
--
-- Idempotente: CREATE OR REPLACE.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW trader_stats AS
WITH base AS (
  SELECT
    user_id,
    resultado,
    r_obtenido,
    created_at,
    siguio_reglas,
    -- Numerar trades cronológicamente para detectar rachas
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM trades
  WHERE resultado IS NOT NULL
),
-- Equity curve acumulada (suma corrida de R)
equity AS (
  SELECT
    user_id,
    rn,
    r_obtenido,
    SUM(COALESCE(r_obtenido, 0)) OVER (PARTITION BY user_id ORDER BY rn) AS equity_r
  FROM base
),
-- Drawdown: para cada punto, la diferencia entre equity actual y máximo previo
drawdowns AS (
  SELECT
    user_id,
    equity_r - MAX(equity_r) OVER (PARTITION BY user_id ORDER BY rn ROWS UNBOUNDED PRECEDING) AS dd
  FROM equity
),
-- Detección de rachas: agrupar Wins consecutivos y Losses consecutivos
streak_groups AS (
  SELECT
    user_id,
    resultado,
    rn,
    -- Cambio de signo crea un nuevo grupo
    rn - ROW_NUMBER() OVER (
      PARTITION BY user_id, CASE WHEN resultado = 'Win' THEN 1 WHEN resultado = 'Loss' THEN -1 ELSE 0 END
      ORDER BY rn
    ) AS grp,
    CASE WHEN resultado = 'Win' THEN 1 WHEN resultado = 'Loss' THEN -1 ELSE 0 END AS signo
  FROM base
),
streak_counts AS (
  SELECT
    user_id,
    signo,
    COUNT(*) AS streak_len,
    MAX(rn) AS streak_end_rn
  FROM streak_groups
  WHERE signo <> 0
  GROUP BY user_id, signo, grp
),
streak_summary AS (
  SELECT
    user_id,
    MAX(CASE WHEN signo =  1 THEN streak_len END) AS best_win_streak,
    MAX(CASE WHEN signo = -1 THEN streak_len END) AS worst_loss_streak
  FROM streak_counts
  GROUP BY user_id
),
-- Racha actual: la última racha (signo y longitud)
current_streak AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    signo * streak_len AS current_streak_signed
  FROM streak_counts
  ORDER BY user_id, streak_end_rn DESC
)
SELECT
  t.user_id,

  -- Conteo
  COUNT(*)::INTEGER                                                AS total_trades,
  COUNT(*) FILTER (WHERE t.resultado = 'Win')::INTEGER             AS wins,
  COUNT(*) FILTER (WHERE t.resultado = 'Loss')::INTEGER            AS losses,
  COUNT(*) FILTER (WHERE t.resultado = 'Breakeven')::INTEGER       AS breakevens,

  -- Win rate (excluye breakevens del denominador para WR "puro")
  CASE
    WHEN COUNT(*) FILTER (WHERE t.resultado IN ('Win', 'Loss')) > 0
    THEN ROUND(
      100.0 * COUNT(*) FILTER (WHERE t.resultado = 'Win')
      / COUNT(*) FILTER (WHERE t.resultado IN ('Win', 'Loss')),
      2
    )
    ELSE 0
  END                                                              AS win_rate,

  -- R promedio (todos los trades cerrados)
  COALESCE(ROUND(AVG(t.r_obtenido)::NUMERIC, 2), 0)                AS avg_r,

  -- Profit factor: ganancia bruta / pérdida bruta
  CASE
    WHEN ABS(COALESCE(SUM(t.r_obtenido) FILTER (WHERE t.r_obtenido < 0), 0)) > 0
    THEN ROUND(
      COALESCE(SUM(t.r_obtenido) FILTER (WHERE t.r_obtenido > 0), 0) /
      ABS(SUM(t.r_obtenido) FILTER (WHERE t.r_obtenido < 0)),
      2
    )
    ELSE NULL  -- sin pérdidas → undefined (no infinity)
  END                                                              AS profit_factor,

  -- Drawdown máximo en R (más negativo)
  COALESCE(
    (SELECT ROUND(MIN(dd)::NUMERIC, 2) FROM drawdowns d WHERE d.user_id = t.user_id),
    0
  )                                                                AS max_drawdown_r,

  -- Racha actual: positiva = wins, negativa = losses
  COALESCE(
    (SELECT current_streak_signed FROM current_streak cs WHERE cs.user_id = t.user_id),
    0
  )::INTEGER                                                       AS current_streak,

  COALESCE(
    (SELECT best_win_streak FROM streak_summary ss WHERE ss.user_id = t.user_id),
    0
  )::INTEGER                                                       AS best_streak,

  COALESCE(
    (SELECT worst_loss_streak FROM streak_summary ss WHERE ss.user_id = t.user_id),
    0
  )::INTEGER                                                       AS worst_streak,

  -- Actividad reciente
  COUNT(*) FILTER (WHERE t.created_at >= NOW() - INTERVAL '7 days')::INTEGER  AS trades_last_7_days,
  COUNT(*) FILTER (WHERE t.created_at >= NOW() - INTERVAL '30 days')::INTEGER AS trades_last_30_days,

  -- R acumulado total
  COALESCE(ROUND(SUM(t.r_obtenido)::NUMERIC, 2), 0)                AS total_r,

  -- Disciplina
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE t.siguio_reglas = TRUE) / COUNT(*), 2)
    ELSE 0
  END                                                              AS discipline_pct

FROM base t
GROUP BY t.user_id;

-- Comentarios
COMMENT ON VIEW trader_stats IS 'Métricas agregadas por usuario sobre la tabla trades. Vista en tiempo real, RLS heredado.';
