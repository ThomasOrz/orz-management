# ORZ Management — Contexto Completo del Proyecto

> Documento generado para que otro agente de IA pueda dar asesoría técnica.
> Última actualización: 2026-04-18

---

## 1. Stack Tecnológico

### Frontend / Framework
| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 14.2.35 | Framework principal (App Router) |
| React | ^18 | UI |
| TypeScript | ^5 | Tipado estricto |
| Tailwind CSS | ^3.4.1 | Utilities CSS |
| Geist | ^1.3.0 | Fuente (Vercel) |
| PostCSS | ^8 | Procesamiento CSS |
| Autoprefixer | ^10.5.0 | Vendor prefixes |

### Backend / Infraestructura
| Tecnología | Versión / Detalles | Rol |
|---|---|---|
| Supabase | Proyecto compartido `ymosnytxyveedpsubdke` | BDD, Auth, Edge Functions, Storage |
| @supabase/ssr | ^0.10.0 | Auth SSR-compatible con Next.js |
| @supabase/supabase-js | ^2.102.1 | Cliente JS |
| Deno (Supabase Edge Functions) | Runtime de Edge Functions | Lógica serverless |
| Anthropic Claude API | claude-sonnet-4-20250514 | IA para briefing, validación, chat, evaluación |
| Finnhub API | REST API | Datos de mercado en tiempo real (OHLC, quotes, noticias, calendario) |
| TradingView Widgets | Scripts externos | Gráficos interactivos embebidos |

### Deploy
| Plataforma | Detalles |
|---|---|
| Vercel | Deploy automático desde GitHub |
| GitHub | Dos remotes: `origin` (orz-management) y `app` (orz-management-app) |

### Proyecto hermano (comparte Supabase)
- `~/Desktop/centro-operaciones-orz` — contiene las Edge Functions fuente
- Las Edge Functions se despliegan desde ese proyecto al mismo Supabase

---

## 2. Estructura Completa de Carpetas y Archivos

```
orz-management/
├── app/
│   ├── briefing/
│   │   ├── page.tsx           → Server Component (auth + fetch briefing de hoy)
│   │   └── BriefingClient.tsx → Client Component (UI del briefing + widgets TV)
│   ├── chat/
│   │   └── page.tsx           → Client Component todo-en-uno (chat con Tefa)
│   ├── evaluacion/
│   │   ├── page.tsx           → Server Component (auth + fetch historial)
│   │   └── EvaluacionClient.tsx → Client Component (form + historial evaluaciones)
│   ├── login/
│   │   └── page.tsx           → Client Component (login/registro Supabase)
│   ├── sesion/
│   │   ├── page.tsx           → Server Component (auth + fetch trades de hoy)
│   │   └── SesionClient.tsx   → Client Component (formulario registro de trades)
│   ├── validar/
│   │   ├── page.tsx           → Server Component (auth check)
│   │   └── ValidarClient.tsx  → Client Component (validación setup ORZ)
│   ├── fonts/
│   │   ├── GeistVF.woff       → Fuente Geist Variable (local)
│   │   └── GeistMonoVF.woff   → Fuente Geist Mono Variable (local)
│   ├── globals.css            → Design system: tokens CSS + clases base
│   ├── layout.tsx             → Root layout: auth cookie check, Sidebar, GeistSans
│   ├── page.tsx               → Redirect automático a /login
│   └── favicon.ico
├── components/
│   ├── Sidebar.tsx                    → Navegación lateral fija (260px)
│   ├── TradingViewChart.tsx           → Widget Advanced Chart de TradingView
│   ├── TradingViewMiniChart.tsx       → Widget Mini Symbol Overview
│   ├── TradingViewTechnicalAnalysis.tsx → Widget Technical Analysis
│   └── TradingViewEconomicCalendar.tsx  → Widget Events/Calendar
├── lib/
│   └── supabase/
│       ├── client.ts  → createBrowserClient (para Client Components)
│       └── server.ts  → createServerClient con cookies() (para Server Components)
├── middleware.ts          → Auth middleware: refresca sesión, protege rutas
├── CLAUDE.md              → Instrucciones para Claude Code
├── CONTEXT_FOR_ADVISOR.md → Este archivo
├── next.config.mjs        → Config Next.js (mínima)
├── tailwind.config.ts     → Content paths para Tailwind
├── postcss.config.mjs     → tailwindcss + autoprefixer
├── tsconfig.json          → TypeScript config con path alias @/
├── package.json
└── .env.local             → Variables de entorno (no en git)
```

