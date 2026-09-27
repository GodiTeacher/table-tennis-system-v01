'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = new Set(['learning', 'developing', 'stable', 'mastered']);

export async function saveSkillAssessment(formData: FormData) {
  const studentId = String(formData.get('student_id') ?? '');
  const skillId = String(formData.get('skill_id') ?? '');
  const status = String(formData.get('status') ?? 'learning');
  const levelValue = Number(formData.get('level_value') ?? 0);
  const observation = String(formData.get('observation') ?? '').trim();

  if (!studentId || !skillId || !VALID_STATUSES.has(status) || !Number.isInteger(levelValue) || levelValue < 1 || levelValue > 5) {
    return;
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { error } = await supabase.from('student_skill_progress').insert({
    student_id: studentId,
    skill_id: skillId,
    status,
    level_value: levelValue,
    observation: observation || null,
    coach_id: userId,
  });

  if (error) {
    redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/students/${studentId}`);
}
