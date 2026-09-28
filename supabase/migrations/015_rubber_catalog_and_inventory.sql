create table if not exists public.rubber_catalog (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  brand text not null,
  model text not null,
  sponge_thickness text,
  color text check (color is null or color in ('red','black','other')),
  sku text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  cost_price numeric(10,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(10,2) not null default 0 check (sale_price >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rubber_catalog_team_idx on public.rubber_catalog(team_id, active, brand, model);

alter table public.rubber_catalog enable row level security;

drop policy if exists rubber_catalog_select on public.rubber_catalog;
create policy rubber_catalog_select on public.rubber_catalog for select using (
  team_id = public.current_team_id()
);

drop policy if exists rubber_catalog_insert on public.rubber_catalog;
create policy rubber_catalog_insert on public.rubber_catalog for insert with check (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm
    where tm.team_id = public.current_team_id() and tm.user_id = auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
);

drop policy if exists rubber_catalog_update on public.rubber_catalog;
create policy rubber_catalog_update on public.rubber_catalog for update using (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm
    where tm.team_id = public.current_team_id() and tm.user_id = auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
) with check (team_id = public.current_team_id());

drop policy if exists rubber_catalog_delete on public.rubber_catalog;
create policy rubber_catalog_delete on public.rubber_catalog for delete using (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm
    where tm.team_id = public.current_team_id() and tm.user_id = auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
);

alter table public.competition_rubber_orders add column if not exists catalog_id uuid references public.rubber_catalog(id) on delete set null;
create index if not exists competition_rubber_orders_catalog_idx on public.competition_rubber_orders(catalog_id);
