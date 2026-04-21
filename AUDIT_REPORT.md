# AUDIT_REPORT — ORZ Management
> Auditoría técnica completa. Fecha: 2026-04-20
> Metodología: lectura directa de todos los archivos del proyecto y los Edge Functions en `centro-operaciones-orz`.

---

## 1. BASE DE DATOS SUPABASE

### 🔴 CRÍTICO — Tabla `trades` NO EXISTE
- `SesionClient.tsx` hace `.from('trades').insert(...)` — fallará con error de DB en producción.
- El SQL para crearla está solo como **comentario** al inicio de `SesionClient.tsx`. Nunca fue ejecutado en Supabase.
- **Consecuencia directa:** El módulo `/sesion` no puede guardar ningún trade. Los inserts devuelven error silencioso o `PostgresError: relation "trades" does not exist`.

### 🔴 CRÍTICO — Tabla `session_reviews` con columnas incorrectas
- La tabla **existe** (creada por `centro-operaciones-orz`), pero con el schema del EF viejo:
  - Guarda: `pnl_neto` (no `pnl`), `patrones` (JSONB con `{positivos:[], negativos:[]}`), `errores` (array de objetos `{error, costo_estimado}`), sin `nota_general`.
- El nuevo EF local `evaluate-session` (escrito pero no desplegado) guarda:
  - `pnl`, `patrones_positivos`, `patrones_negativos`, `nota_general` como campos separados.
- Las columnas `pnl`, `patrones_positivos`, `patrones_negativos`, `nota_general` **probablemente no existen** en Supabase todavía — solo están en el EF local.
- **Consecuencia:** Hasta que se ejecute `ALTER TABLE` y se despliegue el nuevo EF, los inserts del módulo evaluación fallarán o escribirán en columnas equivocadas.

### Tablas confirmadas como existentes (por CLAUDE.md y CONTEXT)
| Tabla | Origen | Estado |
|---|---|---|
| `briefings` | centro-operaciones-orz | ✅ existe |
| `session_reviews` | centro-operaciones-orz | ⚠️ existe pero schema desactualizado |
| `trade_executions` | centro-operaciones-orz | ✅ existe (tabla legacy) |
| `trade_setups` | centro-operaciones-orz | ✅ existe |
| `discipline_logs` | centro-operaciones-orz | ✅ existe |
| `trades` | orz-management (nueva) | 🔴 NO EXISTE |

### Carpeta de migraciones
- `orz-management/supabase/migrations/` → **NO EXISTÍA** (creada ahora durante este audit).
- Todo el SQL de migración estaba disperso en comentarios de código.

### RLS
- No fue posible verificar directamente las políticas (requiere acceso a Supabase Dashboard).
- Por diseño, todas las tablas usan `auth.uid() = user_id`.
- `briefings` no tiene constraint `UNIQUE(user_id, fecha)` → puede tener múltiples briefings por día.

---

## 2. EDGE FUNCTIONS — LOCAL vs DESPLEGADO

> ⚠️ No hay forma de verificar directamente qué versión está desplegada sin `supabase login`. La comparación es entre el código local y lo que se sabe de los últimos deploys.

| EF | Código local | Estado estimado en Supabase | Acción requerida |
|---|---|---|---|
| `generate-briefing` | OHLC + pivotes + ATR(14) + Promise.allSettled (439 líneas) | Versión anterior (sin OHLC) — NO se hizo `deploy` de la nueva versión | 🔴 REDESPLEGAR |
| `evaluate-session` | Reescrita para leer de `trades` (nuevo schema) | Versión vieja que lee `trade_executions` | 🔴 REDESPLEGAR + ALTER TABLE |
| `validate-setup` | Sin cambios recientes. 7 criterios ICT + salva en `trade_setups` | Probablemente coincide con local | ✅ Parece OK |
| `chat-mentor` | Lee `trade_executions` (tabla vieja). Acepta `historial` opcional | Probablemente coincide con local | ⚠️ Actualizar a `trades` |
| `discipline-check` | Lee `trade_executions` (tabla vieja) | Probablemente coincide con local | ⚠️ Actualizar a `trades` |

---

## 3. MISMATCHES ENTRE EF Y FRONTEND

### Mismatch 1 — `condicion` en Briefing
- **EF genera:** `"risk_on"` | `"risk_off"` | `"mixto"`
- **Frontend antes:** `condicionColors` solo tenía `"favorable"`, `"neutral"`, `"adverso"`, `"mixto"` → siempre caía en fallback amarillo
- **Estado actual:** ✅ CORREGIDO en `BriefingClient.tsx` (esta sesión) — `risk_on` → verde, `risk_off` → rojo

