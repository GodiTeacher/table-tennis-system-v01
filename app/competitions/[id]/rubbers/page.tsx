import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { createRubberOrder, deleteRubberOrder, updateRubberOrder } from './actions';

const SIDE_TEXT: Record<string,string> = { forehand:'正手', backhand:'反手' };
const COLOR_TEXT: Record<string,string> = { red:'紅', black:'黑', other:'其他' };
const PAYMENT_TEXT: Record<string,string> = { unpaid:'未付款', partial:'部分付款', paid:'已付款', waived:'免收' };
const WORKFLOW_TEXT: Record<string,string> = { requested:'待處理', ordered:'已訂貨', arrived:'已到貨', glued:'已黏貼', delivered:'已交付', cancelled:'已取消' };

export default async function CompetitionRubberDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const [{ data: competition }, { data: students }, { data: orders }] = await Promise.all([
    supabase.from('competitions').select('id,name,start_date,end_date,location').eq('id', id).single(),
    supabase.from('students').select('id,display_name,grade,class_name').eq('active', true).order('grade').order('display_name'),
    supabase.from('competition_rubber_orders').select('*').eq('competition_id', id).order('created_at'),
  ]);
  if (!competition) notFound();

  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const totalDue = (orders ?? []).reduce((sum,row:any)=>sum+Number(row.amount_due ?? 0),0);
  const totalPaid = (orders ?? []).reduce((sum,row:any)=>sum+Number(row.amount_paid ?? 0),0);
  const unfinished = (orders ?? []).filter((row:any)=>!['delivered','cancelled'].includes(row.workflow_status)).length;

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">COMPETITION RUBBERS</div>
        <h1>{competition.name}</h1>
        <p>比賽球皮管理 · {competition.start_date}{competition.end_date && competition.end_date !== competition.start_date ? ` ～ ${competition.end_date}` : ''}</p>
        <div className="topNav"><Link href="/competition-rubbers">球皮管理列表</Link><Link href={`/competitions/${id}`}>比賽管理</Link><Link href="/more">更多</Link></div>
      </section>

      {query.created ? <div className="notice successNotice"><b>已新增：</b>球皮需求已加入。</div> : null}
      {query.updated ? <div className="notice successNotice"><b>已更新：</b>球皮與付款進度已儲存。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

      <section className="competitionSummaryGrid">
        <div className="statCard"><span>球皮需求</span><strong>{orders?.length ?? 0}</strong><small>筆</small></div>
        <div className="statCard"><span>未完成</span><strong>{unfinished}</strong><small>筆</small></div>
        <div className="statCard"><span>應收總額</span><strong>{totalDue.toLocaleString()}</strong><small>元</small></div>
        <div className="statCard"><span>未收</span><strong>{Math.max(0,totalDue-totalPaid).toLocaleString()}</strong><small>元</small></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>新增換皮需求</h2></div></div>
        <form action={createRubberOrder} className="rubberForm">
          <input type="hidden" name="competition_id" value={id}/>
          <label>學生<select name="student_id" required defaultValue=""><option value="" disabled>選擇學生</option>{(students ?? []).map((s)=><option value={s.id} key={s.id}>{s.display_name}{s.grade ? `｜${s.grade}年級` : ''}{s.class_name ? `｜${s.class_name}` : ''}</option>)}</select></label>
          <label>面別<select name="side"><option value="forehand">正手</option><option value="backhand">反手</option></select></label>
          <label>品牌<input name="rubber_brand" placeholder="例如：Butterfly"/></label>
          <label>型號<input name="rubber_model" required placeholder="例如：Tenergy 05"/></label>
          <label>厚度<input name="sponge_thickness" placeholder="例如：2.1 / MAX"/></label>
          <label>顏色<select name="color" defaultValue=""><option value="">未設定</option><option value="red">紅</option><option value="black">黑</option><option value="other">其他</option></select></label>
          <label>球皮價格<input name="rubber_price" type="number" min="0" step="1" defaultValue="0"/></label>
          <label>工資<input name="labor_fee" type="number" min="0" step="1" defaultValue="0"/></label>
          <label>護邊<input name="edge_tape_fee" type="number" min="0" step="1" defaultValue="0"/></label>
          <label>付款給誰<input name="payee" placeholder="例如：教練／廠商"/></label>
          <label className="wideField">備註<input name="notes" placeholder="特殊需求、到貨提醒等"/></label>
          <button className="primaryButton wideField">＋ 新增球皮需求</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>目前球皮需求</h2></div><strong>{orders?.length ?? 0} 筆</strong></div>
        {!orders?.length ? <p className="muted">目前還沒有球皮需求。</p> : <div className="rubberOrderList">{orders.map((order:any)=>{
          const student = studentMap.get(order.student_id);
          return <article className="rubberOrderCard" key={order.id}>
            <div className="rubberOrderHead">
              <div><b>{student?.display_name ?? '未知學生'} · {SIDE_TEXT[order.side] ?? order.side}</b><small>{[order.rubber_brand,order.rubber_model,order.sponge_thickness,COLOR_TEXT[order.color]].filter(Boolean).join(' · ')}</small></div>
              <div><span>{WORKFLOW_TEXT[order.workflow_status] ?? order.workflow_status}</span><strong>${Number(order.amount_due ?? 0).toLocaleString()}</strong></div>
            </div>
            <form action={updateRubberOrder} className="rubberEditGrid">
              <input type="hidden" name="competition_id" value={id}/><input type="hidden" name="order_id" value={order.id}/>
              <label>品牌<input name="rubber_brand" defaultValue={order.rubber_brand ?? ''}/></label>
              <label>型號<input name="rubber_model" required defaultValue={order.rubber_model}/></label>
              <label>厚度<input name="sponge_thickness" defaultValue={order.sponge_thickness ?? ''}/></label>
              <label>顏色<select name="color" defaultValue={order.color ?? ''}><option value="">未設定</option><option value="red">紅</option><option value="black">黑</option><option value="other">其他</option></select></label>
              <label>球皮價<input name="rubber_price" type="number" min="0" step="1" defaultValue={Number(order.rubber_price ?? 0)}/></label>
              <label>工資<input name="labor_fee" type="number" min="0" step="1" defaultValue={Number(order.labor_fee ?? 0)}/></label>
              <label>護邊<input name="edge_tape_fee" type="number" min="0" step="1" defaultValue={Number(order.edge_tape_fee ?? 0)}/></label>
              <label>已付<input name="amount_paid" type="number" min="0" step="1" defaultValue={Number(order.amount_paid ?? 0)}/></label>
              <label>付款給誰<input name="payee" defaultValue={order.payee ?? ''}/></label>
              <label>付款狀態<select name="payment_status" defaultValue={order.payment_status}>{Object.entries(PAYMENT_TEXT).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <label>處理進度<select name="workflow_status" defaultValue={order.workflow_status}>{Object.entries(WORKFLOW_TEXT).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <label className="wideField">備註<input name="notes" defaultValue={order.notes ?? ''}/></label>
              <button className="primaryButton">儲存修改</button>
            </form>
            <form action={deleteRubberOrder} className="rubberDeleteForm"><input type="hidden" name="competition_id" value={id}/><input type="hidden" name="order_id" value={order.id}/><ConfirmSubmitButton className="secondaryButton dangerText" confirmText="確定要刪除這筆球皮需求嗎？">刪除</ConfirmSubmitButton></form>
          </article>;
        })}</div>}
      </section>

      <style>{`.rubberForm,.rubberEditGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.rubberForm label,.rubberEditGrid label{font-size:12px;font-weight:800;color:#647184}.rubberForm input,.rubberForm select,.rubberEditGrid input,.rubberEditGrid select{width:100%;margin-top:5px;border:1px solid #dce2ea;border-radius:10px;padding:10px;background:#fff;font:inherit}.wideField{grid-column:1/-1}.rubberOrderList{display:flex;flex-direction:column;gap:12px}.rubberOrderCard{border:1px solid #e1e6ec;border-radius:16px;padding:14px;background:#fbfcfe}.rubberOrderHead{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}.rubberOrderHead small{display:block;color:#738093;margin-top:4px}.rubberOrderHead>div:last-child{text-align:right}.rubberOrderHead span{display:block;font-size:12px;font-weight:800;background:#edf1f5;border-radius:999px;padding:6px 9px}.rubberOrderHead strong{display:block;margin-top:6px}.rubberDeleteForm{margin-top:8px;text-align:right}.dangerText{color:#a33}@media(max-width:900px){.rubberForm,.rubberEditGrid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.rubberForm,.rubberEditGrid{grid-template-columns:1fr}.wideField{grid-column:auto}.rubberOrderHead{align-items:flex-start}.rubberOrderHead>div:last-child{min-width:90px}}`}</style>
    </main>
  );
}
