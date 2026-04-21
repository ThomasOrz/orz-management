-- ─────────────────────────────────────────────────────────────────────────
-- Migración 003 — Migrar datos legacy de `trade_executions` → `trades`
-- ─────────────────────────────────────────────────────────────────────────
-- IMPORTANTE — LEER ANTES DE EJECUTAR:
--
-- 1. PRIMERO ejecuta este SELECT para saber si hace falta correr la migración:
--
--      SELECT COUNT(*) AS pendientes
--      FROM trade_executions
--      WHERE user_id = auth.uid();
--
--    - Si pendientes = 0 → No ejecutes nada más. Ya quedó.
--    - Si pendientes > 0 → Continúa con el bloque de abajo.
--
-- 2. El schema viejo (trade_executions) carece de varios campos ORZ:
--    - sesion, zona_diario, zona_h4, tipo_vela, trigger
--    Esta migración les pone DEFAULTS conservadores. REVISA después y
--    edita manualmente los registros importantes desde la UI.
--
-- 3. Mappings asumidos:
--    - direccion 'Long'/'long'   → sesgo 'Alcista', tipo_vela 'V85 alcista'
--    - direccion 'Short'/'short' → sesgo 'Bajista', tipo_vela 'V85 bajista'
--    - resultado_pips > 0  → 'Win'
--    - resultado_pips < 0  → 'Loss'
--    - resultado_pips = 0  → 'Breakeven'
--    - r_multiple → r_obtenido (si null, intentar derivar de pips)
--    - emocion_pre → emocion (campo principal en trades)
--    - cerrado=false → resultado=NULL
--
-- 4. Esta migración es idempotente por user_id+created_at (no duplica si
--    ya hay un trade en esa fecha exacta).
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  total_legacy INTEGER;
BEGIN
  -- Verificar que la tabla trade_executions existe (si no, no hay nada que migrar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'trade_executions'
  ) THEN
    RAISE NOTICE 'Tabla trade_executions no existe. Migración omitida.';
    RETURN;
  END IF;

  -- Contar registros legacy
  EXECUTE 'SELECT COUNT(*) FROM trade_executions' INTO total_legacy;
  RAISE NOTICE 'Registros legacy encontrados en trade_executions: %', total_legacy;

  IF total_legacy = 0 THEN
    RAISE NOTICE 'No hay datos para migrar.';
    RETURN;
  END IF;

  -- Migrar evitando duplicados (por user_id + created_at exacto)
  INSERT INTO trades (
    user_id, activo, sesion, fecha_entrada,
    zona_diario, zona_h4, sesgo, tipo_vela, trigger, t1_fallido_previo,
    precio_entrada, stop_loss, take_profit,
    resultado, r_obtenido,
    siguio_reglas, regla_rota, emocion, notas,
    created_at
  )
  SELECT
    te.user_id,
    UPPER(te.activo) AS activo,
    'Nueva York'::TEXT AS sesion,                  -- DEFAULT — revisar manualmente
    COALESCE(te.created_at, NOW()) AS fecha_entrada,
    'Media'::TEXT AS zona_diario,                  -- DEFAULT — revisar manualmente
    'Media'::TEXT AS zona_h4,                      -- DEFAULT — revisar manualmente
    CASE LOWER(te.direccion)
      WHEN 'long'  THEN 'Alcista'
      WHEN 'short' THEN 'Bajista'
      ELSE 'Alcista'
    END AS sesgo,
    CASE LOWER(te.direccion)
      WHEN 'long'  THEN 'V85 alcista'
      WHEN 'short' THEN 'V85 bajista'
      ELSE 'V85 alcista'
    END AS tipo_vela,
    'T2 (V85)'::TEXT AS trigger,                   -- DEFAULT — revisar manualmente
    FALSE AS t1_fallido_previo,
    te.precio_entrada,
    te.stop_loss,
    te.take_profit,
    CASE
      WHEN te.cerrado IS NOT TRUE THEN NULL
      WHEN te.resultado_pips IS NULL THEN NULL
      WHEN te.resultado_pips > 0 THEN 'Win'
      WHEN te.resultado_pips < 0 THEN 'Loss'
      ELSE 'Breakeven'
    END AS resultado,
    COALESCE(
      te.r_multiple,
      CASE
        WHEN te.cerrado IS NOT TRUE OR te.resultado_pips IS NULL THEN NULL
        WHEN te.resultado_pips > 0 THEN 2
        WHEN te.resultado_pips < 0 THEN -1
        ELSE 0
      END
    ) AS r_obtenido,
    TRUE AS siguio_reglas,                          -- DEFAULT — datos legacy no tienen este campo
    NULL AS regla_rota,
    COALESCE(te.emocion_pre, 'Tranquilo') AS emocion,
    te.notas,
    COALESCE(te.created_at, NOW()) AS created_at
  FROM trade_executions te
  WHERE NOT EXISTS (
    SELECT 1 FROM trades tr
    WHERE tr.user_id = te.user_id
      AND tr.created_at = te.created_at
  );

  GET DIAGNOSTICS total_legacy = ROW_COUNT;
  RAISE NOTICE 'Trades migrados a la tabla nueva: %', total_legacy;
END $$;

-- Verificación post-migración (ejecutar manualmente):
--
--   SELECT COUNT(*) FROM trades WHERE user_id = auth.uid();
--   SELECT activo, sesgo, resultado, r_obtenido, sesion, trigger, created_at
--   FROM trades WHERE user_id = auth.uid()
--   ORDER BY created_at DESC LIMIT 20;
--
-- Revisa los DEFAULTS (sesion='Nueva York', zona_diario='Media', etc.) y
-- corrige los registros importantes manualmente.
