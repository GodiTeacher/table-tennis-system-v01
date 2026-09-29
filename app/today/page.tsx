import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DailyTrainingWorkspace from '@/components/DailyTrainingWorkspace';
import type { TrainingItem } from '@/lib/training-items';
import type { TrainingLevelId } from '@/lib/training-levels';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; student?: string; skills?: string; source?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role,display_name').eq('id', userId).single();
  if (!profile || !['admin','coach'].includes(profile.role)) {
    return <main className="shell"><section className="card"><h1>帳號等待核准</h1><p className="muted">目前帳號尚未取得教練權限。</p></section></main>;
  }

  const [{ data: students }, { data: customSkillRows }] = await Promise.all([
    supabase
      .from('students')
      .select('id,display_name,grade,class_name,gender')
      .eq('active', true)
      .order('grade', { ascending: true, nullsFirst: false })
      .order('gender', { ascending: true, nullsFirst: false })
      .order('display_name'),
    supabase
      .from('skills')
      .select('id,name,domain,subcategory,recommended_levels')
      .eq('is_custom', true)
      .eq('is_active', true)
      .order('domain')
      .order('name'),
  ]);

  const customItems: TrainingItem[] = (customSkillRows ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    domain: item.domain,
    subcategory: item.subcategory ?? '自訂',
    recommendedLevels: ((item.recommended_levels ?? []).filter((level: string) => ['A','B','C','D','E','F'].includes(level))) as TrainingLevelId[],
  }));

  const suggestedSkillIds = (params.skills ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const sourceStudent = params.student ? (students ?? []).find((student) => student.id === params.student) : null;

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>今日訓練</h1>
        <p>從到課名單開始，直接完成今日訓練項目、時間、分桌與課表儲存。</p>
        <div className="topNav"><Link href="/students">學生名單</Link><Link href="/history">歷史訓練</Link><Link href="/training-items">自訂訓練項目</Link><Link href="/">原型規劃器</Link></div>
      </section>
      {params.source === 'ability' ? <div className="notice successNotice"><b>已帶入能力建議：</b>{sourceStudent ? `${sourceStudent.display_name} 的` : ''}低評量技能已預先加入今日訓練，可再自行增減項目與到課學生。</div> : null}
      {params.saved ? <div className="notice successNotice"><b>已儲存：</b>本次訓練已寫入 Supabase。</div> : null}
      {params.error ? <div className="notice errorNotice"><b>儲存失敗：</b>{params.error}</div> : null}
      <DailyTrainingWorkspace students={students ?? []} initialItemIds={suggestedSkillIds} customItems={customItems} />
    </main>
  );
}
