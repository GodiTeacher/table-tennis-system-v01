create table if not exists public.equipment_guide_prices (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  guide_kind text not null check (guide_kind in ('rubber','blade')),
  item_key text not null,
  min_price integer not null default 0 check (min_price >= 0),
  max_price integer not null default 0 check (max_price >= 0),
  currency text not null default 'TWD',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(team_id, guide_kind, item_key),
  check (max_price >= min_price)
);

create index if not exists equipment_guide_prices_team_idx on public.equipment_guide_prices(team_id, guide_kind, item_key);
alter table public.equipment_guide_prices enable row level security;

drop policy if exists equipment_guide_prices_select on public.equipment_guide_prices;
create policy equipment_guide_prices_select on public.equipment_guide_prices for select using (team_id = public.current_team_id());

drop policy if exists equipment_guide_prices_insert on public.equipment_guide_prices;
create policy equipment_guide_prices_insert on public.equipment_guide_prices for insert with check (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm
    where tm.team_id = public.current_team_id() and tm.user_id = auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
);

drop policy if exists equipment_guide_prices_update on public.equipment_guide_prices;
create policy equipment_guide_prices_update on public.equipment_guide_prices for update using (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm
    where tm.team_id = public.current_team_id() and tm.user_id = auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
) with check (team_id = public.current_team_id());

drop policy if exists equipment_guide_prices_delete on public.equipment_guide_prices;
create policy equipment_guide_prices_delete on public.equipment_guide_prices for delete using (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm
    where tm.team_id = public.current_team_id() and tm.user_id = auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
);

alter table public.profiles drop constraint if exists profiles_theme_preference_check;
alter table public.profiles add constraint profiles_theme_preference_check check (theme_preference in ('current','clean','teaching','competitive','sunset','berry','pingpong','equipment','candy','neon'));

create or replace function public.set_my_theme(target_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_theme not in ('current','clean','teaching','competitive','sunset','berry','pingpong','equipment','candy','neon') then
    raise exception 'Invalid theme';
  end if;
  update public.profiles set theme_preference = target_theme where id = auth.uid();
end;
$$;
