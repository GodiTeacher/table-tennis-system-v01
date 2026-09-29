'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getSupabase() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');
  return { supabase, userId: claimsData.claims.sub as string };
}

function goError(competitionId: string, message: string): never {
  redirect(`/competitions/${competitionId}/rubbers?error=${encodeURIComponent(message)}`);
}

export async function saveQuickRubberAssignments(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  if (!competitionId) return;
  const { supabase, userId } = await getSupabase();
  const { data: teamId } = await supabase.rpc('current_team_id');
  if (!teamId) goError(competitionId, '目前沒有隊伍工作區');

  const [{ data: participants, error: participantError }, { data: catalog, error: catalogError }, { data: existingOrders, error: orderError }] = await Promise.all([
    supabase.from('competition_participants').select('student_id').eq('competition_id', competitionId),
    supabase.from('rubber_catalog').select('*').eq('active', true),
    supabase.from('competition_rubber_orders').select('*').eq('competition_id', competitionId),
  ]);
  if (participantError || catalogError || orderError) goError(competitionId, participantError?.message || catalogError?.message || orderError?.message || '讀取資料失敗');

  const participantIds = [...new Set((participants ?? []).map((row:any)=>row.student_id))];
  const catalogMap = new Map((catalog ?? []).map((item:any)=>[item.id, item]));
  const existingMap = new Map((existingOrders ?? []).map((row:any)=>[`${row.student_id}:${row.side}`, row]));

  for (const studentId of participantIds) {
    for (const side of ['forehand','backhand'] as const) {
      const field = `${side}_${studentId}`;
      const catalogId = String(formData.get(field) ?? '');
      const existing = existingMap.get(`${studentId}:${side}`);

      if (!catalogId) {
        if (existing && Number(existing.amount_paid ?? 0) === 0 && existing.workflow_status === 'requested' && !existing.stock_deducted_at) {
          const { error } = await supabase.from('competition_rubber_orders').delete().eq('id', existing.id);
          if (error) goError(competitionId, error.message);
        }
        continue;
      }

      const item:any = catalogMap.get(catalogId);
      if (!item) continue;
      const payload = {
        catalog_id: item.id,
        rubber_brand: item.brand,
        rubber_model: item.model,
        sponge_thickness: item.sponge_thickness,
        color: item.color,
        rubber_price: Number(item.sale_price ?? 0),
        amount_due: Number(item.sale_price ?? 0) + Number(existing?.labor_fee ?? 0) + Number(existing?.edge_tape_fee ?? 0),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        if (existing.catalog_id === item.id) continue;
        if (existing.stock_deducted_at) goError(competitionId, '已有實際領用庫存的球皮不能直接更換品項，請先確認庫存紀錄。');
        const { error } = await supabase.from('competition_rubber_orders').update(payload).eq('id', existing.id);
        if (error) goError(competitionId, error.message);
      } else {
        const { error } = await supabase.from('competition_rubber_orders').insert({
          team_id: teamId,
          competition_id: competitionId,
          student_id: studentId,
          side,
          ...payload,
          created_by: userId,
        });
        if (error) goError(competitionId, error.message);
      }
    }
  }

  revalidatePath(`/competitions/${competitionId}/rubbers`);
  redirect(`/competitions/${competitionId}/rubbers?saved=1`);
}

