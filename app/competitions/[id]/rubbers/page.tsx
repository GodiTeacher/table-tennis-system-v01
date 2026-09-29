import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import RubberExportTools from '@/components/RubberExportTools';
import { createRubberOrder, deleteRubberOrder, saveQuickRubberAssignments, updateRubberOrder } from './actions';

const SIDE_TEXT: Record<string,string> = { forehand:'正手', backhand:'反手' };
const COLOR_TEXT: Record<string,string> = { red:'紅', black:'黑', other:'其他' };
const PAYMENT_TEXT: Record<string,string> = { unpaid:'未付款', partial:'部分付款', paid:'已付款', waived:'免收' };
const WORKFLOW_TEXT: Record<string,string> = { requested:'待處理', ordered:'已訂貨', arrived:'已到貨', glued:'已黏貼', delivered:'已交付', cancelled:'已取消' };

function catalogLabel(item:any) {
  return [item.brand, item.model, item.sponge_thickness, COLOR_TEXT[item.color], `庫存${item.stock_quantity}`, `$${Number(item.sale_price ?? 0).toLocaleString()}`].filter(Boolean).join(' · ');
}

export default async function CompetitionRubberDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const [{ data: competition }, { data: participantRows }, { data: orders }, { data: catalog }] = await Promise.all([
    supabase.from('competitions').select('id,name,start_date,end_date,location').eq('id', id).single(),
    supabase.from('competition_participants').select('student_id,competition_date,category').eq('competition_id', id).order('competition_date'),
    supabase.from('competition_rubber_orders').select('*').eq('competition_id', id).order('created_at'),
    supabase.from('rubber_catalog').select('*').eq('active', true).order('brand').order('model').order('color'),
  ]);
  if (!competition) notFound();

  const participantIds = [...new Set((participantRows ?? []).map((row:any)=>row.student_id))];
  const { data: students } = participantIds.length
    ? await supabase.from('students').select('id,display_name,grade,class_name,gender').in('id', participantIds).order('grade').order('display_name')
    : { data: [] as any[] };
  const participantSet = new Set(participantIds);
  const participantStudents = (students ?? []).filter((student:any)=>participantSet.has(student.id));
  const studentMap = new Map(participantStudents.map((student:any) => [student.id, student]));
  const orderMap = new Map((orders ?? []).map((row:any)=>[`${row.student_id}:${row.side}`, row]));
  const catalogMap = new Map((catalog ?? []).map((item:any)=>[item.id,item]));

  const totalDue = (orders ?? []).reduce((sum,row:any)=>sum+Number(row.amount_due ?? 0),0);
  const totalPaid = (orders ?? []).reduce((sum,row:any)=>sum+Number(row.amount_paid ?? 0),0);
  const unfinished = (orders ?? []).filter((row:any)=>!['delivered','cancelled'].includes(row.workflow_status)).length;

  const demand = new Map<string,{ item:any; quantity:number }>();
  for (const order of orders ?? []) {
    if (!order.catalog_id || order.workflow_status === 'cancelled') continue;
    const item:any = catalogMap.get(order.catalog_id);
    if (!item) continue;
    const current = demand.get(item.id) ?? { item, quantity:0 };
    current.quantity += 1;
    demand.set(item.id,current);
  }
  const demandRows = [...demand.values()].sort((a,b)=>`${a.item.brand}${a.item.model}`.localeCompare(`${b.item.brand}${b.item.model}`,'zh-Hant'));
  const shortageTotal = demandRows.reduce((sum,row)=>sum+Math.max(0,row.quantity-Number(row.item.stock_quantity ?? 0)),0);
  const purchaseCost = demandRows.reduce((sum,row)=>sum+Math.max(0,row.quantity-Number(row.item.stock_quantity ?? 0))*Number(row.item.cost_price ?? 0),0);

  const studentGroups = participantStudents.map((student:any)=>{
    const rows = (orders ?? []).filter((order:any)=>order.student_id === student.id).sort((a:any,b:any)=>a.side === 'forehand' ? -1 : b.side === 'forehand' ? 1 : 0);
    const due = rows.reduce((sum:number,row:any)=>sum+Number(row.amount_due ?? 0),0);
    const paid = rows.reduce((sum:number,row:any)=>sum+Number(row.amount_paid ?? 0),0);
    return { student, rows, due, paid, balance:Math.max(0,due-paid) };
  }).filter((group:any)=>group.rows.length > 0);
  const unpaidStudents = studentGroups.filter((group:any)=>group.balance > 0).length;
  const dateText = competition.end_date && competition.end_date !== competition.start_date ? `${competition.start_date} ～ ${competition.end_date}` : competition.start_date;
  const exportStudents = studentGroups.map((group:any)=>({
    studentId: group.student.id,
    name: group.student.display_name,
    grade: group.student.grade,
    className: group.student.class_name,
    totalDue: group.due,
    totalPaid: group.paid,
    balance: group.balance,
    sides: group.rows.map((order:any)=>{
      const item:any = order.catalog_id ? catalogMap.get(order.catalog_id) : null;
      return {
        side: order.side,
        label: SIDE_TEXT[order.side] ?? order.side,
        brand: order.rubber_brand,
        model: order.rubber_model,
        thickness: order.sponge_thickness,
        color: COLOR_TEXT[order.color] ?? order.color,
        amountDue: Number(order.amount_due ?? 0),
        amountPaid: Number(order.amount_paid ?? 0),
        paymentStatus: PAYMENT_TEXT[order.payment_status] ?? order.payment_status,
        workflowStatus: WORKFLOW_TEXT[order.workflow_status] ?? order.workflow_status,
        payee: order.payee,
        cost: Number(item?.cost_price ?? 0),
      };
    }),
  }));

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">COMPETITION RUBBERS</div>
        <h1>{competition.name}</h1>
        <p>比賽球皮管理 · {dateText}</p>
        <div className="topNav"><Link href="/rubber-catalog">球皮資料庫／庫存</Link><Link href="/competition-rubbers">球皮管理列表</Link><Link href={`/competitions/${id}`}>比賽管理</Link></div>
      </section>

      {query.saved ? <div className="notice successNotice"><b>快速配置已儲存：</b>正反手球皮已同步更新。</div> : null}
      {query.created ? <div className="notice successNotice"><b>已新增：</b>球皮需求已加入。</div> : null}
      {query.updated ? <div className="notice successNotice"><b>已更新：</b>球皮與付款進度已儲存。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

      <section className="competitionSummaryGrid">
        <div className="statCard"><span>參賽學生</span><strong>{participantStudents.length}</strong><small>人</small></div>
        <div className="statCard"><span>球皮需求</span><strong>{orders?.length ?? 0}</strong><small>片</small></div>
        <div className="statCard"><span>尚缺庫存</span><strong>{shortageTotal}</strong><small>片</small></div>
        <div className="statCard"><span>預估補貨成本</span><strong>{Math.round(purchaseCost).toLocaleString()}</strong><small>元</small></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>參賽選手快速配置</h2></div><strong>{participantStudents.length} 人</strong></div>
        <div className="notice"><b>名單已和比賽管理綁定：</b>這裡只會顯示已加入這場比賽的學生。同一位學生即使參加多天、多組別，在換皮清單仍只會出現一次。</div>
        {!participantStudents.length ? <p className="muted">這場比賽尚未加入參賽學生，請先到比賽管理建立參賽名單。</p> : !(catalog ?? []).length ? <div className="notice"><b>還沒有球皮資料：</b>請先到「球皮資料庫／庫存」新增常用球皮，再回來快速配置。</div> : (
          <form action={saveQuickRubberAssignments}>
            <input type="hidden" name="competition_id" value={id}/>
            <div className="quickRubberTable">
              <div className="quickHeader"><b>選手</b><b>正手</b><b>反手</b></div>
              {participantStudents.map((student:any)=>{
                const fh:any = orderMap.get(`${student.id}:forehand`);
                const bh:any = orderMap.get(`${student.id}:backhand`);
                return <div className="quickRow" key={student.id}>
                  <div><b>{student.display_name}</b><small>{[student.grade ? `${student.grade}年級` : null,student.class_name,student.gender].filter(Boolean).join(' · ')}</small></div>
                  <select name={`forehand_${student.id}`} defaultValue={fh?.catalog_id ?? ''}><option value="">不更換／清除</option>{(catalog ?? []).map((item:any)=><option value={item.id} key={item.id}>{catalogLabel(item)}</option>)}</select>
                  <select name={`backhand_${student.id}`} defaultValue={bh?.catalog_id ?? ''}><option value="">不更換／清除</option>{(catalog ?? []).map((item:any)=><option value={item.id} key={item.id}>{catalogLabel(item)}</option>)}</select>
                </div>;
              })}
            </div>
            <button className="primaryButton quickSave">一次儲存全部正／反手配置</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>本場訂貨／庫存統計</h2></div><strong>{demandRows.length} 款</strong></div>
        {!demandRows.length ? <p className="muted">完成上方快速配置後，這裡會自動彙整要準備與訂購的球皮。</p> : <div className="orderSummaryTable">
          <div className="orderSummaryHeader"><b>球皮</b><b>需求</b><b>庫存</b><b>需訂</b><b>成本</b><b>售價</b></div>
          {demandRows.map(({item,quantity})=>{
            const stock = Number(item.stock_quantity ?? 0);
            const shortage = Math.max(0,quantity-stock);
            return <div className="orderSummaryRow" key={item.id}>
              <div><b>{item.brand} {item.model}</b><small>{[item.sponge_thickness,COLOR_TEXT[item.color]].filter(Boolean).join(' · ')}</small></div>
              <strong>{quantity} 片</strong><span>{stock} 片</span><strong className={shortage ? 'needOrder' : ''}>{shortage} 片</strong><span>${Number(item.cost_price ?? 0).toLocaleString()}</span><span>${Number(item.sale_price ?? 0).toLocaleString()}</span>
            </div>;
          })}
        </div>}
        <div className="summaryFooter"><span>本場共需 <b>{[...demand.values()].reduce((s,r)=>s+r.quantity,0)}</b> 片</span><span>需補貨 <b>{shortageTotal}</b> 片</span><span>預估補貨成本 <b>${Math.round(purchaseCost).toLocaleString()}</b></span></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>付款與處理進度</h2></div><strong>{studentGroups.length} 人</strong></div>
        <div className="notice"><b>以學生為單位：</b>正手、反手需求會收在同一張卡片，先看這位學生的總應付／已付／未付，再往下調整每一面的球皮與處理狀態。</div>
        {!studentGroups.length ? <p className="muted">目前還沒有球皮需求。</p> : <div className="studentRubberList">{studentGroups.map((group:any)=>{
          return <article className="studentRubberCard" key={group.student.id}>
            <div className="studentRubberHead">
              <div><b>{group.student.display_name}</b><small>{[group.student.grade ? `${group.student.grade}年級` : null,group.student.class_name,group.student.gender].filter(Boolean).join(' · ')}｜{group.rows.length} 面換皮</small></div>
              <div className="studentMoney"><span>應付 <b>${group.due.toLocaleString()}</b></span><span>已付 <b>${group.paid.toLocaleString()}</b></span><span className={group.balance ? 'balanceDue' : 'balanceClear'}>未付 <b>${group.balance.toLocaleString()}</b></span></div>
            </div>
            <div className="studentSides">{group.rows.map((order:any)=>{
              return <section className="rubberSideBlock" key={order.id}>
                <div className="rubberOrderHead">
                  <div><b>{SIDE_TEXT[order.side] ?? order.side}｜{order.rubber_brand ?? ''} {order.rubber_model}</b><small>{[order.sponge_thickness,COLOR_TEXT[order.color]].filter(Boolean).join(' · ')}</small></div>
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
                  <button className="primaryButton">儲存這一面</button>
                </form>
                <form action={deleteRubberOrder} className="rubberDeleteForm"><input type="hidden" name="competition_id" value={id}/><input type="hidden" name="order_id" value={order.id}/><ConfirmSubmitButton className="secondaryButton dangerText" confirmText="確定要刪除這一面的球皮需求嗎？">刪除這一面</ConfirmSubmitButton></form>
              </section>;
            })}</div>
          </article>;
        })}</div>}
        <div className="moneyFooter"><span>學生 <b>{studentGroups.length}</b> 人</span><span>應收 <b>${totalDue.toLocaleString()}</b></span><span>已收 <b>${totalPaid.toLocaleString()}</b></span><span>未收 <b>${Math.max(0,totalDue-totalPaid).toLocaleString()}</b></span><span>尚未結清 <b>{unpaidStudents}</b> 人</span><span>未完成 <b>{unfinished}</b> 面</span></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>04</span><h2>匯出與分享</h2></div></div>
        <div className="notice"><b>教練版：</b>含成本、付款對象與處理進度；<b>家長版：</b>只顯示學生球皮、應付／已付／未付，不會顯示成本。</div>
        <RubberExportTools competitionName={competition.name} dateText={dateText} students={exportStudents}/>
        <p className="muted">Excel / CSV 可直接用 Excel 開啟；JSON 適合備份、匯入其他系統或之後做資料分析。</p>
      </section>

      <details className="card">
        <summary><b>進階：手動新增非資料庫球皮</b></summary>
        <form action={createRubberOrder} className="rubberForm manualForm">
          <input type="hidden" name="competition_id" value={id}/>
          <label>參賽學生<select name="student_id" required defaultValue=""><option value="" disabled>選擇學生</option>{participantStudents.map((s:any)=><option value={s.id} key={s.id}>{s.display_name}</option>)}</select></label>
          <label>面別<select name="side"><option value="forehand">正手</option><option value="backhand">反手</option></select></label>
          <label>品牌<input name="rubber_brand"/></label><label>型號<input name="rubber_model" required/></label><label>厚度<input name="sponge_thickness"/></label>
          <label>顏色<select name="color" defaultValue=""><option value="">未設定</option><option value="red">紅</option><option value="black">黑</option><option value="other">其他</option></select></label>
          <label>球皮價格<input name="rubber_price" type="number" min="0" defaultValue="0"/></label><label>工資<input name="labor_fee" type="number" min="0" defaultValue="0"/></label><label>護邊<input name="edge_tape_fee" type="number" min="0" defaultValue="0"/></label>
          <label className="wideField">備註<input name="notes"/></label><button className="primaryButton wideField">新增手動需求</button>
        </form>
      </details>

      <style>{`.quickRubberTable{border:1px solid #e1e6ec;border-radius:16px;overflow:hidden;margin-top:14px}.quickHeader,.quickRow{display:grid;grid-template-columns:minmax(150px,.8fr) 1.4fr 1.4fr;gap:10px;align-items:center;padding:11px 12px}.quickHeader{background:#f1f4f7;color:#637084;font-size:12px}.quickRow+ .quickRow{border-top:1px solid #edf0f3}.quickRow small{display:block;color:#7a8696;margin-top:3px}.quickRow select{width:100%;padding:10px;border:1px solid #dce2ea;border-radius:10px;background:#fff}.quickSave{width:100%;margin-top:12px}.orderSummaryTable{border:1px solid #e1e6ec;border-radius:16px;overflow:hidden}.orderSummaryHeader,.orderSummaryRow{display:grid;grid-template-columns:2fr repeat(5,.65fr);gap:8px;align-items:center;padding:10px 12px}.orderSummaryHeader{background:#f1f4f7;color:#637084;font-size:12px}.orderSummaryRow+ .orderSummaryRow{border-top:1px solid #edf0f3}.orderSummaryRow small{display:block;color:#7a8696;margin-top:3px}.needOrder{color:#a33}.summaryFooter,.moneyFooter{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;padding:12px 14px;border-radius:14px;background:#f3f6f8}.rubberForm,.rubberEditGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.rubberForm label,.rubberEditGrid label{font-size:12px;font-weight:800;color:#647184}.rubberForm input,.rubberForm select,.rubberEditGrid input,.rubberEditGrid select{width:100%;margin-top:5px;border:1px solid #dce2ea;border-radius:10px;padding:10px;background:#fff;font:inherit}.wideField{grid-column:1/-1}.studentRubberList{display:flex;flex-direction:column;gap:14px}.studentRubberCard{border:1px solid #dce2ea;border-radius:18px;background:#fff;overflow:hidden}.studentRubberHead{display:flex;justify-content:space-between;gap:14px;padding:15px;background:#f5f7f9}.studentRubberHead small{display:block;color:#738093;margin-top:4px}.studentMoney{display:flex;gap:12px;align-items:center;flex-wrap:wrap;text-align:right}.studentMoney span{white-space:nowrap}.balanceDue{color:#a33}.balanceClear{color:#17663a}.studentSides{padding:12px;display:flex;flex-direction:column;gap:12px}.rubberSideBlock{border:1px solid #e8ecf0;border-radius:14px;padding:12px;background:#fbfcfe}.rubberOrderHead{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}.rubberOrderHead small{display:block;color:#738093;margin-top:4px}.rubberOrderHead>div:last-child{text-align:right}.rubberOrderHead span{display:block;font-size:12px;font-weight:800;background:#edf1f5;border-radius:999px;padding:6px 9px}.rubberOrderHead strong{display:block;margin-top:6px}.rubberDeleteForm{margin-top:8px;text-align:right}.dangerText{color:#a33}.manualForm{margin-top:14px}@media(max-width:800px){.quickHeader{display:none}.quickRow{grid-template-columns:1fr}.quickRow:before{content:'選手換皮設定';font-size:11px;font-weight:800;color:#8390a0}.orderSummaryHeader{display:none}.orderSummaryRow{grid-template-columns:1.7fr 1fr 1fr}.orderSummaryRow span:nth-of-type(2),.orderSummaryRow span:nth-of-type(3){display:none}.rubberForm,.rubberEditGrid{grid-template-columns:1fr 1fr}.studentRubberHead{flex-direction:column}.studentMoney{text-align:left}}@media(max-width:560px){.rubberForm,.rubberEditGrid{grid-template-columns:1fr}.wideField{grid-column:auto}.rubberOrderHead{align-items:flex-start}.rubberOrderHead>div:last-child{min-width:90px}.studentMoney{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}.studentMoney span{padding:7px;border-radius:9px;background:#fff}}`}</style>
    </main>
  );
}
