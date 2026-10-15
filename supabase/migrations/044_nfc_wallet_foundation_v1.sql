-- NFC Wallet V1 foundation
-- Integrates with existing teams / students / team_members / subscription plans.

update public.subscription_plans
set features = jsonb_set(features, '{nfc_wallet}', to_jsonb(code='pro'), true),
    updated_at = now()
where code in ('free','pro');

alter table public.team_members
alter column permissions set default
'{"students":true,"training":true,"equipment":true,"transport":true,"assessment":true,"competitions":true,"wallet_view":true,"wallet_charge":true,"wallet_top_up":false,"wallet_reverse":false,"wallet_reports":false,"nfc_manage":false}'::jsonb;

update public.team_members
set permissions =
  permissions
  || jsonb_build_object(
    'wallet_view', coalesce((permissions->>'wallet_view')::boolean,true),
    'wallet_charge', coalesce((permissions->>'wallet_charge')::boolean,true),
    'wallet_top_up', coalesce((permissions->>'wallet_top_up')::boolean,false),
    'wallet_reverse', coalesce((permissions->>'wallet_reverse')::boolean,false),
    'wallet_reports', coalesce((permissions->>'wallet_reports')::boolean,false),
    'nfc_manage', coalesce((permissions->>'nfc_manage')::boolean,false)
  );

create table public.wallet_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  category_type text not null default 'charge' check (category_type in ('charge','top_up')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id,name,category_type)
);

create table public.student_wallets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  currency text not null default 'TWD' check (currency='TWD'),
  balance numeric(12,2) not null default 0 check (balance >= 0),
  total_top_up numeric(12,2) not null default 0 check (total_top_up >= 0),
  total_charge numeric(12,2) not null default 0 check (total_charge >= 0),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id,student_id)
);

