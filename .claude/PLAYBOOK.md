# Playbook de ejecución

## Flujo estándar para cualquier tarea
1. Leer .claude/CONTEXT.md
2. Leer .claude/MODULE_STATUS.md
3. Diagnóstico (lectura de archivos relevantes, sin tocar nada)
4. Plan: top fixes priorizados
5. Esperar OK del usuario
6. Ejecutar fixes uno a uno
7. npm run build
8. Si OK: commit con mensaje semántico
9. git push origin main && git push app main
10. Actualizar .claude/MODULE_STATUS.md
11. Confirmar "deploy completo" + qué módulo quedó cerrado

## Convención de commits
feat(módulo): cuando agrega funcionalidad
fix(módulo): cuando arregla bug
chore(módulo): cuando es housekeeping
refactor(módulo): cuando reescribe sin cambiar comportamiento

## Cuando un fix requiere migración Supabase
1. Crear archivo en supabase/migrations/ con timestamp
2. Pedirle a Thomas que la corra en SQL Editor
3. Esperar confirmación antes de tocar código que dependa

## Cuando un fix requiere redeploy de Edge Function
Comando:
supabase functions deploy NOMBRE --no-verify-jwt --project-ref ymosnytxyveedpsubdke
