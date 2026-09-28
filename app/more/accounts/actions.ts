'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function approveAccount(formData: FormData) {
  const targetUser = String(formData.get('user_id') ?? '');
  if (!targetUser) return;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { error } = await supabase.rpc('approve_pending_account', { target_user: targetUser });
  if (error) redirect('/more/accounts?error=' + encodeURIComponent(error.message));

  revalidatePath('/more/accounts');
  redirect('/more/accounts?approved=1');
}
