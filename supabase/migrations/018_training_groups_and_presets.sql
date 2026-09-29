create table if not exists public.training_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(team_id, name)
);

alter table public.students add column if not exists training_group_id uuid references public.training_groups(id) on delete set null;

create table if not exists public.skill_training_groups (
  skill_id text not null references public.skills(id) on delete cascade,
  group_id uuid not null references public.training_groups(id) on delete cascade,
  primary key(skill_id, group_id)
);

create table if not exists public.group_training_presets (
  group_id uuid not null references public.training_groups(id) on delete cascade,
  skill_id text not null references public.skills(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(group_id, skill_id)
);

alter table public.training_groups enable row level security;
alter table public.skill_training_groups enable row level security;
alter table public.group_training_presets enable row level security;

drop policy if exists "team members read training groups" on public.training_groups;
create policy "team members read training groups" on public.training_groups for select using (team_id = public.current_team_id());
drop policy if exists "team members manage training groups" on public.training_groups;
create policy "team members manage training groups" on public.training_groups for all using (team_id = public.current_team_id()) with check (team_id = public.current_team_id());

drop policy if exists "team members read skill groups" on public.skill_training_groups;
create policy "team members read skill groups" on public.skill_training_groups for select using (exists (select 1 from public.training_groups g where g.id = group_id and g.team_id = public.current_team_id()));
drop policy if exists "team members manage skill groups" on public.skill_training_groups;
create policy "team members manage skill groups" on public.skill_training_groups for all using (exists (select 1 from public.training_groups g where g.id = group_id and g.team_id = public.current_team_id())) with check (exists (select 1 from public.training_groups g where g.id = group_id and g.team_id = public.current_team_id()));

drop policy if exists "team members read group presets" on public.group_training_presets;
create policy "team members read group presets" on public.group_training_presets for select using (exists (select 1 from public.training_groups g where g.id=group_id and g.team_id=public.current_team_id()));
drop policy if exists "team members manage group presets" on public.group_training_presets;
create policy "team members manage group presets" on public.group_training_presets for all using (exists (select 1 from public.training_groups g where g.id=group_id and g.team_id=public.current_team_id())) with check (exists (select 1 from public.training_groups g where g.id=group_id and g.team_id=public.current_team_id()));

insert into public.training_groups(team_id,name,sort_order)
select t.id, v.name, v.sort_order from public.teams t
cross join (values ('A組',1),('B組',2),('C組',3)) as v(name,sort_order)
on conflict (team_id,name) do nothing;
