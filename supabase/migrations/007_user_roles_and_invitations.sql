-- ─────────────────────────────────────────────────────────────────────────
-- 007_user_roles_and_invitations.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Sistema multi-usuario:
--   • profiles: tabla de perfiles con role ('admin' | 'student')
--   • invitation_codes: códigos únicos para auto-registro (auto-expiran 7d)
--   • Trigger handle_new_user: crea profile automáticamente al crear user
-- ─────────────────────────────────────────────────────────────────────────

-- ── Tabla de perfiles con roles ──────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('admin', 'student')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Tabla de códigos de invitación ───────────────────────────────────────
create table if not exists public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text,
  full_name text,
  created_by uuid references auth.users on delete set null,
  used_by uuid references auth.users on delete set null,
  used_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.invitation_codes enable row level security;

drop policy if exists "Admins can view all codes" on public.invitation_codes;
create policy "Admins can view all codes" on public.invitation_codes
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can insert codes" on public.invitation_codes;
create policy "Admins can insert codes" on public.invitation_codes
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can delete codes" on public.invitation_codes;
create policy "Admins can delete codes" on public.invitation_codes
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Permite VALIDAR un código sin estar autenticado (para registro público)
drop policy if exists "Anyone can read code for validation" on public.invitation_codes;
create policy "Anyone can read code for validation" on public.invitation_codes
  for select using (used_at is null and expires_at > now());

-- Permite que cualquiera (incluyendo recién registrado) marque su código
-- como usado, validando que aún esté libre
drop policy if exists "Authenticated can mark own code used" on public.invitation_codes;
create policy "Authenticated can mark own code used" on public.invitation_codes
  for update using (used_at is null and expires_at > now())
  with check (used_by = auth.uid());

-- ── Trigger: crear profile automáticamente al crear user ─────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Trigger: updated_at automático ───────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ── Grants ───────────────────────────────────────────────────────────────
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
grant all on table public.invitation_codes to authenticated;
grant all on table public.invitation_codes to service_role;
