-- ─────────────────────────────────────────────────────────────────────────────
-- 010_strategies.sql — Tabla de estrategias (Iter 7)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.strategies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  emoji       text DEFAULT '📊',
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Índice de usuario
CREATE INDEX IF NOT EXISTS idx_strategies_user ON public.strategies(user_id);

-- RLS
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own strategies"
  ON public.strategies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own strategies"
  ON public.strategies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own strategies"
  ON public.strategies FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own strategies"
  ON public.strategies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin ve todas
CREATE POLICY "Admins read all strategies"
  ON public.strategies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION handle_strategies_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER on_strategies_updated_at
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION handle_strategies_updated_at();

-- ─── Función seed: inserta 5 estrategias default por usuario nuevo ───────────
-- Llamar manualmente por usuario o via trigger en profiles:
--   SELECT seed_default_strategies('<user_uuid>');

CREATE OR REPLACE FUNCTION public.seed_default_strategies(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.strategies (user_id, name, description, emoji, is_default)
  VALUES
    (p_user_id, 'T1 — Entrada en V50', 'Setup de mínimo riesgo: entrada precisa en vela V50 con stop ajustado debajo del cuerpo.', '🎯', true),
    (p_user_id, 'T2 — Entrada en V85', 'Entrada en zona de liquidez de la V85, con mayor holgura en el stop.', '⚡', true),
    (p_user_id, 'T3 — T2 + cruce de EMAs', 'T2 con confirmación adicional de cruce completo de medias móviles.', '📐', true),
    (p_user_id, 'V85 — Vela 85',  'Análisis de estructura basado únicamente en la vela V85 y su zona de reacción.', '🕯️', true),
    (p_user_id, 'V50 — Vela 50',  'Estructura basada en la V50 como referencia de rango y equilibrio.', '📊', true)
  ON CONFLICT DO NOTHING;
END;
$$;