### Proyecto hermano (Edge Functions)
```
centro-operaciones-orz/
└── supabase/
    └── functions/
        ├── generate-briefing/index.ts   → Briefing pre-mercado con datos Finnhub + Claude
        ├── validate-setup/index.ts      → Validación IA de setup de trading
        ├── evaluate-session/index.ts    → Evaluación de sesión de trading
        ├── chat-mentor/index.ts         → Chat con Tefa (Claude)
        └── discipline-check/index.ts   → Verificación de disciplina
```

---

## 3. Descripción de Cada Módulo

### `/briefing` — Briefing Diario
**Propósito:** Genera un análisis pre-mercado para NAS100 y XAUUSD usando datos reales de Finnhub procesados por Claude.

**Flujo:**
1. Server Component carga briefing de hoy desde tabla `briefings` (Supabase)
2. Si no existe, muestra botón "Generar Briefing"
3. Cliente llama Edge Function `generate-briefing` (POST con JWT)
4. EF obtiene OHLC de Finnhub (candles diarios 35 días), calcula pivotes PP/R1/R2/S1/S2, ATR(14), swing highs/lows, y cotizaciones de DXY/VIX/US10Y
5. Pasa todo a Claude (claude-sonnet-4-20250514) con system prompt estricto
6. Claude devuelve JSON con: narrativa, condicion, sesgo_nas100, sesgo_xauusd, eventos, correlaciones, zonas_clave, plan_accion
7. EF guarda en `briefings` y devuelve `{briefing, parsed, technicalData}`
8. BriefingClient renderiza todas las secciones

**Widgets TradingView integrados (después de Zonas Clave):**
- 2x Advanced Chart (NAS100 + XAUUSD, 15m, 500px)
- 2x Technical Analysis (NAS100 + XAUUSD, 15m)
- 1x Economic Calendar (US, EU, JP, 400px)

**Campos guardados en `briefings`:**
- `sesgo_nas100` y `sesgo_xauusd` → se guardan como STRING simple (solo `direccion`), aunque Claude los devuelve como `{direccion, razon}`. Esto es una discrepancia conocida.
- `condicion` → puede ser `risk_on`, `risk_off`, o `mixto` (la EF lo define así). El frontend tiene `condicionColors` para `favorable/neutral/adverso/mixto` → mismatch parcial.

---

### `/validar` — Validar Setup
**Propósito:** Verifica si un setup de trading cumple los criterios de calidad de la metodología ORZ antes de operar.

**Flujo:**
1. Server Component hace auth check
2. ValidarClient renderiza formulario multi-fase
3. Al presionar "Validar Setup": validación local instantánea (sin red)
4. Al presionar "+ Análisis IA": llama Edge Function `validate-setup`

**Fases del formulario:**
- **Fase 0 (Contexto):** Activo, tendencia mayor Diario, Zona Diario, Zona H4, sesgo auto-sugerido (matriz)
- **Fases 1-2 (Setup):** Toggle V85, dirección V85, T1 fallido (bloquea T1), trigger, EMAs
- **Fase 3 (Gestión):** Entrada, SL, TP auto-calculado (RR 1:2), indicador R:R

**Lógica de validación interna (7 reglas):**
| Regla | Crítica |
|---|---|
| V85 identificada | ✅ |
| V85 alineada con sesgo | ✅ |
| Confluencia Diario + H4 | No |
| Trigger permitido (post-pérdida) | ✅ |
| EMAs 8/20/40/200 alineadas | No |
| R:R ≥ 1:2 | ✅ |
| Gestión completa | No |

**Clasificación:** A+ / A / B / C basada en puntuación (0-7) y reglas críticas fallidas.

**Widget TradingView:** Advanced Chart dinámico (cambia con activo, 480px, 15m).

---

