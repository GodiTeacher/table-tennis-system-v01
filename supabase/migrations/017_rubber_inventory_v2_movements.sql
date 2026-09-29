alter table public.competition_rubber_orders add column if not exists stock_deducted_at timestamptz;

create table if not exists public.rubber_stock_movements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  catalog_id uuid not null references public.rubber_catalog(id) on delete cascade,
  movement_type text not null check (movement_type in ('in','out','adjustment','competition_use')),
  quantity_change integer not null check (quantity_change <> 0),
  stock_before integer not null,
  stock_after integer not null,
  unit_cost numeric not null default 0,
  competition_id uuid references public.competitions(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  order_id uuid references public.competition_rubber_orders(id) on delete set null,
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists rubber_stock_movements_team_created_idx on public.rubber_stock_movements(team_id, created_at desc);
create index if not exists rubber_stock_movements_catalog_idx on public.rubber_stock_movements(catalog_id, created_at desc);

alter table public.rubber_stock_movements enable row level security;
drop policy if exists "team members read rubber movements" on public.rubber_stock_movements;
create policy "team members read rubber movements" on public.rubber_stock_movements
for select using (exists (select 1 from public.team_members tm where tm.team_id = rubber_stock_movements.team_id and tm.user_id = auth.uid()));

create or replace function public.adjust_rubber_stock(
  p_catalog_id uuid,
  p_delta integer,
  p_movement_type text,
  p_note text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.rubber_catalog%rowtype;
  v_member public.team_members%rowtype;
  v_after integer;
begin
  if p_delta = 0 then raise exception '庫存異動數量不可為 0'; end if;
  if p_movement_type not in ('in','out','adjustment') then raise exception '不支援的庫存異動類型'; end if;

  select * into v_item from public.rubber_catalog where id = p_catalog_id for update;
  if not found then raise exception '找不到球皮資料'; end if;
  select * into v_member from public.team_members where team_id = v_item.team_id and user_id = auth.uid();
  if not found or not (v_member.member_role in ('owner','admin') or coalesce((v_member.permissions->>'equipment')::boolean,false)) then
    raise exception '沒有器材庫存管理權限';
  end if;

  v_after := v_item.stock_quantity + p_delta;
  if v_after < 0 then raise exception '庫存不足，無法完成出庫'; end if;

  update public.rubber_catalog set stock_quantity = v_after, updated_at = now() where id = p_catalog_id;
  insert into public.rubber_stock_movements(team_id,catalog_id,movement_type,quantity_change,stock_before,stock_after,unit_cost,note,created_by)
  values(v_item.team_id,p_catalog_id,p_movement_type,p_delta,v_item.stock_quantity,v_after,v_item.cost_price,p_note,auth.uid());
  return v_after;
end;
$$;

create or replace function public.deduct_rubber_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.competition_rubber_orders%rowtype;
  v_item public.rubber_catalog%rowtype;
  v_member public.team_members%rowtype;
  v_after integer;
begin
  select * into v_order from public.competition_rubber_orders where id = p_order_id for update;
  if not found then raise exception '找不到球皮需求'; end if;
  if v_order.stock_deducted_at is not null then return false; end if;
  if v_order.catalog_id is null then return false; end if;

  select * into v_member from public.team_members where team_id = v_order.team_id and user_id = auth.uid();
  if not found or not (v_member.member_role in ('owner','admin') or coalesce((v_member.permissions->>'equipment')::boolean,false)) then
    raise exception '沒有器材庫存管理權限';
  end if;

  select * into v_item from public.rubber_catalog where id = v_order.catalog_id for update;
  if not found then raise exception '找不到對應球皮庫存'; end if;
  if v_item.stock_quantity < 1 then raise exception '球皮庫存不足，請先入庫再標記已黏貼／已交付'; end if;

  v_after := v_item.stock_quantity - 1;
  update public.rubber_catalog set stock_quantity = v_after, updated_at = now() where id = v_item.id;
  insert into public.rubber_stock_movements(team_id,catalog_id,movement_type,quantity_change,stock_before,stock_after,unit_cost,competition_id,student_id,order_id,note,created_by)
  values(v_order.team_id,v_item.id,'competition_use',-1,v_item.stock_quantity,v_after,v_item.cost_price,v_order.competition_id,v_order.student_id,v_order.id,'比賽換皮領用',auth.uid());
  update public.competition_rubber_orders set stock_deducted_at = now(), updated_at = now() where id = v_order.id;
  return true;
end;
$$;

grant execute on function public.adjust_rubber_stock(uuid,integer,text,text) to authenticated;
grant execute on function public.deduct_rubber_order_stock(uuid) to authenticated;
