create table if not exists public.equipment_guide_preferences (
  team_id uuid not null references public.teams(id) on delete cascade,
  preference_key text not null,
  preference_value text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(team_id, preference_key)
);

alter table public.equipment_guide_preferences enable row level security;

drop policy if exists equipment_guide_preferences_select on public.equipment_guide_preferences;
create policy equipment_guide_preferences_select on public.equipment_guide_preferences for select using (
  team_id = public.current_team_id()
);

drop policy if exists equipment_guide_preferences_insert on public.equipment_guide_preferences;
create policy equipment_guide_preferences_insert on public.equipment_guide_preferences for insert with check (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm where tm.team_id=public.current_team_id() and tm.user_id=auth.uid()
    and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
);

drop policy if exists equipment_guide_preferences_update on public.equipment_guide_preferences;
create policy equipment_guide_preferences_update on public.equipment_guide_preferences for update using (
  team_id = public.current_team_id() and exists (
    select 1 from public.team_members tm where tm.team_id=public.current_team_id() and tm.user_id=auth.uid()
    and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>'equipment')::boolean,false))
  )
) with check (team_id=public.current_team_id());