### `/sesion` — Registro de Sesión
**Propósito:** Registrar trades en vivo durante la sesión, con los campos completos de la metodología ORZ.

**Flujo:**
1. Server Component carga trades de hoy desde tabla `trades`
2. SesionClient renderiza formulario en 4 secciones + MiniChart del activo

**Secciones del formulario:**
- **Contexto Pre-Trade:** Activo, sesión (Londres/NY/Overlap), fecha/hora, Zona Diario, Zona H4, sesgo auto-sugerido
- **Setup:** Tipo vela V85, T1 fallido (bloquea T1), trigger
- **Gestión:** Entrada, SL, TP auto 1:2, Resultado (Win/Loss/BE), R obtenido auto
- **Disciplina:** Siguió reglas, regla rota (si No), emoción, notas

**Lógica reactiva:**
- Sesgo auto-calculado desde matriz Diario+H4
- Tipo de vela se sincroniza con sesgo
- TP = entrada ± 2×risk según sesgo
- R obtenido: Win=+2R, Loss=-1R, BE=0R
- T1 fallido bloquea T1 en trigger

**Widget TradingView:** MiniChart (220px, 1D) que cambia con activo usando `key={activo}`.

**Tabla:** `trades` (ver schema abajo)

---

### `/evaluacion` — Evaluación de Sesión
**Propósito:** Genera una evaluación post-sesión con errores, patrones, y acción para mañana.

**Flujo:**
1. Server Component carga historial de `session_reviews` (últimas 10)
2. EvaluacionClient muestra evaluación de hoy (si existe) o botón "Evaluar sesión de hoy"
3. Al presionar: llama Edge Function `evaluate-session`
4. Muestra métricas, errores detectados, patrones positivos/negativos, acción para mañana
5. Historial de las últimas sesiones al fondo

**Tabla:** `session_reviews` (no `trades` — son registros de evaluación, no de trades individuales)

**Nota:** La EF puede devolver campos como objetos (`{error, costo_estimado}`). EvaluacionClient usa helpers `toNum()`, `toStr()`, `toStrArr()` para manejar tipos desconocidos.

---

### `/chat` — Chat Mentor
**Propósito:** Chat en tiempo real con Tefa, la IA mentora de ORZ Academy.

**Todo en `app/chat/page.tsx`** (Client Component sin separación server/client).

**Flujo:** Usuario escribe → llamada a Edge Function `chat-mentor` con JWT → respuesta de Claude como string.

**UX:** Burbujas de chat, animación de "typing" con dots, scroll automático, Enter para enviar / Shift+Enter para nueva línea.

**Pendiente:** No persiste el historial de conversación entre sesiones.

---

### `/login` — Autenticación
**Todo en `app/login/page.tsx`** (Client Component).
- Dos modos: Login y Registro (tabs)
- Usa `supabase.auth.signInWithPassword` y `supabase.auth.signUp`
- Tras login exitoso: redirect a `/briefing`
- Tras registro: mensaje para confirmar email

---

## 4. Lo Que Ya Está Funcionando

✅ **Auth completa** — Login, registro, logout, protección de rutas via middleware  
✅ **Sidebar** — Navegación fija 260px, ítem activo destacado, cierre de sesión  
✅ **Layout con Geist** — Font Geist aplicado, design system CSS en globals.css  
✅ **Briefing Diario** — Genera, guarda y muestra briefing con datos Finnhub reales  
✅ **Widgets TradingView** — 4 componentes (Chart, MiniChart, TechnicalAnalysis, EconomicCalendar) integrados en Briefing, Validar y Sesión  
✅ **Validar Setup** — Formulario completo ORZ + validación interna + análisis IA opcional  
✅ **Registro de Sesión** — Formulario completo con auto-cálculos + MiniChart dinámico  
✅ **Evaluación** — Genera evaluación vía IA y muestra historial  
✅ **Chat con Tefa** — Chat funcional con Edge Function  
✅ **Build de producción** — `npm run build` compila sin errores  
✅ **Deploy en Vercel** — Código en GitHub (dos remotes: origin y app)  

---

## 5. Lo Que Está en Progreso o Roto

### 🔴 Problemas conocidos

