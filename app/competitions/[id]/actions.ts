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

function goError(competitionId: string, message: string): never {
  redirect(`/competitions/${competitionId}?error=${encodeURIComponent(message)}`);
}

export async function updateCompetition(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const startDate = String(formData.get('start_date') ?? '').trim();
  const endDate = String(formData.get('end_date') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const registrationDeadline = String(formData.get('registration_deadline') ?? '').trim();
  const status = String(formData.get('status') ?? 'planning');
  const notes = String(formData.get('notes') ?? '').trim();
  if (!competitionId || !name || !startDate) goError(competitionId, '請至少填寫比賽名稱與開始日期');
  const { supabase } = await getCoach();
  const { error } = await supabase.from('competitions').update({
    name,
    start_date: startDate,
    end_date: endDate || null,
    location: location || null,
    registration_deadline: registrationDeadline || null,
    status,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', competitionId);
  if (error) goError(competitionId, error.message);
  revalidatePath('/competitions');
  revalidatePath(`/competitions/${competitionId}`);
}

export async function addCompetitionParticipants(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const competitionDate = String(formData.get('competition_date') ?? '').trim();
  const studentIds = formData.getAll('student_ids').map(String).filter(Boolean);
  const category = String(formData.get('category') ?? '').trim();
  const participantRole = String(formData.get('participant_role') ?? 'competitor');
  if (!competitionId || !competitionDate || !studentIds.length) goError(competitionId, '請選擇比賽日期並至少勾選一位學生');
  const { supabase } = await getCoach();
  const rows = studentIds.map((studentId) => ({
    competition_id: competitionId,
    student_id: studentId,
    competition_date: competitionDate,
    category: category || null,
    participant_role: participantRole,
  }));
  const { error } = await supabase.from('competition_participants').insert(rows);
  if (error) goError(competitionId, error.message.includes('duplicate') ? '同一位學生在這一天的相同組別已經加入' : error.message);
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
  const transportDate = String(formData.get('transport_date') ?? '').trim();
  const driverName = String(formData.get('driver_name') ?? '').trim();
  const driverType = String(formData.get('driver_type') ?? 'parent');
  const direction = String(formData.get('direction') ?? 'both');
  const capacity = Number(formData.get('capacity') ?? 0);
  const contact = String(formData.get('contact') ?? '').trim();
  const vehicleNote = String(formData.get('vehicle_note') ?? '').trim();
  const farePerRide = Number(formData.get('fare_per_ride') ?? 0);
  if (!competitionId || !transportDate || !driverName || !Number.isInteger(capacity) || capacity < 1) goError(competitionId, '請確認接送日期、駕駛姓名與可載人數');
  const { supabase, userId } = await getCoach();
  const { error } = await supabase.from('competition_transport_vehicles').insert({
    competition_id: competitionId,
    transport_date: transportDate,
    driver_name: driverName,
    driver_type: driverType,
    direction,
    capacity,
    contact: contact || null,
    vehicle_note: vehicleNote || null,
    fare_per_ride: Number.isFinite(farePerRide) && farePerRide >= 0 ? farePerRide : 0,
    estimated_cost: 0,
    created_by: userId,
  });
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function removeTransportVehicle(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const vehicleId = String(formData.get('vehicle_id') ?? '');
  if (!competitionId || !vehicleId) return;
  const { supabase } = await getCoach();
  const { error } = await supabase.from('competition_transport_vehicles').delete().eq('id', vehicleId).eq('competition_id', competitionId);
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function assignTransportPassengers(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const vehicleId = String(formData.get('vehicle_id') ?? '');
  const rideDirection = String(formData.get('ride_direction') ?? 'outbound');
  const studentIds = formData.getAll('student_ids').map(String).filter(Boolean);
  if (!competitionId || !vehicleId || !studentIds.length) return;

  const { supabase } = await getCoach();
  const { data: vehicle } = await supabase.from('competition_transport_vehicles').select('capacity,competition_id,transport_date,direction,fare_per_ride').eq('id', vehicleId).single();
  if (!vehicle || vehicle.competition_id !== competitionId) goError(competitionId, '找不到這台接送車輛');
  if (vehicle.direction !== 'both' && vehicle.direction !== rideDirection) goError(competitionId, '這台車不提供此方向的接送');

  const { data: assignedForVehicle } = await supabase.from('competition_transport_assignments').select('student_id').eq('vehicle_id', vehicleId).eq('transport_date', vehicle.transport_date).eq('ride_direction', rideDirection);
  const remainingSeats = Math.max(0, vehicle.capacity - (assignedForVehicle?.length ?? 0));
  if (studentIds.length > remainingSeats) goError(competitionId, `此車此方向只剩 ${remainingSeats} 個座位，請減少勾選人數`);

  const rows = studentIds.map((studentId) => ({
    vehicle_id: vehicleId,
    competition_id: competitionId,
    student_id: studentId,
    transport_date: vehicle.transport_date,
    ride_direction: rideDirection,
    amount_due: Number(vehicle.fare_per_ride ?? 0),
  }));
  const { error } = await supabase.from('competition_transport_assignments').insert(rows);
  if (error) goError(competitionId, error.message.includes('competition_student_trip_unique') ? '其中有學生在同一天同方向已安排到其他車輛' : error.message);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function updateTransportCharge(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const assignmentId = String(formData.get('assignment_id') ?? '');
  const amountDue = Number(formData.get('amount_due') ?? 0);
  const amountPaid = Number(formData.get('amount_paid') ?? 0);
  const paymentStatus = String(formData.get('payment_status') ?? 'unpaid');
  const paymentNote = String(formData.get('payment_note') ?? '').trim();
  if (!competitionId || !assignmentId || !Number.isFinite(amountDue) || amountDue < 0 || !Number.isFinite(amountPaid) || amountPaid < 0) return;
  const { supabase } = await getCoach();
  const { error } = await supabase.from('competition_transport_assignments').update({
    amount_due: amountDue,
    amount_paid: amountPaid,
    payment_status: paymentStatus,
    payment_note: paymentNote || null,
  }).eq('id', assignmentId).eq('competition_id', competitionId);
  if (error) goError(competitionId, error.message);
  revalidatePath(`/competitions/${competitionId}`);
}

export async function removeTransportPassenger(formData: FormData) {
  const competitionId = String(formData.get('competition_id') ?? '');
  const assignmentId = String(formData.get('assignment_id') ?? '');
  if (!competitionId || !assignmentId) return;
  const { supabase } = await getCoach();
  await supabase.from('competition_transport_assignments').delete().eq('id', assignmentId).eq('competition_id', competitionId);
  revalidatePath(`/competitions/${competitionId}`);
}
