-- =====================================================================
--  DESPIERTA MARUJA · Configuración completa de la base de datos
-- ---------------------------------------------------------------------
--  Cómo usarlo:
--    1. En Supabase, abre "SQL Editor" → "New query".
--    2. Pega TODO este archivo y pulsa "Run".
--    3. Después ejecuta 2_autorizar_usuario.sql (ver README).
--
--  Se puede ejecutar más de una vez sin romper nada (es "idempotente"):
--  no borra datos existentes.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Usuarios autorizados (solo la cuenta familiar).
-- Esta tabla NO es accesible desde la app: solo se rellena a mano
-- desde el SQL Editor de Supabase.
create table if not exists public.allowed_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Catálogo de actividades
create table if not exists public.activities (
  id            text primary key check (id ~ '^ACT[0-9]{3,}$'),
  nombre        text not null check (length(trim(nombre)) > 0),
  area          text not null default '',
  modalidad     text not null default 'Acompañada',
  instrucciones text not null default '',
  materiales    text not null default '',
  duracion      text not null default '',
  dificultad    text not null default '',
  capacidades   text not null default '',
  contexto      text not null default 'En casa',
  activa        boolean not null default true,
  objetivo      text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Calendario (actividades programadas y visitas)
create table if not exists public.events (
  id           text primary key default gen_random_uuid()::text,
  fecha        date not null,
  hora         text not null default '',
  activity_id  text references public.activities (id) on delete set null,
  nombre       text not null default 'Visita',
  area         text not null default '',
  modalidad    text not null default 'Acompañada',
  hermana      text not null default '',
  duracion_min integer,
  estado       text not null default 'Pendiente'
               check (estado in ('Pendiente', 'Realizada', 'Cancelada')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists events_fecha_idx on public.events (fecha);

-- Registros de lo que se ha hecho
create table if not exists public.logs (
  id                   text primary key default gen_random_uuid()::text,
  event_id             text references public.events (id) on delete set null,
  activity_id          text references public.activities (id) on delete set null,
  nombre               text not null default '',
  area                 text not null default '',
  modalidad            text not null default '',
  fecha                date not null,
  hermana              text not null default '',
  duracion_real_min    integer,
  realizacion          text not null default 'Completa',
  participacion        text not null default '',
  ayuda                text not null default '',
  dificultad_percibida text not null default '',
  gusto                text not null default '',
  observaciones        text not null default '',   -- PRIVADO: nunca sale en la vista de la madre
  proxima_vez          text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists logs_fecha_idx on public.logs (fecha);

-- Ajustes (una sola fila, id = 1)
create table if not exists public.settings (
  id          integer primary key default 1 check (id = 1),
  share_token text not null default (replace(gen_random_uuid()::text, '-', '') ||
                                     replace(gen_random_uuid()::text, '-', '')),
  hermanas    text[] not null default array['Hermana 1', 'Hermana 2', 'Hermana 3', 'Hermana 4'],
  updated_at  timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 2. FECHA DE ÚLTIMA MODIFICACIÓN AUTOMÁTICA
-- ---------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['activities', 'events', 'logs', 'settings'] loop
    execute format('drop trigger if exists %I_updated on public.%I', t, t);
    execute format('create trigger %I_updated before update on public.%I
                    for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 3. SEGURIDAD (Row Level Security)
--    Solo la cuenta familiar (la que está en allowed_users) puede
--    leer y escribir. El visitante anónimo no ve nada.
-- ---------------------------------------------------------------------

-- ¿Es la persona conectada la cuenta familiar?
create or replace function public.es_familia()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.allowed_users where user_id = auth.uid());
$$;
revoke all on function public.es_familia() from public, anon;
grant execute on function public.es_familia() to authenticated;

alter table public.allowed_users enable row level security;   -- sin políticas: nadie entra desde la app
alter table public.activities    enable row level security;
alter table public.events        enable row level security;
alter table public.logs          enable row level security;
alter table public.settings      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['activities', 'events', 'logs', 'settings'] loop
    execute format('drop policy if exists familia_todo on public.%I', t);
    execute format('create policy familia_todo on public.%I
                    for all to authenticated
                    using (public.es_familia())
                    with check (public.es_familia())', t);
  end loop;
end $$;

-- Quitar cualquier permiso directo al visitante anónimo
revoke all on public.allowed_users, public.activities, public.events,
              public.logs, public.settings from anon;
revoke all on public.allowed_users from authenticated;
grant select, insert, update, delete
  on public.activities, public.events, public.logs to authenticated;
grant select, update on public.settings to authenticated;


-- ---------------------------------------------------------------------
-- 4. VISTA DE LA MADRE (solo lectura, con enlace secreto)
--    Devuelve SOLO: fecha, hora, nombre, modalidad, hermana, estado.
--    Nunca observaciones ni datos de registros.
-- ---------------------------------------------------------------------
create or replace function public.vista_madre(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if p_token is null or length(p_token) < 32 or not exists (
       select 1 from public.settings where id = 1 and share_token = p_token) then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'hoy', hoy,
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'fecha', e.fecha, 'hora', e.hora, 'nombre', e.nombre,
               'modalidad', e.modalidad, 'hermana', e.hermana, 'estado', e.estado)
             order by e.fecha, e.hora)
      from public.events e
      where e.fecha between hoy - 14 and hoy + 45
        and e.estado <> 'Cancelada'
    ), '[]'::jsonb)
  );
end $$;
revoke all on function public.vista_madre(text) from public;
grant execute on function public.vista_madre(text) to anon, authenticated;

-- Cambiar el enlace de la madre (el antiguo deja de funcionar al instante)
create or replace function public.regenerar_enlace()
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare nuevo text;
begin
  if not public.es_familia() then
    raise exception 'No autorizado';
  end if;
  nuevo := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  update public.settings set share_token = nuevo where id = 1;
  return nuevo;
end $$;
revoke all on function public.regenerar_enlace() from public, anon;
grant execute on function public.regenerar_enlace() to authenticated;


-- ---------------------------------------------------------------------
-- 5. SINCRONIZACIÓN EN TIEMPO REAL
--    (los cambios aparecen solos en los demás dispositivos)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['activities', 'events', 'logs', 'settings'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