**Mismatch `condicion` en briefings:**
- La Edge Function `generate-briefing` produce: `"risk_on"`, `"risk_off"`, `"mixto"`
- El frontend `BriefingClient.tsx` tiene `condicionColors` solo para: `"favorable"`, `"neutral"`, `"adverso"`, `"mixto"`
- Resultado: `risk_on` y `risk_off` caen al fallback "neutral" (badge amarillo). No crashea pero muestra color incorrecto.

**`sesgo_nas100` / `sesgo_xauusd` aplanados en DB:**
- Claude devuelve `{ direccion: "alcista", razon: "..." }`
- La EF guarda solo `sesgo_nas100: parsed.sesgo_nas100.direccion` (string simple)
- Cuando se carga desde DB, el campo es string; cuando viene del `parsed` recién generado, es objeto
- `BriefingClient.tsx` tiene `sesgoTexto()` que maneja ambos casos → no crashea, pero la `razon` se pierde en DB

**Deploy de Edge Functions bloqueado:**
- `npx supabase functions deploy` requiere `SUPABASE_ACCESS_TOKEN` o `supabase login`
- No hay token configurado en el entorno de Claude Code → cada modificación a Edge Functions requiere deploy manual
- Modificaciones recientes a `generate-briefing` (OHLC + pivotes) están escritas pero NO desplegadas

**Finnhub candles en tier gratuito:**
- Los endpoints `/stock/candle` pueden devolver 403 en plan gratuito para algunos símbolos
- El código usa `Promise.allSettled` y marca campos como `[datos no disponibles — HTTP 403]`
- Si todos los candles fallan, Claude recibe solo datos de cotización spot (sin OHLC histórico) y los niveles técnicos serán menos precisos

**Chat sin persistencia:**
- El historial de mensajes se pierde al recargar la página
- No se guarda en Supabase

### 🟡 Incompleto / no implementado

**Tabla `trades` no creada en Supabase:**
- `SesionClient.tsx` guarda en tabla `trades`
- El SQL para crearla está como comentario al inicio del archivo
- Si la tabla no existe, el insert fallará silenciosamente (o con error de DB)
- Hay que ejecutar el SQL en Supabase SQL Editor manualmente

**`/evaluacion` lee de `session_reviews`, no de `trades`:**
- La evaluación usa los datos de `session_reviews` (tabla existente de centro-operaciones-orz)
- El módulo `/sesion` guarda en `trades` (tabla nueva)
- La Edge Function `evaluate-session` probablemente lee de `trade_executions` (tabla vieja)
- Hay desconexión entre el nuevo flujo de registro y la evaluación automática

**`chat/page.tsx` no es Server Component:**
- Único módulo que no separa server/client
- No verifica auth en servidor (depende solo del middleware)
- No tiene `userId` para personalización

---

## 6. Decisiones Técnicas Importantes

### Autenticación — `@supabase/ssr`
Se usa `@supabase/ssr` (no `@supabase/auth-helpers-nextjs` deprecated) con el patrón oficial:
- `lib/supabase/client.ts` → `createBrowserClient` para Client Components
- `lib/supabase/server.ts` → `createServerClient` con `cookies()` para Server Components
- `middleware.ts` → refresca el token en cada request (obligatorio para que SSR funcione)

**Sin middleware, `getUser()` en Server Components devuelve `null`** aunque haya sesión activa. Esto fue el bug original que causó el "client-side exception".

### Layout — Detección de sesión por cookie
`app/layout.tsx` NO llama a `supabase.auth.getUser()` (llamada de red que puede fallar).  
En su lugar, detecta sesión leyendo cookies: `c.name.startsWith('sb-') || c.name.includes('auth-token')`.  
El middleware ya garantiza que solo usuarios autenticados llegan a rutas protegidas.

### Design System — CSS puro + Tailwind
El design system principal está en `globals.css` como CSS variables y clases reales (`.app-shell`, `.sidebar`, `.nav-item`, `.card`). Esto garantiza que los estilos funcionen **independientemente de Tailwind**.

Tailwind se usa para utilities menores. La razón: se detectó que en ciertos entornos de preview, el CSS de Tailwind no cargaba correctamente.

