import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCompetition } from './actions';

const STATUS_TEXT: Record<string, string> = {
  planning: '規劃中',
  open: '開放中',
  closed: '已截止',
  completed: '已完成',
  cancelled: '已取消',
};

export default async function CompetitionsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: competitions } = await supabase
    .from('competitions')
    .select('id,name,start_date,end_date,location,registration_deadline,status,notes,created_at')
    .order('start_date', { ascending: false });

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TEAM OPERATIONS</div>
        <h1>比賽管理</h1>
        <p>先建立賽事，再逐步安排參賽名單、接送車輛、座位與費用。</p>
        <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生</Link><Link href="/more">更多</Link></div>
      </section>

      {query.created ? <div className="notice successNotice"><b>已建立：</b>新的比賽資料已加入。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>建立失敗：</b>{query.error}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>新增比賽</h2></div></div>
        <form action={createCompetition} className="competitionCreateGrid">
          <label>比賽名稱<input name="name" required placeholder="例如：縣長盃桌球錦標賽" /></label>
          <label>開始日期<input name="start_date" type="date" required /></label>
          <label>結束日期<input name="end_date" type="date" /></label>
          <label>報名截止<input name="registration_deadline" type="date" /></label>
          <label className="wideField">比賽地點<input name="location" placeholder="例如：彰化縣立體育館" /></label>
          <label className="wideField">備註<textarea name="notes" rows={3} placeholder="集合時間、組別、注意事項等" /></label>
          <button className="primaryButton wideField">＋ 建立比賽</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>比賽列表</h2></div><strong>{competitions?.length ?? 0} 場</strong></div>
        {!competitions?.length ? <p className="muted">目前還沒有比賽，先建立第一場賽事。</p> : (
          <div className="competitionList">
            {competitions.map((competition) => (
              <Link key={competition.id} className="competitionCard" href={`/competitions/${competition.id}`}>
                <div>
                  <b>{competition.name}</b>
                  <small>{competition.start_date}{competition.end_date && competition.end_date !== competition.start_date ? ` ～ ${competition.end_date}` : ''}{competition.location ? ` · ${competition.location}` : ''}</small>
                </div>
                <div className="competitionCardMeta">
                  <span>{STATUS_TEXT[competition.status] ?? competition.status}</span>
                  {competition.registration_deadline ? <small>截止 {competition.registration_deadline}</small> : null}
                  <strong>管理 ›</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .competitionCreateGrid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:12px}.competitionCreateGrid label{font-size:12px;font-weight:800;color:#647184}.competitionCreateGrid input,.competitionCreateGrid textarea{width:100%;margin-top:6px;border:1px solid #dce2ea;border-radius:12px;padding:12px 13px;background:#fff;font:inherit}.competitionCreateGrid textarea{resize:vertical}.competitionCreateGrid .wideField{grid-column:1/-1}.competitionList{display:flex;flex-direction:column;gap:10px}.competitionCard{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #e1e6ec;border-radius:16px;padding:15px;text-decoration:none;color:inherit;background:#fff}.competitionCard:hover{background:#f8fafc}.competitionCard b{display:block}.competitionCard small{display:block;color:#738093;margin-top:4px}.competitionCardMeta{text-align:right}.competitionCardMeta span{display:inline-block;background:#edf1f5;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:800}.competitionCardMeta strong{display:block;margin-top:5px}@media(max-width:780px){.competitionCreateGrid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.competitionCreateGrid{grid-template-columns:1fr}.competitionCreateGrid .wideField{grid-column:auto}.competitionCard{align-items:flex-start}.competitionCardMeta{min-width:92px}}
      `}</style>
    </main>
  );
}