export async function createRubberOrder(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const studentId = String(formData.get('student_id') ?? '');
  const side = String(formData.get('side') ?? 'forehand');
  const rubberBrand = String(formData.get('rubber_brand') ?? '').trim();
  const rubberModel = String(formData.get('rubber_model') ?? '').trim();
  const spongeThickness = String(formData.get('sponge_thickness') ?? '').trim();
  const color = String(formData.get('color') ?? '').trim();
  const rubberPrice = Number(formData.get('rubber_price') ?? 0);
  const laborFee = Number(formData.get('labor_fee') ?? 0);
  const edgeTapeFee = Number(formData.get('edge_tape_fee') ?? 0);
  const payee = String(formData.get('payee') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  if (!competitionId || !studentId || !rubberModel) goError(competitionId, '請選學生並填寫球皮型號');

  const { supabase, userId } = await getSupabase();
  const { data: teamId } = await supabase.rpc('current_team_id');
  const amountDue = Math.max(0, rubberPrice) + Math.max(0, laborFee) + Math.max(0, edgeTapeFee);
  const { error } = await supabase.from('competition_rubber_orders').insert({
    team_id: teamId,
    competition_id: competitionId,
    student_id: studentId,
    side,
    rubber_brand: rubberBrand || null,
    rubber_model: rubberModel,
    sponge_thickness: spongeThickness || null,
    color: color || null,
    rubber_price: Number.isFinite(rubberPrice) && rubberPrice >= 0 ? rubberPrice : 0,
    labor_fee: Number.isFinite(laborFee) && laborFee >= 0 ? laborFee : 0,
    edge_tape_fee: Number.isFinite(edgeTapeFee) && edgeTapeFee >= 0 ? edgeTapeFee : 0,
    amount_due: amountDue,
    payee: payee || null,
    notes: notes || null,
    created_by: userId,
  });
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}/rubbers`);
  redirect(`/competitions/${competitionId}/rubbers?created=1`);
}

export async function updateRubberOrder(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const orderId = String(formData.get('order_id') ?? '');
  const rubberBrand = String(formData.get('rubber_brand') ?? '').trim();
  const rubberModel = String(formData.get('rubber_model') ?? '').trim();
  const spongeThickness = String(formData.get('sponge_thickness') ?? '').trim();
  const color = String(formData.get('color') ?? '').trim();
  const rubberPrice = Number(formData.get('rubber_price') ?? 0);
  const laborFee = Number(formData.get('labor_fee') ?? 0);
  const edgeTapeFee = Number(formData.get('edge_tape_fee') ?? 0);
  const amountPaid = Number(formData.get('amount_paid') ?? 0);
  const payee = String(formData.get('payee') ?? '').trim();
  const paymentStatus = String(formData.get('payment_status') ?? 'unpaid');
  const workflowStatus = String(formData.get('workflow_status') ?? 'requested');
  const notes = String(formData.get('notes') ?? '').trim();
  if (!competitionId || !orderId || !rubberModel) goError(competitionId, '球皮資料不完整');

  const { supabase } = await getSupabase();
  const { data: before } = await supabase.from('competition_rubber_orders').select('workflow_status,stock_deducted_at,catalog_id').eq('id', orderId).eq('competition_id', competitionId).single();
  const amountDue = Math.max(0, rubberPrice) + Math.max(0, laborFee) + Math.max(0, edgeTapeFee);
  const { error } = await supabase.from('competition_rubber_orders').update({
    rubber_brand: rubberBrand || null,
    rubber_model: rubberModel,
    sponge_thickness: spongeThickness || null,
    color: color || null,
    rubber_price: Number.isFinite(rubberPrice) && rubberPrice >= 0 ? rubberPrice : 0,
    labor_fee: Number.isFinite(laborFee) && laborFee >= 0 ? laborFee : 0,
    edge_tape_fee: Number.isFinite(edgeTapeFee) && edgeTapeFee >= 0 ? edgeTapeFee : 0,
    amount_due: amountDue,
    amount_paid: Number.isFinite(amountPaid) && amountPaid >= 0 ? amountPaid : 0,
    payee: payee || null,
    payment_status: paymentStatus,
    workflow_status: workflowStatus,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId).eq('competition_id', competitionId);
  if (error) goError(competitionId, error.message);

  if (['installed','delivered'].includes(workflowStatus) && before?.catalog_id && !before?.stock_deducted_at) {
    const { error: stockError } = await supabase.rpc('deduct_rubber_order_stock', { p_order_id: orderId });
    if (stockError) {
      await supabase.from('competition_rubber_orders').update({ workflow_status: before.workflow_status, updated_at: new Date().toISOString() }).eq('id', orderId);
      goError(competitionId, `庫存未扣除：${stockError.message}`);
    }
  }

  revalidatePath(`/competitions/${competitionId}/rubbers`);
  revalidatePath('/rubber-catalog');
  revalidatePath('/rubber-inventory');
  redirect(`/competitions/${competitionId}/rubbers?updated=1`);
}

export async function deleteRubberOrder(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const orderId = String(formData.get('order_id') ?? '');
  if (!competitionId || !orderId) return;
  const { supabase } = await getSupabase();
  const { data: existing } = await supabase.from('competition_rubber_orders').select('stock_deducted_at').eq('id', orderId).single();
  if (existing?.stock_deducted_at) goError(competitionId, '這筆球皮已扣除實際庫存，為保留歷史紀錄不能直接刪除。');
  const { error } = await supabase.from('competition_rubber_orders').delete().eq('id', orderId).eq('competition_id', competitionId);
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}/rubbers`);
}
