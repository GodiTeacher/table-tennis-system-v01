create table if not exists public.aircon_fee_group_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  group_id uuid not null references public.aircon_fee_groups(id) on delete cascade,
  attendance_template_id uuid not null references public.attendance_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(group_id, attendance_template_id)
);

create index if not exists aircon_fee_group_templates_team_idx
  on public.aircon_fee_group_templates(team_id);
create index if not exists aircon_fee_group_templates_group_idx
  on public.aircon_fee_group_templates(group_id);

alter table public.aircon_fee_group_templates enable row level security;

drop policy if exists aircon_fee_group_templates_select on public.aircon_fee_group_templates;
drop policy if exists aircon_fee_group_templates_write on public.aircon_fee_group_templates;

create policy aircon_fee_group_templates_select
  on public.aircon_fee_group_templates
  for select to authenticated
  using (public.is_team_member(team_id));

create policy aircon_fee_group_templates_write
  on public.aircon_fee_group_templates
  for all to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
