import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TRAINING_ITEMS } from '@/lib/training-items';

type ProgressRow = {
  skill_id: string;
  level_value: number | null;
  status: string | null;
  assessed_at: string;
};

const STATUS_ORDER: Record<string, number> = {
  learning: 0,
  developing: 1,
  stable: 2,
  mastered: 3,
};

export default async function RecommendTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const [{ data: student }, { data: rows }] = await Promise.all([
    supabase.from('students').select('id').eq('id', id).single(),
    supabase
      .from('student_skill_progress')
      .select('skill_id,level_value,status,assessed_at')
      .eq('student_id', id)
      .order('assessed_at', { ascending: false }),
  ]);

  if (!student) redirect('/students');

  const latest = new Map<string, ProgressRow>();
  for (const row of (rows ?? []) as ProgressRow[]) {
    if (!latest.has(row.skill_id)) latest.set(row.skill_id, row);
  }

  const validIds = new Set(TRAINING_ITEMS.map((item) => item.id));
  const suggested = [...latest.values()]
    .filter((row) => row.level_value != null && validIds.has(row.skill_id))
    .sort((a, b) => {
      const levelDiff = (a.level_value ?? 99) - (b.level_value ?? 99);
      if (levelDiff !== 0) return levelDiff;
      return (STATUS_ORDER[a.status ?? ''] ?? 9) - (STATUS_ORDER[b.status ?? ''] ?? 9);
    })
    .slice(0, 4)
    .map((row) => row.skill_id);

  const query = new URLSearchParams({ student: id, source: 'ability' });
  if (suggested.length) query.set('skills', suggested.join(','));
  redirect(`/today?${query.toString()}`);
}
