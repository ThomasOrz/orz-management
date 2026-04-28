-- ─────────────────────────────────────────────────────────────────────────
-- 009_capital_tracking.sql — Gestión de capital estilo prop firm
-- ─────────────────────────────────────────────────────────────────────────

-- Cuenta de trading (1 por trader)
create table public.trading_account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,

  -- Capital
  capital_inicial numeric not null,
  capital_actual numeric not null,
  divisa text default 'USD',

  -- Tipo de cuenta
  tipo_cuenta text not null default 'personal'
    check (tipo_cuenta in ('personal', 'ftmo', 'fundednext', 'myforexfunds', 'topstep', 'otra')),
  nombre_broker text,

  -- Reglas prop firm (todas opcionales)
  limite_diario_pct numeric,
  limite_total_pct  numeric,
  profit_target_pct numeric,
  dias_minimos      int,
  fecha_inicio      date,
  fecha_limite      date,

  -- Riesgo por trade
  riesgo_default_pct numeric default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trading_account enable row level security;

create policy "Users see own account" on public.trading_account
  for select using (auth.uid() = user_id);

create policy "Users insert own account" on public.trading_account
  for insert with check (auth.uid() = user_id);

create policy "Users update own account" on public.trading_account
  for update using (auth.uid() = user_id);

-- Admin ve todas las cuentas
create policy "Admins see all accounts" on public.trading_account
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create trigger on_trading_account_updated
  before update on public.trading_account
  for each row execute function public.handle_updated_at();

grant all on table public.trading_account to authenticated;
grant all on table public.trading_account to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Movimientos de capital (depósitos, retiros, ajustes, trade PnL)
-- ─────────────────────────────────────────────────────────────────────────
create table public.capital_movements (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references auth.users on delete cascade not null,
  tipo     text not null check (tipo in ('deposito', 'retiro', 'ajuste', 'trade_pnl')),
  monto    numeric not null,
  trade_id uuid references public.trades on delete set null,
  nota     text,
  fecha    timestamptz not null default now()
);

alter table public.capital_movements enable row level security;

create policy "Users see own movements" on public.capital_movements
  for select using (auth.uid() = user_id);

create policy "Users insert own movements" on public.capital_movements
  for insert with check (auth.uid() = user_id);

create policy "Users delete own movements" on public.capital_movements
  for delete using (auth.uid() = user_id);

-- Admin ve todos los movimientos
create policy "Admins see all movements" on public.capital_movements
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index capital_movements_user_idx on public.capital_movements(user_id, fecha desc);

grant all on table public.capital_movements to authenticated;
grant all on table public.capital_movements to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Añadir columnas de capital a trades
-- ─────────────────────────────────────────────────────────────────────────
alter table public.trades add column if not exists riesgo_usd numeric;
alter table public.trades add column if not exists pnl_usd    numeric;

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: cuando un trade se cierra, crear movimiento y actualizar capital
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_trade_pnl()
returns trigger as $$
declare
  pnl numeric;
begin
  -- Solo cuando el trade pasa de abierto (sin resultado) a cerrado con riesgo_usd
  if NEW.resultado is not null
     and NEW.r_obtenido is not null
     and NEW.riesgo_usd is not null
     and (OLD.resultado is null or OLD.r_obtenido is null)
  then
    pnl := NEW.r_obtenido * NEW.riesgo_usd;
    NEW.pnl_usd := pnl;

    insert into public.capital_movements (user_id, tipo, monto, trade_id, nota)
    values (NEW.user_id, 'trade_pnl', pnl, NEW.id,
            'Trade ' || NEW.activo || ' ' || NEW.resultado);

    update public.trading_account
    set capital_actual = capital_actual + pnl
    where user_id = NEW.user_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_trade_closed_pnl on public.trades;
create trigger on_trade_closed_pnl
  before update on public.trades
  for each row execute function public.handle_trade_pnl();

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: movimiento manual → actualizar capital_actual
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_capital_movement()
returns trigger as $$
begin
  if NEW.tipo in ('deposito', 'retiro', 'ajuste') then
    update public.trading_account
    set capital_actual = capital_actual + NEW.monto
    where user_id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_capital_movement on public.capital_movements;
create trigger on_capital_movement
  after insert on public.capital_movements
  for each row execute function public.handle_capital_movement();