**Design tokens:**
```css
--bg-primary:    #0A0A0A   /* fondo general */
--bg-secondary:  #111111   /* cards y sidebar */
--border-subtle: rgba(255,255,255,0.031)  /* #ffffff08 */
--border-accent: rgba(26,155,215,0.125)   /* #1A9BD720 */
--accent:        #1A9BD7   /* azul cyan ORZ */
--accent-bg:     rgba(26,155,215,0.082)   /* ~#1A9BD715 */
--text-primary:  #FFFFFF
--text-secondary:#999999
--text-tertiary: #666666
--sidebar-width: 260px
```

### TradingView Widgets — Carga dinámica
Los widgets TradingView se cargan mediante scripts JS externos. Patrón usado:
```tsx
useEffect(() => {
  container.innerHTML = ''          // limpiar
  const widgetEl = document.createElement('div')
  const script = document.createElement('script')
  script.src = 'https://s3.tradingview.com/...'
  script.innerHTML = JSON.stringify(config)  // config como texto del script
  container.appendChild(widgetEl)
  container.appendChild(script)
  return () => { container.innerHTML = '' }  // cleanup
}, [symbol, interval, height])
```

Para actualizaciones dinámicas del símbolo (Validar, Sesión), se usa `key={symbol}` en el componente padre para forzar unmount/remount completo.

### Matrices de sesgo
La misma lógica se usa en Sesión y Validar:
```
Diario Alta  → Alcista (sin importar H4)
Diario Baja  → Bajista (sin importar H4)
Diario Media + H4 Baja  → Bajista
Diario Media + H4 otro  → Alcista
```

### Gestión auto-calculada
```
risk = abs(entrada - sl)
tp   = entrada + 2*risk  (Alcista)
tp   = entrada - 2*risk  (Bajista)
rr   = abs(tp - entrada) / risk
```

### Edge Functions — Finnhub + Claude
- Todas las API keys se mantienen en Edge Functions (Deno), nunca en el frontend
- `Promise.allSettled` para fetches paralelos que pueden fallar (Finnhub)
- `Promise.all` para fetches que se espera que funcionen (quotes básicos)
- Claude recibe datos pre-procesados (OHLC → pivotes calculados), no datos crudos

---

## 7. Schema de Base de Datos

### Proyecto Supabase: `ymosnytxyveedpsubdke`
Compartido con `centro-operaciones-orz`. Las tablas a continuación:

### Tabla: `briefings` (existente, creada por centro-operaciones-orz)
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID NOT NULL REFERENCES auth.users(id)
fecha         DATE NOT NULL
narrativa     TEXT
condicion     TEXT   -- 'risk_on' | 'risk_off' | 'mixto'
sesgo_nas100  TEXT   -- solo la dirección ('alcista'|'bajista'), razon se pierde
sesgo_xauusd  TEXT
eventos       JSONB  -- array de {hora, evento, impacto}
correlaciones JSONB  -- {dxy: string, vix: string, us10y: string}
zonas_clave   JSONB  -- {nas100: {soporte, resistencia}, xauusd: {...}}
plan_accion   JSONB  -- {buscar: string[], evitar: string[]}
created_at    TIMESTAMPTZ DEFAULT NOW()
```
*Nota: no tiene constraint UNIQUE(user_id, fecha) — puede haber múltiples briefings por día si se regenera.*

### Tabla: `session_reviews` (existente, usada por /evaluacion)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES auth.users(id)
fecha           DATE NOT NULL
total_trades    INTEGER (o JSONB en algunos campos)
win_rate        NUMERIC (o JSONB)
rr_promedio     NUMERIC (o JSONB)
pnl             NUMERIC (o JSONB)
errores         JSONB  -- array de strings
patrones_positivos JSONB  -- array de strings
patrones_negativos JSONB  -- array de strings
accion_manana   TEXT (o JSONB)
created_at      TIMESTAMPTZ DEFAULT NOW()
```
*Nota: algunos campos pueden ser objetos `{error, costo_estimado}` en lugar de números — hay helpers `toNum()`, `toStr()` en EvaluacionClient para manejar esto.*

