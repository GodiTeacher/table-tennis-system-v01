-- Table Tennis System V01 / Supabase initial schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'coach' check (role in ('admin','coach','student','parent')),
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id text primary key,
  domain text not null,
  subcategory text,
  name text not null,
  level text,
  prerequisites text[] not null default '{}',
  goal text,
  observable text,
  training_mode text,
  assessment text,
  pass_draft text,
  parent_text text,
  priority text,
  stage text,
  notes text,
  is_active boolean not null default true
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  session_date date not null default current_date,
  focus_level text not null check (focus_level in ('A','B','C','D','E','F')),
  duration_minutes int not null check (duration_minutes > 0),
  participant_count int not null check (participant_count > 0),
  table_count int not null check (table_count > 0),
  notes text,
  created_at timestamptz not null default now()
);

-- selected training items belong to the session, not to A/B/C/D/E/F.
create table if not exists public.training_session_items (
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  skill_id text not null references public.skills(id),
  sort_order int not null default 0,
  planned_minutes int,
  primary key (session_id, skill_id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.session_students (
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  table_no int,
  group_no int,
  primary key (session_id, student_id)
);

create table if not exists public.student_skill_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  skill_id text not null references public.skills(id),
  level_value int,
  status text default 'learning',
  observation text,
  assessed_at timestamptz not null default now(),
  coach_id uuid references public.profiles(id) on delete set null
);

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_items enable row level security;
alter table public.students enable row level security;
alter table public.session_students enable row level security;
alter table public.student_skill_progress enable row level security;

create policy "skills readable by authenticated"
on public.skills for select to authenticated using (true);

create policy "coach owns sessions"
on public.training_sessions for all to authenticated
using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach owns session items"
on public.training_session_items for all to authenticated
using (exists (
  select 1 from public.training_sessions s
  where s.id = training_session_items.session_id and s.coach_id = auth.uid()
))
with check (exists (
  select 1 from public.training_sessions s
  where s.id = training_session_items.session_id and s.coach_id = auth.uid()
));