### Mismatch 2 — `sesgo_nas100` / `sesgo_xauusd`
- **EF `generate-briefing`:** Claude devuelve `{direccion: "alcista", razon: "..."}`, pero la EF guarda solo `parsed.sesgo_nas100.direccion` (string simple).
- **Frontend:** `sesgoTexto()` maneja ambos casos (string y objeto). No crashea.
- **Problema real:** La `razon` del sesgo se pierde permanentemente al guardarse en DB. Cuando se carga desde DB, es solo `"alcista"` o `"bajista"` sin contexto.
- **Severidad:** ⚠️ funcional pero con pérdida de información

### Mismatch 3 — `validate-setup`: direccion capitalizada 🔴 BUG ACTIVO
- **ValidarClient.tsx línea 402:** Envía `direccion: sesgo === 'Alcista' ? 'Long' : 'Short'` (mayúscula inicial)
- **EF `validate-setup` línea 46:** Valida `!['long', 'short'].includes(direccion)` (minúsculas)
- **Resultado:** El botón "+ Análisis IA" en `/validar` **SIEMPRE retorna error 400** `"direccion debe ser long o short"`.
- **El usuario ve:** El AI analysis no funciona nunca, solo la validación local sí funciona.

### Mismatch 4 — `chat-mentor` lee `trade_executions` (tabla vieja)
- **EF `chat-mentor` línea 53:** `.from('trade_executions').select(...)`
- **Módulo `/sesion`:** Guarda en tabla `trades` (nueva, cuando exista)
- **Resultado:** Tefa no verá los trades que el usuario registre en `/sesion`. Su contexto de "trades de hoy" siempre estará vacío.

### Mismatch 5 — `discipline-check` lee `trade_executions`
- Mismo problema que chat-mentor. Usa `resultado_pips`, `cerrado` — campos que no existen en `trades`.
- Ningún componente frontend actual llama a `discipline-check` (no está integrado en UI).

### Mismatch 6 — `evaluate-session`: schema viejo vs nuevo
- **Desplegado:** Lee `trade_executions`, guarda `pnl_neto`, `patrones` (objeto), `errores` (array de objetos).
- **Local (no desplegado):** Lee `trades`, guarda `pnl`, `patrones_positivos`, `patrones_negativos`, `nota_general`.
- **`EvaluacionClient.tsx`:** Ya actualizado para leer campos nuevos (`pnl`, `patrones_positivos`, `nota_general`).
- **Resultado actual:** `EvaluacionClient` lee campos que el EF desplegado no produce → pantalla vacía.

### Mismatch 7 — `validate-setup`: criterios ICT vs ORZ
- **EF `validate-setup` system prompt:** Evalúa criterios ICT genéricos (BOS/CHoCH, liquidez, desplazamiento, zona demanda/oferta).
- **ValidarClient.tsx validación local:** Evalúa criterios ORZ específicos (V85, T1/T2/T3, EMAs 8/20/40/200, RR 1:2).
- **Resultado:** La validación local (botón principal) y el análisis IA (segundo botón) usan **metodologías diferentes**. Si hay conflicto, el usuario recibe señales contradictorias.
- **Severidad:** ⚠️ Confuso para el usuario

---

## 4. VARIABLES DE ENTORNO

### Frontend — `.env.local` (verificado por lectura directa)
```
NEXT_PUBLIC_SUPABASE_URL       ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY  ✅
```
> Solo estas dos variables. No hay `SUPABASE_SERVICE_ROLE_KEY` ni nada más en frontend.

### Edge Functions — Supabase Secrets (no verificable directamente, por diseño)
```
SB_URL                 (usado por todas las EFs)
SUPABASE_ANON_KEY      (usado por todas las EFs)
ANTHROPIC_API_KEY      (Claude API — requerido)
FINNHUB_API_KEY        (datos de mercado — configurado recientemente via CLI, no confirmado activo)
```

### Vercel
- No verificable sin acceso al dashboard.
- Se asume que tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No requiere más vars (las API keys están en los Secrets de Supabase, no en Vercel).

---

## 5. ESTADO DE LOS MÓDULOS

### `/briefing` — ⚠️ Funciona con bugs
- ✅ Genera briefing y lo muestra
- ✅ TradingView widgets cargando
- ✅ `condicion` colors corregidos (risk_on/risk_off) — fix de esta sesión
- ⚠️ `generate-briefing` desplegado no tiene OHLC/pivotes — solo el local lo tiene
- ⚠️ `razon` del sesgo se pierde al guardar en DB
- ⚠️ `sesgo_nas100`/`sesgo_xauusd` se guardan como string; al regenerar el mismo día puede haber registros duplicados (sin UNIQUE constraint)