### Tabla: `trades` (NUEVA — SQL pendiente de ejecutar)
```sql
-- SQL disponible en app/sesion/SesionClient.tsx (comentario al inicio)
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE

-- Contexto
activo              TEXT NOT NULL CHECK (activo IN ('XAUUSD', 'NAS100'))
sesion              TEXT NOT NULL CHECK (sesion IN ('Londres', 'Nueva York', 'Overlap'))
fecha_entrada       TIMESTAMPTZ NOT NULL DEFAULT NOW()
zona_diario         TEXT NOT NULL CHECK (zona_diario IN ('Baja', 'Media', 'Alta'))
zona_h4             TEXT NOT NULL CHECK (zona_h4 IN ('Baja', 'Media', 'Alta'))
sesgo               TEXT NOT NULL CHECK (sesgo IN ('Alcista', 'Bajista'))

-- Setup
tipo_vela           TEXT NOT NULL CHECK (tipo_vela IN ('V85 alcista', 'V85 bajista'))
trigger             TEXT NOT NULL CHECK (trigger IN ('T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación'))
t1_fallido_previo   BOOLEAN NOT NULL DEFAULT FALSE

-- Gestión
precio_entrada      NUMERIC NOT NULL
stop_loss           NUMERIC NOT NULL
take_profit         NUMERIC NOT NULL
resultado           TEXT CHECK (resultado IN ('Win', 'Loss', 'Breakeven'))
r_obtenido          NUMERIC

-- Disciplina
siguio_reglas       BOOLEAN NOT NULL DEFAULT TRUE
regla_rota          TEXT
emocion             TEXT NOT NULL CHECK (emocion IN ('Tranquilo', 'Ansioso', 'Revanchista', 'Sobreconfiado', 'Con miedo'))
notas               TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()

-- RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Tablas adicionales (existentes, usadas por centro-operaciones-orz)
- `trade_executions` — tabla vieja de trades (el módulo Sesión migró a `trades`)
- `trade_setups` — setups validados
- `discipline_logs` — registros de disciplina

---

## 8. Variables de Entorno

### Frontend (`.env.local`, expuestas al browser — `NEXT_PUBLIC_`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Edge Functions (Supabase Secrets — nunca en frontend)
```
SB_URL               (URL del proyecto Supabase)
SUPABASE_ANON_KEY    (anon key de Supabase)
ANTHROPIC_API_KEY    (para llamadas a Claude API)
FINNHUB_API_KEY      (para datos de mercado — tier gratuito tiene límites)
```

**Importante:** `FINNHUB_API_KEY` se configuró recientemente con:
```bash
npx supabase secrets set FINNHUB_API_KEY=<valor> --project-ref ymosnytxyveedpsubdke
```
(requería `supabase login` — puede o no estar activo dependiendo del auth del CLI)

---

## 9. Componentes Principales

### `components/Sidebar.tsx`
- Client Component (`'use client'`)
- Ancho fijo 260px, posición `fixed left-0`
- Logo "ORZ" bold 26px en `#1A9BD7`
- 5 nav links: Briefing / Validar / Sesión / Evaluación / Chat
- Active state: `className={nav-item${isActive ? ' active' : ''}}`
- Logout: `supabase.auth.signOut()` + `router.push('/login')` + `router.refresh()`
- Usa CSS classes del design system (`.sidebar`, `.nav-item`, `.nav-item.active`)

### `components/TradingViewChart.tsx`
- Client Component, usa `useEffect` + `useRef`
- Props: `symbol`, `interval` (default "15"), `height` (default 500), `hideTopToolbar`
- Script: `embed-widget-advanced-chart.js`
- Config: theme dark, locale es, timezone America/New_York
- Cleanup: `container.innerHTML = ''` en return del useEffect
- Para símbolo dinámico: usar `key={symbol}` en el padre

### `components/TradingViewMiniChart.tsx`
- Props: `symbol`, `height` (default 220), `dateRange` (default "1D")
- Script: `embed-widget-mini-symbol-overview.js`
- Config: colorTheme dark, isTransparent true

