# ORZ Management — Sistema de Trading

App web independiente para análisis, validación y evaluación de operaciones de trading en NAS100 y XAUUSD. Producto de ORZ Academy.

## Stack
- Next.js 14+ (App Router) / TypeScript / Tailwind CSS
- Supabase (Postgres + Edge Functions + Auth + Storage)
- Vercel (deploy)
- Anthropic Claude API + Finnhub API (via Edge Functions, nunca desde el cliente)

## Supabase compartido
Este proyecto usa el MISMO proyecto de Supabase que centro-operaciones-orz:
- URL: https://ymosnytxyveedpsubdke.supabase.co
- Las tablas briefings, trade_setups, trade_executions, session_reviews, discipline_logs ya existen
- Las Edge Functions ya están desplegadas (generate-briefing, validate-setup, discipline-check, evaluate-session, chat-mentor)

## Roles
- admin (ORZ): ve datos de todos los usuarios
- estudiante: solo ve sus propios datos

## Comandos
npm run dev — servidor local
npm run build — build de producción

## Reglas
- TypeScript strict, nunca usar any
- API keys NUNCA en el frontend
- Paleta: fondo oscuro #0a0a0a, texto blanco, azul #1A9BD7
- Toda la app en español

## Lessons learned
(Agregar errores y correcciones aquí)
