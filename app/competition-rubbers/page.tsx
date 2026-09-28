import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const STATUS_TEXT: Record<string,string> = { planning:'規劃中', open:'開放中', closed:'已截止', completed:'已完成', cancelled:'已取消' };

export default async function CompetitionRubbersPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: competitions } = await supabase
    .from('competitions')
    .select('id,name,start_date,end_date,location,status')
    .order('start_date', { ascending: false });

  const ids = (competitions ?? []).map((c) => c.id);
  const { data: orders } = ids.length
    ? await supabase.from('competition_rubber_orders').select('competition_id,workflow_status,payment_status').in('competition_id', ids)
    : { data: [] as any[] };

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">EQUIPMENT MANAGEMENT</div>
        <h1>比賽球皮管理</h1>
        <p>先維護球皮資料庫與庫存，再依每場比賽的參賽名單快速安排正反手球皮與訂貨數量。</p>
        <div className="topNav"><Link href="/rubber-catalog">球皮資料庫／庫存</Link><Link href="/competitions">比賽管理</Link><Link href="/more">更多功能</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>使用流程</h2></div></div>
        <div className="notice"><b>建議流程：</b>先在「球皮資料庫／庫存」建立品牌、型號、厚度、顏色、成本、售價與庫存 → 再選比賽快速配置參賽學生 → 系統自動彙整需求、庫存與需訂購數量。</div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>選擇比賽</h2></div><strong>{competitions?.length ?? 0} 場</strong></div>
        {!competitions?.length ? <p className="muted">目前沒有比賽，請先建立比賽。</p> : <div className="rubberCompetitionList">
          {competitions.map((competition) => {
            const rows = (orders ?? []).filter((row:any) => row.competition_id === competition.id);
            const unfinished = rows.filter((row:any) => !['delivered','cancelled'].includes(row.workflow_status)).length;
            const unpaid = rows.filter((row:any) => !['paid','waived'].includes(row.payment_status)).length;
            return <Link className="rubberCompetitionCard" href={`/competitions/${competition.id}/rubbers`} key={competition.id}>
              <div><b>{competition.name}</b><small>{competition.start_date}{competition.end_date && competition.end_date !== competition.start_date ? ` ～ ${competition.end_date}` : ''}{competition.location ? ` · ${competition.location}` : ''}</small></div>
              <div className="rubberCompetitionMeta"><span>{STATUS_TEXT[competition.status] ?? competition.status}</span><small>{rows.length} 片需求 · {unfinished} 筆未完成 · {unpaid} 筆待付款</small><strong>管理球皮 ›</strong></div>
            </Link>;
          })}
        </div>}
      </section>

      <style>{`.rubberCompetitionList{display:flex;flex-direction:column;gap:10px}.rubberCompetitionCard{display:flex;justify-content:space-between;gap:16px;border:1px solid #e1e6ec;border-radius:16px;padding:15px;background:#fff;color:inherit;text-decoration:none}.rubberCompetitionCard b,.rubberCompetitionCard small{display:block}.rubberCompetitionCard small{color:#738093;margin-top:4px}.rubberCompetitionMeta{text-align:right}.rubberCompetitionMeta span{display:inline-block;padding:6px 9px;border-radius:999px;background:#edf1f5;font-size:12px;font-weight:800}.rubberCompetitionMeta strong{display:block;margin-top:5px}@media(max-width:620px){.rubberCompetitionCard{align-items:flex-start}.rubberCompetitionMeta{min-width:130px}}`}</style>
    </main>
  );
}