### `components/TradingViewTechnicalAnalysis.tsx`
- Props: `symbol`, `interval` (default "15m"), `height` (default 425)
- Script: `embed-widget-technical-analysis.js`
- Config: showIntervalTabs true, displayMode single

### `components/TradingViewEconomicCalendar.tsx`
- Props: `height` (default 400), `countryFilter` (default "us,eu,jp"), `importanceFilter`
- Script: `embed-widget-events.js`

### `app/layout.tsx`
- Server Component (puede leer `cookies()`)
- Importa `GeistSans` de `geist/font/sans`
- Detecta sesión sin red: `cookieStore.getAll().some(c => c.name.startsWith('sb-'))`
- Si hasSession: renderiza `<div className="app-shell"><Sidebar /><main className="app-main">{children}</main></div>`
- Si no: renderiza solo `{children}` (página de login)

### `middleware.ts`
- Usa `createServerClient` de `@supabase/ssr`
- Refresca sesión en cada request (obligatorio)
- `/login` con sesión activa → redirect a `/briefing`
- Cualquier ruta sin sesión → redirect a `/login`
- Matcher excluye archivos estáticos

### Edge Function `generate-briefing` (en centro-operaciones-orz)
- Obtiene 6 cotizaciones spot (XAUUSD, NAS100, SPX500, DXY, VIX, US10Y) en paralelo
- Obtiene candles OHLC diarios (35 días) para 5 símbolos con `Promise.allSettled`
- Calcula: pivotes clásicos (PP/R1/R2/S1/S2), ATR(14), swing H/L 5D, variación día
- Construye user message estructurado con todos los datos
- Llama a Claude `claude-sonnet-4-20250514` (max_tokens: 1400)
- System prompt exige precios concretos en zonas_clave (no frases genéricas)
- Guarda en `briefings` y devuelve `{briefing, parsed, technicalData}`

### `app/briefing/BriefingClient.tsx`
- Maneja respuesta con union types: `sesgo_nas100: string | SesgoObj | null`
- `sesgoTexto()` normaliza string vs objeto
- Correlaciones: objeto → key-value list / string → párrafo
- Eventos: array de `string | EventoObj` → renderiza `hora | evento | impacto badge`
- Zonas clave: objeto nested `{nas100: {soporte, resistencia}}`
- Secciones TV al final: 2 charts + 2 TA + 1 calendar

### `app/validar/ValidarClient.tsx`
- 7 reglas de validación interna (4 críticas, 3 importantes)
- Clasificación A+/A/B/C con puntuación numérica
- Barra de progreso animada
- Checklist con íconos ✓/◐/✗ y badge "crítica"
- Botón doble: validación local + análisis IA (Edge Function)
- TradingView Chart dinámico (key={activo})

### `app/sesion/SesionClient.tsx`
- 4 secciones con auto-cálculos reactivos
- MiniChart entre Contexto y Setup (key={activo})
- Lista de trades del día al fondo con resumen compacto

---

## 10. Lo Que Falta Por Construir

### 🔴 Crítico (bloqueante)

1. **Crear tabla `trades` en Supabase**
   - SQL disponible en comentario de `app/sesion/SesionClient.tsx`
   - Sin esto, el módulo Sesión no puede guardar trades

2. **Desplegar Edge Function `generate-briefing` actualizada**
   - La versión con OHLC + pivotes clásicos + `Promise.allSettled` está escrita pero no desplegada
   - Comando: `npx supabase functions deploy generate-briefing --project-ref ymosnytxyveedpsubdke`
   - Requiere `supabase login` primero

3. **Alinear `condicion` entre EF y frontend**
   - EF genera: `risk_on` / `risk_off` / `mixto`
   - Frontend tiene colores para: `favorable` / `neutral` / `adverso` / `mixto`
   - Opciones: cambiar EF para usar favorable/adverso, o añadir colores en BriefingClient

### 🟡 Importante (mejora significativa)

4. **Conectar `/evaluacion` con tabla `trades`**
   - La Edge Function `evaluate-session` probablemente lee `trade_executions` (tabla vieja)
   - Necesita actualizarse para leer de la nueva tabla `trades`
   - O bien: el módulo Sesión debería seguir usando `trade_executions` para compatibilidad

