'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createCompetition(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const startDate = String(formData.get('start_date') ?? '').trim();
  const endDate = String(formData.get('end_date') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const registrationDeadline = String(formData.get('registration_deadline') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!name || !startDate) redirect('/competitions?error=' + encodeURIComponent('請至少填寫比賽名稱與開始日期'));

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { error } = await supabase.from('competitions').insert({
    name,
    start_date: startDate,
    end_date: endDate || null,
    location: location || null,
    registration_deadline: registrationDeadline || null,
    notes: notes || null,
    created_by: userId,
  });

  if (error) redirect('/competitions?error=' + encodeURIComponent(error.message));
  revalidatePath('/competitions');
  redirect('/competitions?created=1');
}
