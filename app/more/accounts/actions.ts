'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function permissionsFromForm(formData: FormData) {
  return {
    students: formData.get('perm_students') === 'on',
    training: formData.get('perm_training') === 'on',
    assessment: formData.get('perm_assessment') === 'on',
    competitions: formData.get('perm_competitions') === 'on',
    transport: formData.get('perm_transport') === 'on',
  };
}

async function getSupabase() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');
  return supabase;
}

export async function approveJoinRequest(formData: FormData) {
  const requestId = String(formData.get('request_id') ?? '');
  const role = String(formData.get('member_role') ?? 'coach');
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('approve_team_join_request', {
    target_request: requestId,
    granted_role: role,
    granted_permissions: permissionsFromForm(formData),
  });
  if (error) redirect('/more/accounts?error=' + encodeURIComponent(error.message));
  revalidatePath('/more/accounts');
  redirect('/more/accounts?approved=1');
}

export async function approveNewTeamRequest(formData: FormData) {
  const requestId = String(formData.get('request_id') ?? '');
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('approve_new_team_request', { target_request: requestId });
  if (error) redirect('/more/accounts?error=' + encodeURIComponent(error.message));
  revalidatePath('/more/accounts');
  redirect('/more/accounts?created=1');
}

export async function rejectAccessRequest(formData: FormData) {
  const requestId = String(formData.get('request_id') ?? '');
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('reject_team_access_request', { target_request: requestId });
  if (error) redirect('/more/accounts?error=' + encodeURIComponent(error.message));
  revalidatePath('/more/accounts');
  redirect('/more/accounts?rejected=1');
}