5. **Persistencia del chat**
   - Chat Mentor no guarda historial
   - Crear tabla `chat_messages` o similar, cargar en Server Component

6. **`chat/page.tsx` refactor a Server + Client**
   - Actualmente todo es Client Component
   - Debería tener Server Component con auth + userId, igual que los otros módulos

7. **Guardar setups validados**
   - ValidarClient hace validación pero no persiste en DB
   - Podría guardar en `trade_setups` cuando la clasificación es A o A+

8. **Historial de trades en `/sesion`**
   - Solo muestra trades de hoy
   - Sería útil ver historial de días anteriores

### 🟢 Mejoras deseables

9. **Dashboard / página principal con métricas**
   - La ruta `/` solo hace redirect a `/briefing`
   - Una página de inicio con KPIs del período (win rate, R promedio, racha) sería valioso

10. **Filtros en `/evaluacion`**
    - Historial muestra las últimas 10 evaluaciones sin filtros
    - Filtrar por fecha, activo, resultado

11. **Perfil de usuario / configuración**
    - No existe página de perfil
    - Útil para: cambiar email/contraseña, preferencias de activo default

12. **Roles admin/estudiante**
    - CLAUDE.md menciona roles pero no están implementados
    - Admin debería ver datos de todos los usuarios

13. **PWA / notificaciones**
    - La app es una web app; no hay notificaciones push
    - Útil para alertas de eventos económicos de alto impacto

14. **Integración con más datos Finnhub**
    - NAS100 spot quote (OANDA:NAS100_USD) no retorna data en tier gratuito según pruebas
    - Considerar alternativa: Yahoo Finance API o datos manuales

---

## Notas Adicionales para el Asesor

### Repositorios
- **Frontend:** `https://github.com/ThomasOrz/orz-management` (remote `origin`)
- **Frontend (alternativo):** `https://github.com/ThomasOrz/orz-management-app` (remote `app`)
- **Edge Functions:** En `~/Desktop/centro-operaciones-orz` (no tiene remote explícito documentado aquí)

### Símbolos TradingView usados
```
NAS100  → OANDA:NAS100USD
XAUUSD  → OANDA:XAUUSD
DXY     → TVC:DXY
VIX     → TVC:VIX
US10Y   → TVC:US10Y
SPX500  → OANDA:SPX500USD
```

### Símbolos Finnhub usados
```
XAUUSD  → OANDA:XAU_USD
NAS100  → OANDA:NAS100_USD  (puede retornar null en tier gratuito)
SPX500  → OANDA:SPX500_USD  (puede retornar null en tier gratuito)
DXY     → TVC:DXY           (puede retornar null en tier gratuito)
VIX     → CBOE:VIX          (puede retornar null en tier gratuito)
US10Y   → TVC:US10Y         (puede retornar null en tier gratuito)
```

### Patrones de código establecidos
- Server Pages: auth check + data fetch → pass props to Client
- Client Components: `'use client'` + `useState` + `useEffect`
- Supabase calls: client-side usan `createClient()` del browser client
- Edge Function calls: siempre con `Authorization: Bearer ${session.access_token}`
- Inline styles como mecanismo primario para colores dinámicos
- CSS classes del design system para layout estructural
- `key={symbol}` en componentes TradingView para forzar re-mount al cambiar símbolo

### Metodología ORZ (contexto de negocio)
- **V85:** Vela de 85 pips/puntos — estructura técnica clave
- **T1 / T2 / T3:** Tipos de trigger de entrada
  - T1 = V85 + V50 (vela de 50 — más agresivo)
  - T2 = V85 solo (conservador)
  - T3 = V85 + EMAs alineadas (con filtro tendencial)
- **Regla post-pérdida:** Después de un T1 fallido, solo se pueden usar T2 o T3
- **Sesgo:** Determinado por la posición en la zona del Diario y H4
- **RR mínimo:** 1:2 (arriesgar 1 para ganar 2)
- **EMAs:** 8, 20, 40, 200 — deben estar alineadas con el sesgo para confluencia máxima
- **Clasificación de setup:** A+ (óptimo) → A (sólido) → B (aceptable) → C (no operar)
