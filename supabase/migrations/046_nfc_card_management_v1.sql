-- NFC card management V1
-- Adds bind, disable/lost, and authenticated token resolution RPCs.

create or replace function public.nfc_bind_card(
  target_student uuid,
  target_token_hash text,
  target_label text default null
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_team uuid;
  v_old uuid;
  v_card public.nfc_cards;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if nullif(trim(coalesce(target_token_hash,'')),'') is null then raise exception 'TOKEN_REQUIRED' using errcode='22023'; end if;

  select s.team_id into v_team
  from public.students s
  where s.id=target_student and s.active=true;

  if v_team is null then raise exception 'STUDENT_NOT_FOUND' using errcode='P0002'; end if;
  if not public.team_can_use(v_team,'nfc_wallet') then raise exception 'PRO_FEATURE_REQUIRED' using errcode='42501'; end if;
  if not public.team_has_permission(v_team,'nfc_manage') then raise exception 'NFC_MANAGE_DENIED' using errcode='42501'; end if;

  select id into v_old
  from public.nfc_cards
  where team_id=v_team and student_id=target_student and status='active'
  limit 1
  for update;

  if v_old is not null then
    update public.nfc_cards set status='replaced',disabled_at=now(),updated_at=now() where id=v_old;
  end if;

  insert into public.nfc_cards(team_id,student_id,token_hash,card_label,status,created_by)
  values(v_team,target_student,target_token_hash,nullif(trim(coalesce(target_label,'')),''),'active',auth.uid())
  returning * into v_card;

  if v_old is not null then
    update public.nfc_cards set replaced_by=v_card.id,updated_at=now() where id=v_old;
  end if;

  insert into public.wallet_audit_logs(team_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_team,auth.uid(),'nfc_bind_card','nfc_card',v_card.id,
    jsonb_build_object('student_id',target_student,'replaced_card_id',v_old,'label',v_card.card_label));

  return jsonb_build_object('ok',true,'card_id',v_card.id,'student_id',target_student,'replaced_card_id',v_old);
end;
$$;

create or replace function public.nfc_set_card_status(
  target_card uuid,
  target_status text
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_card public.nfc_cards;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_status not in ('lost','disabled') then raise exception 'INVALID_CARD_STATUS' using errcode='22023'; end if;

  select * into v_card from public.nfc_cards where id=target_card for update;
  if not found then raise exception 'CARD_NOT_FOUND' using errcode='P0002'; end if;
  if not public.team_has_permission(v_card.team_id,'nfc_manage') then raise exception 'NFC_MANAGE_DENIED' using errcode='42501'; end if;

  update public.nfc_cards set status=target_status,disabled_at=now(),updated_at=now() where id=target_card;

  insert into public.wallet_audit_logs(team_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_card.team_id,auth.uid(),'nfc_set_card_status','nfc_card',v_card.id,
    jsonb_build_object('student_id',v_card.student_id,'status',target_status));

  return jsonb_build_object('ok',true,'card_id',v_card.id,'status',target_status);
end;
$$;

create or replace function public.nfc_resolve_card(target_token_hash text)
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare
  v_card public.nfc_cards;
  v_student public.students;
  v_balance numeric(12,2);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  select * into v_card
  from public.nfc_cards
  where token_hash=target_token_hash and status='active'
  limit 1;

  if not found then raise exception 'CARD_NOT_FOUND' using errcode='P0002'; end if;
  if not public.is_team_member(v_card.team_id) then raise exception 'TEAM_ACCESS_DENIED' using errcode='42501'; end if;
  if not public.team_has_permission(v_card.team_id,'wallet_view') then raise exception 'WALLET_VIEW_DENIED' using errcode='42501'; end if;

  select * into v_student from public.students where id=v_card.student_id and active=true;
  if not found then raise exception 'STUDENT_NOT_FOUND' using errcode='P0002'; end if;

  select balance into v_balance
  from public.student_wallets
  where team_id=v_card.team_id and student_id=v_card.student_id;

  return jsonb_build_object(
    'ok',true,
    'card_id',v_card.id,
    'team_id',v_card.team_id,
    'student_id',v_student.id,
    'display_name',v_student.display_name,
    'grade',v_student.grade,
    'class_name',v_student.class_name,
    'seat_number',v_student.seat_number,
    'balance',coalesce(v_balance,0)
  );
end;
$$;
