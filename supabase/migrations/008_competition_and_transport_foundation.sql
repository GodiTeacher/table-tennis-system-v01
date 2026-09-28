create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  location text,
  registration_deadline date,
  status text not null default 'planning' check (status in ('planning','open','closed','completed','cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  category text,
  participant_role text not null default 'competitor' check (participant_role in ('competitor','reserve')),
  registration_status text not null default 'planned' check (registration_status in ('planned','confirmed','withdrawn')),
  notes text,
  created_at timestamptz not null default now(),
  unique (competition_id, student_id, category)
);

create table if not exists public.competition_transport_vehicles (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  direction text not null default 'both' check (direction in ('outbound','return','both')),
  driver_name text not null,
  driver_type text not null default 'parent' check (driver_type in ('parent','coach','other')),
  contact text,
  capacity integer not null check (capacity >= 1),
  vehicle_note text,
  estimated_cost numeric(10,2) not null default 0 check (estimated_cost >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_transport_assignments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.competition_transport_vehicles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (vehicle_id, student_id)
);

create table if not exists public.competition_expenses (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  expense_type text not null default 'other' check (expense_type in ('fuel','parking','toll','registration','meal','other')),
  description text,
  amount numeric(10,2) not null check (amount >= 0),
  paid_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_payments (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  student_id uuid references public.students(id) on delete restrict,
  purpose text not null default 'transport' check (purpose in ('transport','registration','meal','equipment','other')),
  amount_due numeric(10,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  payee text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','waived')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.competitions enable row level security;
alter table public.competition_participants enable row level security;
alter table public.competition_transport_vehicles enable row level security;
alter table public.competition_transport_assignments enable row level security;
alter table public.competition_expenses enable row level security;
alter table public.competition_payments enable row level security;

create policy "coach_admin_manage_competitions" on public.competitions for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin')));
create policy "coach_admin_manage_competition_participants" on public.competition_participants for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin')));
create policy "coach_admin_manage_transport_vehicles" on public.competition_transport_vehicles for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin')));
create policy "coach_admin_manage_transport_assignments" on public.competition_transport_assignments for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin')));
create policy "coach_admin_manage_competition_expenses" on public.competition_expenses for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin')));
create policy "coach_admin_manage_competition_payments" on public.competition_payments for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach','admin')));

create index if not exists competition_participants_competition_idx on public.competition_participants(competition_id);
create index if not exists competition_transport_vehicles_competition_idx on public.competition_transport_vehicles(competition_id);
create index if not exists competition_transport_assignments_vehicle_idx on public.competition_transport_assignments(vehicle_id);
create index if not exists competition_expenses_competition_idx on public.competition_expenses(competition_id);
create index if not exists competition_payments_competition_idx on public.competition_payments(competition_id);
