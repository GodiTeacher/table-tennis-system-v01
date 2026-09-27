'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const VALID_LEVELS = new Set(['A','B','C','D','E','F']);

export async function saveTrainingSession(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || !['admin','coach'].includes(profile.role)) {
    redirect('/today?error=' + encodeURIComponent('此帳號尚未取得教練權限'));
  }

  const focusLevel = String(formData.get('focus_level') ?? 'B');
  const durationMinutes = Number(formData.get('duration_minutes') ?? 0);
  const tableCount = Number(formData.get('table_count') ?? 0);
  const studentIds = JSON.parse(String(formData.get('student_ids') ?? '[]')) as string[];
  const planItems = JSON.parse(String(formData.get('plan_items') ?? '[]')) as Array<{ id: string; minutes: number }>;

  if (!VALID_LEVELS.has(focusLevel) || durationMinutes < 15 || tableCount < 1 || studentIds.length < 1 || planItems.length < 1) {
    redirect('/today?error=' + encodeURIComponent('請確認到課學生、訓練項目、時間與桌數是否完整'));
  }

  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .insert({
      coach_id: userId,
      focus_level: focusLevel,
      duration_minutes: durationMinutes,
      participant_count: studentIds.length,
      table_count: tableCount,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    redirect('/today?error=' + encodeURIComponent(sessionError?.message ?? '建立課程失敗'));
  }

  const itemRows = planItems.map((item, index) => ({
    session_id: session.id,
    skill_id: item.id,
    sort_order: index,
    planned_minutes: item.minutes,
  }));

  const studentRows = studentIds.map((studentId, index) => ({
    session_id: session.id,
    student_id: studentId,
    table_no: (index % tableCount) + 1,
    group_no: Math.floor(index / tableCount) + 1,
  }));

  const [{ error: itemError }, { error: studentError }] = await Promise.all([
    supabase.from('training_session_items').insert(itemRows),
    supabase.from('session_students').insert(studentRows),
  ]);

  if (itemError || studentError) {
    await supabase.from('training_sessions').delete().eq('id', session.id);
    redirect('/today?error=' + encodeURIComponent(itemError?.message ?? studentError?.message ?? '儲存課程失敗'));
  }

  redirect('/today?saved=' + session.id);
}
