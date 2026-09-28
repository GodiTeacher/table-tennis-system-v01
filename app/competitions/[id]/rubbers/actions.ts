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
  const { error } = await supabase.from('competition_rubber_orders').update({
    rubber_brand: rubberBrand || null,
    rubber_model: rubberModel,
    sponge_thickness: spongeThickness || null,
    color: color || null,
    rubber_price: Number.isFinite(rubberPrice) && rubberPrice >= 0 ? rubberPrice : 0,
    labor_fee: Number.isFinite(laborFee) && laborFee >= 0 ? laborFee : 0,
    edge_tape_fee: Number.isFinite(edgeTapeFee) && edgeTapeFee >= 0 ? edgeTapeFee : 0,
    amount_paid: Number.isFinite(amountPaid) && amountPaid >= 0 ? amountPaid : 0,
    payee: payee || null,
    payment_status: paymentStatus,
    workflow_status: workflowStatus,
    notes: notes || null,
  }).eq('id', orderId).eq('competition_id', competitionId);
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}/rubbers`);
  redirect(`/competitions/${competitionId}/rubbers?updated=1`);
}

export async function deleteRubberOrder(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const orderId = String(formData.get('order_id') ?? '');
  if (!competitionId || !orderId) return;
  const { supabase } = await getSupabase();
  const { error } = await supabase.from('competition_rubber_orders').delete().eq('id', orderId).eq('competition_id', competitionId);
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}/rubbers`);
}
