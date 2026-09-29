'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const VALID_LEVELS = new Set(['A','B','C','D','E','F']);

async function getContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');
  const { data: teamId } = await supabase.rpc('current_team_id');
  if (!teamId) redirect('/more');
  return { supabase, userId, teamId: String(teamId) };
}

function readLevels(formData: FormData) {
  return formData.getAll('recommended_levels')
    .map((value) => String(value))
    .filter((value) => VALID_LEVELS.has(value));
}

function customId() {
  return `CUSTOM-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

export async function createCustomTrainingItem(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const domain = String(formData.get('domain') ?? '').trim();
  const subcategory = String(formData.get('subcategory') ?? '').trim();
  const goal = String(formData.get('goal') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const levels = readLevels(formData);
  if (!name || !domain || !subcategory || !levels.length) {
    redirect('/training-items?error=' + encodeURIComponent('請填寫名稱、訓練面向、分類，並至少選一個推薦程度。'));
  }
  const { supabase, userId, teamId } = await getContext();
  const { error } = await supabase.from('skills').insert({
    id: customId(),
    name,
    domain,
    subcategory,
    goal: goal || null,
    notes: notes || null,
    stage: '自訂',
    level: levels.join(','),
    recommended_levels: levels,
    team_id: teamId,
    created_by: userId,
    is_custom: true,
    is_active: true,
  });
  if (error) redirect('/training-items?error=' + encodeURIComponent(error.message));
  revalidatePath('/training-items');
  revalidatePath('/today');
  redirect('/training-items?created=1');
}

export async function updateCustomTrainingItem(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const domain = String(formData.get('domain') ?? '').trim();
  const subcategory = String(formData.get('subcategory') ?? '').trim();
  const goal = String(formData.get('goal') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const levels = readLevels(formData);
  if (!id || !name || !domain || !subcategory || !levels.length) return;
  const { supabase } = await getContext();
  const { error } = await supabase.from('skills').update({
    name,
    domain,
    subcategory,
    goal: goal || null,
    notes: notes || null,
    level: levels.join(','),
    recommended_levels: levels,
    is_active: formData.get('is_active') === 'on',
  }).eq('id', id).eq('is_custom', true);
  if (error) redirect('/training-items?error=' + encodeURIComponent(error.message));
  revalidatePath('/training-items');
  revalidatePath('/today');
  redirect('/training-items?updated=1');
}

export async function deleteCustomTrainingItem(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await getContext();
  const { error } = await supabase.from('skills').delete().eq('id', id).eq('is_custom', true);
  if (error) {
    redirect('/training-items?error=' + encodeURIComponent('這個項目可能已被歷史課程使用，建議改成「停用」。' + error.message));
  }
  revalidatePath('/training-items');
  revalidatePath('/today');
  redirect('/training-items?deleted=1');
}
