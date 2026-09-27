'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect('/login');
  return supabase;
}

export async function addStudent(formData: FormData) {
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!displayName) return;
  const supabase = await requireUser();
  const { error } = await supabase.from('students').insert({ display_name: displayName });
  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function setStudentActive(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!id) return;
  const supabase = await requireUser();
  const { error } = await supabase.from('students').update({ active }).eq('id', id);
  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
