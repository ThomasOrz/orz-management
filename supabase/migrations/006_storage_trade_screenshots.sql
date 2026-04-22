-- ─────────────────────────────────────────────────────────────────────────
-- Migración 006 — Storage bucket `trade-screenshots` (Iteración 1)
-- ─────────────────────────────────────────────────────────────────────────
-- Bucket privado. Estructura: <user_id>/<trade_id>-<timestamp>.<ext>
-- RLS: cada usuario solo puede leer/escribir en su propio folder.
--
-- NOTA: en Supabase hay dos formas de crear buckets:
--   A) Desde Dashboard → Storage → "New bucket"
--   B) Ejecutando este SQL (se usa `storage.buckets` y políticas en
--      `storage.objects`)
-- Ambas son equivalentes. Este SQL es idempotente.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Crear bucket (si no existe) ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trade-screenshots',
  'trade-screenshots',
  FALSE,                                          -- bucket privado
  5242880,                                        -- 5 MB máx por archivo
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies en storage.objects ───────────────────────────────────────
-- El folder = user_id (primer segmento del path).
-- Usamos `(storage.foldername(name))[1]` que devuelve el primer folder.

DROP POLICY IF EXISTS "trade_screenshots_select_own" ON storage.objects;
CREATE POLICY "trade_screenshots_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'trade-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "trade_screenshots_insert_own" ON storage.objects;
CREATE POLICY "trade_screenshots_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'trade-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "trade_screenshots_update_own" ON storage.objects;
CREATE POLICY "trade_screenshots_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'trade-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "trade_screenshots_delete_own" ON storage.objects;
CREATE POLICY "trade_screenshots_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'trade-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
