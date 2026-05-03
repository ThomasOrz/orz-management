# ORZ Management — Contexto Permanente

## Stack
Next.js 14.2.35 · TypeScript estricto · Supabase (proyecto ymosnytxyveedpsubdke) · Anthropic API · Vercel
Repo: github.com/ThomasOrz/orz-management
Remotes: origin + app (push manual a AMBOS siempre)
Producción: manage.orzacademy.com

## Reglas no negociables
- TypeScript estricto, nunca any
- Build OK antes de commit
- Push a ambos remotes siempre
- No tocar nada fuera del scope de la tarea
- Reportar edge cases pero NO arreglarlos sin pedir
- Confirmar plan antes de ejecutar fixes
- Diagnóstico → plan → ejecutar (con OK del usuario entre cada paso)

## Metodología ORZ (la app DEBE respetar)
V85: rango ≥ ATR(14)×1.5 + cuerpo ≥ 65%
V50: pin bar / vela con cola / hammer
Triggers: T1 (high V50), T2 (high V85), T3 (T2 + cruce 4 EMAs)
EMAs: 8, 20, 40, 200
RR fijo 1:2 siempre
Pre-operativo: doble rango Daily + H4 → sesgo del día
Si T1 falla → siguiente solo T2/T3
V85 consecutivas confirman pero no triggerean nuevas

## Roles
admin (ORZ): ve datos de todos los usuarios
estudiante: solo ve sus propios datos

## Cuenta prop firm activa
MFFU 50K Builder · Tradovate · MNQ only · Trader: Angelo Ramírez Vargas
Reglas: drawdown $750 · max $150/trade · max 2 stops/día
Reparto: 80/20 (Thomas)

## Estilo de respuesta a Thomas
- Conciso, sin preámbulo
- No re-explicar contexto que ya está aquí
- Diagnóstico estructurado en tabla cuando aplique
- Top fixes priorizados por impacto
- Comandos exactos para ejecutar

## Quien es Thomas
Founder ORZ Academy. NO es programador. Decide y aprueba, no codea.
Su socio estratégico (Claude web) le pasa los prompts ya armados.
Trabaja en paralelo: Claude Code (terminal) + Claude web (planificación).