create table public.nfc_cards (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  token_hash text not null unique,
  card_label text,
  status text not null default 'active' check (status in ('active','lost','disabled','replaced')),
  issued_at timestamptz not null default now(),
  disabled_at timestamptz,
  replaced_by uuid references public.nfc_cards(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index nfc_cards_one_active_per_student on public.nfc_cards(team_id,student_id) where status='active';

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_no bigint generated always as identity unique,
  team_id uuid not null references public.teams(id) on delete restrict,
  wallet_id uuid not null references public.student_wallets(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('top_up','charge','refund','reversal','adjustment')),
  amount numeric(12,2) not null check (amount > 0),
  balance_before numeric(12,2) not null check (balance_before >= 0),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  category_id uuid references public.wallet_categories(id) on delete set null,
  payment_method text check (payment_method is null or payment_method in ('cash','transfer','other')),
  note text,
  operator_user_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key text not null,
  reversal_of uuid references public.wallet_transactions(id) on delete restrict,
  status text not null default 'posted' check (status in ('posted','reversed')),
  created_at timestamptz not null default now(),
  unique(team_id,idempotency_key)
);

create unique index wallet_transactions_one_reversal on public.wallet_transactions(reversal_of) where reversal_of is not null;
create index wallet_transactions_team_created_idx on public.wallet_transactions(team_id,created_at desc);
create index wallet_transactions_student_created_idx on public.wallet_transactions(student_id,created_at desc);

create table public.wallet_audit_logs (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete restrict,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wallet_audit_logs_team_created_idx on public.wallet_audit_logs(team_id,created_at desc);

insert into public.wallet_categories(team_id,name,category_type,sort_order)
select t.id,v.name,'charge',v.sort_order
from public.teams t
cross join (values
  ('球拍',10),('球皮',20),('護邊',30),('訓練用品',40),('課程費用',50),('其他',999)
) as v(name,sort_order)
on conflict(team_id,name,category_type) do nothing;

create or replace function public.create_default_wallet_categories()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.wallet_categories(team_id,name,category_type,sort_order)
  values
    (new.id,'球拍','charge',10),(new.id,'球皮','charge',20),(new.id,'護邊','charge',30),
    (new.id,'訓練用品','charge',40),(new.id,'課程費用','charge',50),(new.id,'其他','charge',999)
  on conflict(team_id,name,category_type) do nothing;
  return new;
end;
$$;

create trigger teams_default_wallet_categories_trigger
after insert on public.teams
for each row execute function public.create_default_wallet_categories();

alter table public.wallet_categories enable row level security;
alter table public.student_wallets enable row level security;
alter table public.nfc_cards enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_audit_logs enable row level security;

create policy wallet_categories_read on public.wallet_categories for select to authenticated using (public.is_team_member(team_id));
create policy wallet_categories_manage on public.wallet_categories for all to authenticated
using (public.team_has_permission(team_id,'nfc_manage'))
with check (public.team_has_permission(team_id,'nfc_manage'));
create policy student_wallets_read on public.student_wallets for select to authenticated using (public.team_has_permission(team_id,'wallet_view'));
create policy nfc_cards_read on public.nfc_cards for select to authenticated
using (public.team_has_permission(team_id,'wallet_view') or public.team_has_permission(team_id,'nfc_manage'));
create policy wallet_transactions_read on public.wallet_transactions for select to authenticated
using (public.team_has_permission(team_id,'wallet_view') or public.team_has_permission(team_id,'wallet_reports'));
create policy wallet_audit_logs_read on public.wallet_audit_logs for select to authenticated using (public.team_has_permission(team_id,'wallet_reports'));

create or replace function public.ensure_student_wallet(target_student uuid)
returns public.student_wallets
language plpgsql security definer set search_path=public as $$
declare
  v_team uuid;
  v_wallet public.student_wallets;
begin
  select s.team_id into v_team from public.students s where s.id=target_student and s.active=true;
  if v_team is null then raise exception 'STUDENT_NOT_FOUND' using errcode='P0002'; end if;
  if not public.is_team_member(v_team) then raise exception 'TEAM_ACCESS_DENIED' using errcode='42501'; end if;
  insert into public.student_wallets(team_id,student_id) values(v_team,target_student)
  on conflict(team_id,student_id) do nothing;
  select * into v_wallet from public.student_wallets where team_id=v_team and student_id=target_student;
  return v_wallet;
end;
$$;

create or replace function public.wallet_top_up(target_student uuid, top_up_amount numeric, payment_method text, note_text text, request_key text)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_team uuid;
  v_wallet public.student_wallets;
  v_tx public.wallet_transactions;
  v_before numeric(12,2);
  v_after numeric(12,2);
begin
  if top_up_amount is null or top_up_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode='22023'; end if;
  if payment_method not in ('cash','transfer','other') then raise exception 'INVALID_PAYMENT_METHOD' using errcode='22023'; end if;
  if nullif(trim(coalesce(request_key,'')),'') is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode='22023'; end if;
  select s.team_id into v_team from public.students s where s.id=target_student and s.active=true;
  if v_team is null then raise exception 'STUDENT_NOT_FOUND' using errcode='P0002'; end if;
  if not public.team_can_use(v_team,'nfc_wallet') then raise exception 'PRO_FEATURE_REQUIRED' using errcode='42501'; end if;
  if not public.team_has_permission(v_team,'wallet_top_up') then raise exception 'WALLET_TOP_UP_DENIED' using errcode='42501'; end if;
  select * into v_tx from public.wallet_transactions where team_id=v_team and idempotency_key=request_key;
  if found then return jsonb_build_object('ok',true,'duplicate',true,'transaction_id',v_tx.id,'transaction_no',v_tx.transaction_no,'balance',v_tx.balance_after); end if;
  insert into public.student_wallets(team_id,student_id) values(v_team,target_student) on conflict(team_id,student_id) do nothing;
  select * into v_wallet from public.student_wallets where team_id=v_team and student_id=target_student for update;
  if v_wallet.status <> 'active' then raise exception 'WALLET_NOT_ACTIVE' using errcode='55000'; end if;
  v_before:=v_wallet.balance; v_after:=v_before+round(top_up_amount,2);
  update public.student_wallets set balance=v_after,total_top_up=total_top_up+round(top_up_amount,2),updated_at=now() where id=v_wallet.id;
  insert into public.wallet_transactions(team_id,wallet_id,student_id,transaction_type,amount,balance_before,balance_after,payment_method,note,operator_user_id,idempotency_key)
  values(v_team,v_wallet.id,target_student,'top_up',round(top_up_amount,2),v_before,v_after,payment_method,nullif(trim(coalesce(note_text,'')),''),auth.uid(),request_key)
  returning * into v_tx;
  insert into public.wallet_audit_logs(team_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_team,auth.uid(),'wallet_top_up','wallet_transaction',v_tx.id,jsonb_build_object('student_id',target_student,'amount',round(top_up_amount,2),'payment_method',payment_method));
  return jsonb_build_object('ok',true,'duplicate',false,'transaction_id',v_tx.id,'transaction_no',v_tx.transaction_no,'balance',v_after);
end;
$$;

create or replace function public.wallet_charge(target_student uuid, charge_amount numeric, target_category uuid, note_text text, request_key text)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_team uuid;
  v_wallet public.student_wallets;
  v_tx public.wallet_transactions;
  v_before numeric(12,2);
  v_after numeric(12,2);
begin
  if charge_amount is null or charge_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode='22023'; end if;
  if nullif(trim(coalesce(request_key,'')),'') is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode='22023'; end if;
  select s.team_id into v_team from public.students s where s.id=target_student and s.active=true;
  if v_team is null then raise exception 'STUDENT_NOT_FOUND' using errcode='P0002'; end if;
  if not public.team_can_use(v_team,'nfc_wallet') then raise exception 'PRO_FEATURE_REQUIRED' using errcode='42501'; end if;
  if not public.team_has_permission(v_team,'wallet_charge') then raise exception 'WALLET_CHARGE_DENIED' using errcode='42501'; end if;
  if target_category is not null and not exists(select 1 from public.wallet_categories c where c.id=target_category and c.team_id=v_team and c.active=true and c.category_type='charge')
  then raise exception 'INVALID_CATEGORY' using errcode='22023'; end if;
  select * into v_tx from public.wallet_transactions where team_id=v_team and idempotency_key=request_key;
  if found then return jsonb_build_object('ok',true,'duplicate',true,'transaction_id',v_tx.id,'transaction_no',v_tx.transaction_no,'balance',v_tx.balance_after); end if;
  insert into public.student_wallets(team_id,student_id) values(v_team,target_student) on conflict(team_id,student_id) do nothing;
  select * into v_wallet from public.student_wallets where team_id=v_team and student_id=target_student for update;
  if v_wallet.status <> 'active' then raise exception 'WALLET_NOT_ACTIVE' using errcode='55000'; end if;
  v_before:=v_wallet.balance;
  if v_before < round(charge_amount,2) then raise exception 'INSUFFICIENT_BALANCE' using errcode='22003'; end if;
  v_after:=v_before-round(charge_amount,2);
  update public.student_wallets set balance=v_after,total_charge=total_charge+round(charge_amount,2),updated_at=now() where id=v_wallet.id;
  insert into public.wallet_transactions(team_id,wallet_id,student_id,transaction_type,amount,balance_before,balance_after,category_id,note,operator_user_id,idempotency_key)
  values(v_team,v_wallet.id,target_student,'charge',round(charge_amount,2),v_before,v_after,target_category,nullif(trim(coalesce(note_text,'')),''),auth.uid(),request_key)
  returning * into v_tx;
  insert into public.wallet_audit_logs(team_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_team,auth.uid(),'wallet_charge','wallet_transaction',v_tx.id,jsonb_build_object('student_id',target_student,'amount',round(charge_amount,2),'category_id',target_category));
  return jsonb_build_object('ok',true,'duplicate',false,'transaction_id',v_tx.id,'transaction_no',v_tx.transaction_no,'balance',v_after);
end;
$$;

create or replace function public.wallet_reverse_transaction(target_transaction uuid, note_text text, request_key text)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_original public.wallet_transactions;
  v_wallet public.student_wallets;
  v_tx public.wallet_transactions;
  v_before numeric(12,2);
  v_after numeric(12,2);
begin
  if nullif(trim(coalesce(request_key,'')),'') is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode='22023'; end if;
  select * into v_original from public.wallet_transactions where id=target_transaction for update;
  if not found then raise exception 'TRANSACTION_NOT_FOUND' using errcode='P0002'; end if;
  if not public.team_can_use(v_original.team_id,'nfc_wallet') then raise exception 'PRO_FEATURE_REQUIRED' using errcode='42501'; end if;
  if not public.team_has_permission(v_original.team_id,'wallet_reverse') then raise exception 'WALLET_REVERSE_DENIED' using errcode='42501'; end if;
  if v_original.status='reversed' or v_original.reversal_of is not null then raise exception 'TRANSACTION_ALREADY_REVERSED' using errcode='23505'; end if;
  if v_original.transaction_type not in ('top_up','charge') then raise exception 'TRANSACTION_NOT_REVERSIBLE' using errcode='22023'; end if;
  select * into v_tx from public.wallet_transactions where team_id=v_original.team_id and idempotency_key=request_key;
  if found then return jsonb_build_object('ok',true,'duplicate',true,'transaction_id',v_tx.id,'transaction_no',v_tx.transaction_no,'balance',v_tx.balance_after); end if;
  select * into v_wallet from public.student_wallets where id=v_original.wallet_id for update;
  v_before:=v_wallet.balance;
  if v_original.transaction_type='top_up' then
    if v_before < v_original.amount then raise exception 'REVERSAL_WOULD_NEGATIVE' using errcode='22003'; end if;
    v_after:=v_before-v_original.amount;
    update public.student_wallets set balance=v_after,total_top_up=greatest(total_top_up-v_original.amount,0),updated_at=now() where id=v_wallet.id;
  else
    v_after:=v_before+v_original.amount;
    update public.student_wallets set balance=v_after,total_charge=greatest(total_charge-v_original.amount,0),updated_at=now() where id=v_wallet.id;
  end if;
  insert into public.wallet_transactions(team_id,wallet_id,student_id,transaction_type,amount,balance_before,balance_after,category_id,note,operator_user_id,idempotency_key,reversal_of)
  values(v_original.team_id,v_original.wallet_id,v_original.student_id,'reversal',v_original.amount,v_before,v_after,v_original.category_id,nullif(trim(coalesce(note_text,'')),''),auth.uid(),request_key,v_original.id)
  returning * into v_tx;
  update public.wallet_transactions set status='reversed' where id=v_original.id;
  insert into public.wallet_audit_logs(team_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_original.team_id,auth.uid(),'wallet_reverse','wallet_transaction',v_tx.id,jsonb_build_object('original_transaction_id',v_original.id,'amount',v_original.amount));
  return jsonb_build_object('ok',true,'duplicate',false,'transaction_id',v_tx.id,'transaction_no',v_tx.transaction_no,'balance',v_after);
end;
$$;

revoke all on function public.wallet_top_up(uuid,numeric,text,text,text) from public;
revoke all on function public.wallet_charge(uuid,numeric,uuid,text,text) from public;
revoke all on function public.wallet_reverse_transaction(uuid,text,text) from public;
grant execute on function public.wallet_top_up(uuid,numeric,text,text,text) to authenticated;
grant execute on function public.wallet_charge(uuid,numeric,uuid,text,text) to authenticated;
grant execute on function public.wallet_reverse_transaction(uuid,text,text) to authenticated;
