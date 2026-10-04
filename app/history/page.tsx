import Link from 'next/link';
import { redirect } from 'next/navigation';
import DataPortTools from '@/components/DataPortTools';
import { getCurrentTeamEntitlements } from '@/lib/subscription-server';

function dateOnly(value:Date){
  const y=value.getFullYear();
  const m=String(value.getMonth()+1).padStart(2,'0');
  const d=String(value.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

export default async function HistoryPage() {
  const {supabase,userId,entitlements}=await getCurrentTeamEntitlements();
  if (!userId) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  let sessionsQuery=supabase
    .from('training_sessions')
    .select('id,session_date,focus_level,duration_minutes,participant_count,table_count,created_at')
    .order('session_date',{ascending:false})
    .order('created_at',{ascending:false})
    .limit(100);

  let cutoff:string|null=null;
  const months=entitlements?.training_history_months??null;
  if(months!==null){
    const d=new Date();
    d.setMonth(d.getMonth()-months);
    cutoff=dateOnly(d);
    sessionsQuery=sessionsQuery.gte('session_date',cutoff);
  }

  const { data: sessions, error } = await sessionsQuery;
  const exportRows=(sessions??[]).map(s=>({日期:s.session_date,程度:s.focus_level,人數:s.participant_count,桌數:s.table_count,分鐘:s.duration_minutes}));
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">TABLE TENNIS SYSTEM V01</div><h1>歷史訓練</h1><p>查看已儲存的課程，包含到課學生、分桌與當日訓練項目。</p><div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生名單</Link></div></section>
    {months!==null?<section className="card"><div className="notice">目前為免費版：訓練紀錄可查看最近 {months} 個月。較早資料會保留，升級菁英版後可重新查看完整歷史。</div></section>:null}
    <section className="card"><div className="sectionTitle"><div><span>EXPORT</span><h2>匯出訓練紀錄</h2></div><strong>{sessions?.length??0} 筆</strong></div><DataPortTools title="歷史訓練紀錄" filename="歷史訓練紀錄" lineTitle="🏓 歷史訓練紀錄" columns={[{key:'日期',label:'日期'},{key:'程度',label:'程度'},{key:'人數',label:'人數'},{key:'桌數',label:'桌數'},{key:'分鐘',label:'分鐘'}]} rows={exportRows}/></section>
    <section className="card"><div className="sectionTitle"><div><span>HISTORY</span><h2>訓練紀錄</h2></div><strong>{sessions?.length??0} 筆</strong></div>{error?<div className="notice errorNotice">{error.message}</div>:null}{!sessions?.length?<p className="muted">目前還沒有訓練紀錄。完成今日訓練後按「儲存本次訓練」就會出現在這裡。</p>:<div className="historyList">{sessions.map(session=><Link className="historyRow" href={`/history/${session.id}`} key={session.id}><div><b>{session.session_date}</b><small>{session.focus_level} 級 · {session.participant_count} 人 · {session.table_count} 桌</small></div><strong>{session.duration_minutes} 分鐘</strong><span>查看 ›</span></Link>)}</div>}</section>
  </main>;
}
