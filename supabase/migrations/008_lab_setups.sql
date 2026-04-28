create table public.lab_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,

  -- Hipótesis
  nombre text not null,
  descripcion text,
  logica_esperada text,

  -- Condiciones de entrada (filtros de match)
  activos text[] default '{}',
  sesiones text[] default '{}',
  triggers text[] default '{}',
  zonas text[] default '{}',
  sesgo text check (sesgo in ('long', 'short', 'ambos')),
  emociones_permitidas text[] default '{}',
  timeframe text,
  confluencias_requeridas text,

  -- Gestión de riesgo
  rr_objetivo numeric default 2,
  riesgo_pct numeric default 1,
  reglas_stop text,
  reglas_tp text,
  reglas_breakeven text,

  -- Reglas de invalidación
  reglas_invalidacion text,
  max_trades_dia int,

  -- Estado
  estado text not null default 'draft' check (estado in ('draft', 'testing', 'validated', 'discarded', 'paused')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lab_setups enable row level security;

create policy "Users see own setups" on public.lab_setups
  for select using (auth.uid() = user_id);

create policy "Users insert own setups" on public.lab_setups
  for insert with check (auth.uid() = user_id);

create policy "Users update own setups" on public.lab_setups
  for update using (auth.uid() = user_id);

create policy "Users delete own setups" on public.lab_setups
  for delete using (auth.uid() = user_id);

create index lab_setups_user_idx on public.lab_setups(user_id);
create index lab_setups_estado_idx on public.lab_setups(user_id, estado);

create trigger on_lab_setups_updated
  before update on public.lab_setups
  for each row execute function public.handle_updated_at();

grant all on table public.lab_setups to authenticated;
grant all on table public.lab_setups to service_role;
