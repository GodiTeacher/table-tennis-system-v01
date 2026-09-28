'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function statusForLevel(level: number) {
  if (level <= 1) return 'learning';
  if (level <= 3) return 'developing';
  if (level === 4) return 'stable';
  return 'mastered';
}

export async function saveQuickAssessments(formData: FormData) {
  const sessionId = String(formData.get('session_id') ?? '');
  const payloadRaw = String(formData.get('payload') ?? '[]');
  if (!sessionId) return;

  let payload: Array<{ studentId: string; skillId: string; levelValue: number }> = [];
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    redirect(`/history/${sessionId}/assess?error=${encodeURIComponent('評量資料格式錯誤')}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const [{ data: sessionStudents }, { data: sessionItems }] = await Promise.all([
    supabase.from('session_students').select('student_id').eq('session_id', sessionId),
    supabase.from('training_session_items').select('skill_id').eq('session_id', sessionId),
  ]);

  const allowedStudents = new Set((sessionStudents ?? []).map((row) => row.student_id));
  const allowedSkills = new Set((sessionItems ?? []).map((row) => row.skill_id));

  const rows = payload
    .filter((item) => allowedStudents.has(item.studentId) && allowedSkills.has(item.skillId) && Number.isInteger(item.levelValue) && item.levelValue >= 1 && item.levelValue <= 5)
    .map((item) => ({
      student_id: item.studentId,
      skill_id: item.skillId,
      level_value: item.levelValue,
      status: statusForLevel(item.levelValue),
      observation: `課後快速評量 · ${sessionId.slice(0, 8)}`,
      coach_id: userId,
    }));

  if (!rows.length) {
    redirect(`/history/${sessionId}/assess?error=${encodeURIComponent('尚未選擇任何要更新的評量')}`);
  }

  const { error } = await supabase.from('student_skill_progress').insert(rows);
  if (error) redirect(`/history/${sessionId}/assess?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/history/${sessionId}/assess`);
  for (const studentId of new Set(rows.map((row) => row.student_id))) {
    revalidatePath(`/students/${studentId}`);
  }
  redirect(`/history/${sessionId}/assess?saved=1`);
}
