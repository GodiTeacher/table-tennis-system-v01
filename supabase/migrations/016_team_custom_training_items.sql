alter table public.skills add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.skills add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.skills add column if not exists is_custom boolean not null default false;
alter table public.skills add column if not exists recommended_levels text[] not null default '{}';

create index if not exists skills_team_id_idx on public.skills(team_id);

alter table public.skills enable row level security;
drop policy if exists "skills readable by everyone" on public.skills;
drop policy if exists "skills system or team readable" on public.skills;
drop policy if exists "team members create custom skills" on public.skills;
drop policy if exists "team members update custom skills" on public.skills;
drop policy if exists "team members delete custom skills" on public.skills;

create policy "skills system or team readable" on public.skills
for select using (
  (team_id is null and is_active = true)
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = skills.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "team members create custom skills" on public.skills
for insert with check (
  is_custom = true
  and team_id is not null
  and created_by = auth.uid()
  and exists (
    select 1 from public.team_members tm
    where tm.team_id = skills.team_id and tm.user_id = auth.uid()
  )
);

create policy "team members update custom skills" on public.skills
for update using (
  is_custom = true
  and team_id is not null
  and exists (
    select 1 from public.team_members tm
    where tm.team_id = skills.team_id and tm.user_id = auth.uid()
  )
) with check (
  is_custom = true
  and team_id is not null
  and exists (
    select 1 from public.team_members tm
    where tm.team_id = skills.team_id and tm.user_id = auth.uid()
  )
);

create policy "team members delete custom skills" on public.skills
for delete using (
  is_custom = true
  and team_id is not null
  and exists (
    select 1 from public.team_members tm
    where tm.team_id = skills.team_id and tm.user_id = auth.uid()
  )
);