### `/validar` — ⚠️ Funciona con bugs
- ✅ Validación local ORZ funciona perfectamente (7 reglas, A+/A/B/C, checklist)
- ✅ TradingView Chart dinámico
- 🔴 **Botón "+ Análisis IA" siempre falla** (error 400: `direccion debe ser long o short`) — capitalización incorrecta
- ⚠️ EF usa criterios ICT, no ORZ — resultado IA inconsistente con validación local

### `/sesion` — 🔴 ROTO
- ✅ UI completa, formulario funciona
- ✅ Auto-cálculos reactivos (sesgo, TP, R obtenido)
- ✅ TradingView MiniChart dinámico
- 🔴 **Tabla `trades` no existe** → cada submit falla con `PostgresError`
- 🔴 El usuario no puede registrar ningún trade

### `/evaluacion` — 🔴 Roto parcialmente
- ✅ UI renderiza historial si hay datos en `session_reviews`
- ✅ Botón "Evaluar sesión" llama al EF
- 🔴 EF **desplegado** lee `trade_executions` (que tiene 0 trades ORZ) → métricas siempre 0
- 🔴 EF local (nuevo) no está desplegado
- ⚠️ Columnas nuevas de `session_reviews` no creadas → inserts pueden fallar

### `/chat` — ⚠️ Funciona con bugs
- ✅ Chat funciona, Tefa responde
- ✅ UI de burbujas correcta, animación typing
- ⚠️ No persiste historial entre sesiones (se pierde al recargar)
- ⚠️ No es Server Component — no tiene auth en servidor, no recibe `userId`
- ⚠️ EF lee `trade_executions` (no `trades`) → Tefa no tiene contexto real de trades
- ⚠️ El frontend NO envía `historial` al EF → Tefa trata cada mensaje como conversación nueva

---

## 6. BUGS ADICIONALES ENCONTRADOS

### Bug A — Chat no envía historial al EF
- `chat/page.tsx` línea 47: `body: JSON.stringify({ mensaje: texto })` — no incluye el array `mensajes` como historial
- El EF `chat-mentor` acepta `historial` pero el frontend nunca lo envía
- Cada mensaje es procesado sin memoria de la conversación actual
- El EF SÍ tiene el código para manejar el historial (líneas 80-85), pero nunca llega

### Bug B — `briefings` sin unique constraint
- Múltiples briefings por día posibles (al presionar "Generar" varias veces)
- `BriefingClient` carga el más reciente de hoy, pero los viejos quedan en la tabla acumulándose
- Bajo impacto mientras hay un solo usuario

### Bug C — `app/page.tsx` hace llamada de red en Server Component
- `page.tsx` llama `supabase.auth.getUser()` — llamada de red
- El `layout.tsx` ya optimizó esto leyendo cookies, pero `page.tsx` sigue con el método lento
- Impacto mínimo (solo redirige, no renderiza nada)

---

## 7. DEUDA TÉCNICA NO DOCUMENTADA

1. **Sin `supabase/migrations/`**: Todo el SQL está en comentarios de código. Sin historial de migrations es imposible saber qué está en producción.
2. **`validate-setup` EF guarda en `trade_setups`** pero el flujo nuevo de Validar no guarda nada en DB (solo muestra resultado en UI). El `trade_setups` podría recibir datos del EF si la AI analysis funciona — pero solo cuando el bug de capitalización se corrija.
3. **`discipline-check` sin integración UI**: La EF existe y tiene lógica real (máx 3 trades, 2 losses consecutivos), pero ningún componente del frontend la llama. Funcionalidad desperdiciada.
4. **Roles admin/estudiante**: CLAUDE.md los menciona, no están implementados en ningún lugar.

---

## RESUMEN EJECUTIVO

| Prioridad | Ítem | Acción |
|---|---|---|
| 🔴 P0 | Tabla `trades` no existe | Ejecutar SQL en Supabase Editor |
| 🔴 P0 | `evaluate-session` desplegado lee tabla vieja | Deploy + ALTER TABLE |
| 🔴 P0 | Bug capitalización en `validate-setup` | Fix en ValidarClient.tsx (1 línea) |
| 🔴 P1 | `generate-briefing` OHLC no desplegado | Deploy |
| 🔴 P1 | `session_reviews` sin columnas nuevas | ALTER TABLE |
| ⚠️ P2 | `chat-mentor` lee `trade_executions` | Actualizar EF |
| ⚠️ P2 | Chat no envía historial al EF | Fix en chat/page.tsx |
| ⚠️ P2 | `discipline-check` sin integración UI | Integrar o planificar |
| ⚠️ P3 | `razon` sesgo perdida en DB | Guardar objeto completo en briefings |
| ⚠️ P3 | `validate-setup` criterios ICT vs ORZ | Actualizar system prompt |
