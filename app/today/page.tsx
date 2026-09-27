import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DailyTrainingWorkspace from '@/components/DailyTrainingWorkspace';

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role,display_name').eq('id', userId).single();
  if (!profile || !['admin','coach'].includes(profile.role)) {
    return <main className="shell"><section className="card"><h1>帳號等待核准</h1><p className="muted">目前帳號尚未取得教練權限。</p></section></main>;
  }

  const { data: students } = await supabase
    .from('students')
    .select('id,display_name,grade,class_name,gender')
    .eq('active', true)
    .order('grade', { ascending: true, nullsFirst: false })
    .order('gender', { ascending: true, nullsFirst: false })
    .order('display_name');

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>今日訓練</h1>
        <p>從到課名單開始，直接完成今日訓練項目、時間、分桌與課表儲存。</p>
        <div className="topNav"><Link href="/students">學生名單</Link><Link href="/history">歷史訓練</Link><Link href="/">原型規劃器</Link></div>
      </section>
      {params.saved ? <div className="notice successNotice"><b>已儲存：</b>本次訓練已寫入 Supabase。</div> : null}
      {params.error ? <div className="notice errorNotice"><b>儲存失敗：</b>{params.error}</div> : null}
      <DailyTrainingWorkspace students={students ?? []} />
    </main>
  );
}
