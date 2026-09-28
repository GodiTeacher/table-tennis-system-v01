'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getCoach() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');
  return { supabase, userId };
}

export async function addCompetitionParticipants(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const studentIds = formData.getAll('student_ids').map(String).filter(Boolean);
  const category = String(formData.get('category') ?? '').trim() || null;
  const participantRole = String(formData.get('participant_role') ?? 'competitor');
  if (!competitionId || !studentIds.length) redirect(`/competitions/${competitionId}?error=${encodeURIComponent('請至少選擇一位學生')}`);

  const { supabase } = await getCoach();
  const { data: existing } = await supabase.from('competition_participants').select('student_id').eq('competition_id', competitionId);
  const existingIds = new Set((existing ?? []).map((row) => row.student_id));
  const rows = studentIds.filter((id) => !existingIds.has(id)).map((studentId) => ({ competition_id: competitionId, student_id: studentId, category, participant_role: participantRole }));
  if (rows.length) {
    const { error } = await supabase.from('competition_participants').insert(rows);
    if (error) redirect(`/competitions/${competitionId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/competitions/${competitionId}`);
}

export async function removeCompetitionParticipant(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const participantId = String(formData.get('participant_id') ?? '');
  const { supabase } = await getCoach();
  await supabase.from('competition_participants').delete().eq('id', participantId).eq('competition_id', competitionId);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function createTransportVehicle(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const driverName = String(formData.get('driver_name') ?? '').trim();
  const driverType = String(formData.get('driver_type') ?? 'parent');
  const direction = String(formData.get('direction') ?? 'both');
  const capacity = Number(formData.get('capacity') ?? 0);
  const contact = String(formData.get('contact') ?? '').trim();
  const vehicleNote = String(formData.get('vehicle_note') ?? '').trim();
  const estimatedCost = Number(formData.get('estimated_cost') ?? 0);
  if (!competitionId || !driverName || !Number.isInteger(capacity) || capacity < 1) redirect(`/competitions/${competitionId}?error=${encodeURIComponent('請確認駕駛姓名與可載人數')}`);

  const { supabase, userId } = await getCoach();
  const { error } = await supabase.from('competition_transport_vehicles').insert({
    competition_id: competitionId,
    driver_name: driverName,
    driver_type: driverType,
    direction,
    capacity,
    contact: contact || null,
    vehicle_note: vehicleNote || null,
    estimated_cost: Number.isFinite(estimatedCost) && estimatedCost >= 0 ? estimatedCost : 0,
    created_by: userId,
  });
  if (error) redirect(`/competitions/${competitionId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function assignTransportPassengers(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const vehicleId = String(formData.get('vehicle_id') ?? '');
  const studentIds = formData.getAll('student_ids').map(String).filter(Boolean);
  if (!competitionId || !vehicleId || !studentIds.length) return;
  const { supabase } = await getCoach();
  const { data: existing } = await supabase.from('competition_transport_assignments').select('student_id').eq('vehicle_id', vehicleId);
  const existingIds = new Set((existing ?? []).map((row) => row.student_id));
  const rows = studentIds.filter((id) => !existingIds.has(id)).map((studentId) => ({ vehicle_id: vehicleId, student_id: studentId }));
  if (rows.length) await supabase.from('competition_transport_assignments').insert(rows);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function removeTransportPassenger(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const assignmentId = String(formData.get('assignment_id') ?? '');
  if (!competitionId || !assignmentId) return;
  const { supabase } = await getCoach();
  await supabase.from('competition_transport_assignments').delete().eq('id', assignmentId);
  revalidatePath(`/competitions/${competitionId}`);
}
