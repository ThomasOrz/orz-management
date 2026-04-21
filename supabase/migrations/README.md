# Migraciones SQL — ORZ Management

Migraciones para el proyecto Supabase `ymosnytxyveedpsubdke` (compartido con `centro-operaciones-orz`).

## Cómo aplicarlas

**No usar `supabase db push`** (porque el proyecto está compartido y otras migraciones ya están aplicadas con su propio versionado). Estas migraciones deben ejecutarse **manualmente** en el SQL Editor de Supabase, en orden.

### Orden de ejecución

| # | Archivo | Idempotente | Cuándo correr |
|---|---|---|---|
| 1 | `001_create_trades.sql` | ✅ Sí | Una sola vez. Crea la tabla `trades`. |
| 2 | `002_alter_session_reviews.sql` | ✅ Sí | Una sola vez. Añade columnas nuevas + UNIQUE constraint. |
| 3 | `003_migrate_trade_executions.sql` | ✅ Sí | Una sola vez **después** de `001`. Solo si `trade_executions` tiene data. |

### Pasos

1. Ve a https://supabase.com/dashboard/project/ymosnytxyveedpsubdke/sql/new
2. Pega el contenido completo de `001_create_trades.sql` → ejecuta
3. Pega el contenido completo de `002_alter_session_reviews.sql` → ejecuta
4. Antes de la migración 003, verifica si hay datos legacy:
   ```sql
   SELECT COUNT(*) AS pendientes FROM trade_executions;
   ```
   - Si `pendientes = 0` → **no ejecutes** `003`. Listo.
   - Si `pendientes > 0` → ejecuta `003_migrate_trade_executions.sql`. Lee los `RAISE NOTICE` en la salida.

5. Verificación final:
   ```sql
   -- ¿Existe la tabla?
   SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades');

   -- ¿Tiene RLS activo?
   SELECT relrowsecurity FROM pg_class WHERE relname = 'trades';

   -- ¿Cuántos trades del usuario actual?
   SELECT COUNT(*) FROM trades WHERE user_id = auth.uid();

   -- ¿session_reviews tiene las columnas nuevas?
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'session_reviews'
     AND column_name IN ('pnl', 'patrones_positivos', 'patrones_negativos', 'nota_general');
   ```

---

## Deploy de Edge Functions

Después de ejecutar las migraciones SQL, redespliega las EFs que cambiaron.

### Login (una sola vez)

```bash
npx supabase login
# Abre el navegador, autoriza, vuelve a la terminal
```

### Comandos de deploy

Ejecuta desde `~/Desktop/centro-operaciones-orz`:

```bash
cd ~/Desktop/centro-operaciones-orz

# 1. Briefing — versión OHLC + pivotes + ATR (escrita pero sin desplegar)
npx supabase functions deploy generate-briefing \
  --project-ref ymosnytxyveedpsubdke

# 2. Evaluación — ahora lee tabla 'trades' con schema ORZ
npx supabase functions deploy evaluate-session \
  --project-ref ymosnytxyveedpsubdke

# 3. Chat Mentor — ahora lee 'trades' y trae sesgo/trigger/disciplina
npx supabase functions deploy chat-mentor \
  --project-ref ymosnytxyveedpsubdke

# 4. Discipline Check — ahora lee 'trades' + 2 reglas ORZ adicionales
npx supabase functions deploy discipline-check \
  --project-ref ymosnytxyveedpsubdke
```

### Verificar el deploy

```bash
npx supabase functions list --project-ref ymosnytxyveedpsubdke
```

Debe mostrar todas las EFs con `STATUS: ACTIVE` y un timestamp reciente en `UPDATED_AT`.

---

## Rollback (si algo sale mal)

### Revertir creación de `trades`

```sql
-- ⚠️ DESTRUCTIVO — pierde todos los trades registrados
DROP TABLE IF EXISTS trades CASCADE;
```

### Revertir cambios a `session_reviews`

```sql
-- Solo si quieres volver al schema viejo (no recomendado, pierde data)
ALTER TABLE session_reviews
  DROP COLUMN IF EXISTS pnl,
  DROP COLUMN IF EXISTS patrones_positivos,
  DROP COLUMN IF EXISTS patrones_negativos,
  DROP COLUMN IF EXISTS nota_general;
ALTER TABLE session_reviews
  DROP CONSTRAINT IF EXISTS session_reviews_user_fecha_unique;
```
