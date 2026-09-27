import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: sessions, error } = await supabase
    .from('training_sessions')
    .select('id,session_date,focus_level,duration_minutes,participant_count,table_count,created_at')
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>歷史訓練</h1>
        <p>查看已儲存的課程，包含到課學生、分桌與當日訓練項目。</p>
        <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生名單</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>HISTORY</span><h2>訓練紀錄</h2></div><strong>{sessions?.length ?? 0} 筆</strong></div>
        {error ? <div className="notice errorNotice">{error.message}</div> : null}
        {!sessions?.length ? <p className="muted">目前還沒有訓練紀錄。完成今日訓練後按「儲存本次訓練」就會出現在這裡。</p> : (
          <div className="historyList">
            {sessions.map((session) => (
              <Link className="historyRow" href={`/history/${session.id}`} key={session.id}>
                <div>
                  <b>{session.session_date}</b>
                  <small>{session.focus_level} 級 · {session.participant_count} 人 · {session.table_count} 桌</small>
                </div>
                <strong>{session.duration_minutes} 分鐘</strong>
                <span>查看 ›</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
