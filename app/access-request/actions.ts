'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function submitAccessRequest(formData: FormData) {
  const mode = String(formData.get('mode') ?? 'join');
  const teamId = String(formData.get('team_id') ?? '').trim() || null;
  const school = String(formData.get('school_name') ?? '').trim();
  const sport = String(formData.get('sport_name') ?? '桌球').trim() || '桌球';
  const teamName = String(formData.get('team_name') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const { error } = await supabase.rpc('submit_team_access_request', {
    target_team: mode === 'join' ? teamId : null,
    requested_school: school,
    requested_sport: sport,
    requested_team_name: teamName,
    requested_message: message || null,
  });
  if (error) redirect('/access-request?error=' + encodeURIComponent(error.message));
  revalidatePath('/access-request');
  redirect('/access-request?submitted=1');
}
