'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = new Set(['learning','developing','stable','mastered']);

type QuickAssessment = {
  student_id: string;
  skill_id: string;
  status: string;
  level_value: number;
  observation?: string;
};

export async function saveQuickAssessments(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin','coach'].includes(profile.role)) redirect('/today');

  let rows: QuickAssessment[] = [];
  try {
    rows = JSON.parse(String(formData.get('assessments') ?? '[]')) as QuickAssessment[];
  } catch {
    redirect(`/history/${sessionId}/review?error=${encodeURIComponent('評量資料格式錯誤')}`);
  }

  const { data: sessionStudents } = await supabase.from('session_students').select('student_id').eq('session_id', sessionId);
  const { data: sessionItems } = await supabase.from('training_session_items').select('skill_id').eq('session_id', sessionId);
  const allowedStudents = new Set((sessionStudents ?? []).map((row) => row.student_id));
  const allowedSkills = new Set((sessionItems ?? []).map((row) => row.skill_id));

  const validRows = rows.filter((row) =>
    allowedStudents.has(row.student_id) &&
    allowedSkills.has(row.skill_id) &&
    VALID_STATUSES.has(row.status) &&
    Number.isInteger(row.level_value) && row.level_value >= 1 && row.level_value <= 5
  );

  if (!validRows.length) redirect(`/history/${sessionId}/review?error=${encodeURIComponent('請至少勾選一項要儲存的評量')}`);

  const { error } = await supabase.from('student_skill_progress').insert(validRows.map((row) => ({
    student_id: row.student_id,
    skill_id: row.skill_id,
    status: row.status,
    level_value: row.level_value,
    observation: row.observation?.trim() || null,
    coach_id: userId,
  })));

  if (error) redirect(`/history/${sessionId}/review?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/history/${sessionId}/review`);
  revalidatePath('/students');
  redirect(`/history/${sessionId}/review?saved=${validRows.length}`);
}
