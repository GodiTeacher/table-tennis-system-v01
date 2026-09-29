import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DataPortTools from '@/components/DataPortTools';
import { adjustRubberInventory } from './actions';

const MOVE_TEXT: Record<string,string> = { in:'入庫', out:'出庫', adjustment:'盤點調整', competition_use:'比賽領用' };

export default async function RubberInventoryPage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const [{ data: catalog }, { data: movements }] = await Promise.all([
    supabase.from('rubber_catalog').select('id,brand,model,sponge_thickness,color,stock_quantity,min_stock,cost_price,sale_price,active').order('active',{ascending:false}).order('brand').order('model'),
    supabase.from('rubber_stock_movements').select('id,movement_type,quantity_change,stock_before,stock_after,unit_cost,note,created_at,catalog_id,competition_id,student_id,rubber_catalog(brand,model,sponge_thickness,color),competitions(name),students(display_name)').order('created_at',{ascending:false}).limit(100),
  ]);

  const active = (catalog ?? []).filter((item:any)=>item.active);
  const totalStock = active.reduce((sum:number,item:any)=>sum+Number(item.stock_quantity ?? 0),0);
  const totalCost = active.reduce((sum:number,item:any)=>sum+Number(item.stock_quantity ?? 0)*Number(item.cost_price ?? 0),0);
  const lowStock = active.filter((item:any)=>Number(item.stock_quantity ?? 0)<=Number(item.min_stock ?? 0));
  const movementRows = (movements ?? []).map((row:any)=>({
    時間: new Date(row.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}),
    球皮: [row.rubber_catalog?.brand,row.rubber_catalog?.model,row.rubber_catalog?.sponge_thickness,row.rubber_catalog?.color].filter(Boolean).join(' '),
    類型: MOVE_TEXT[row.movement_type] ?? row.movement_type,
    異動: Number(row.quantity_change),
    異動前: Number(row.stock_before),
    異動後: Number(row.stock_after),
    學生: row.students?.display_name ?? '',
    比賽: row.competitions?.name ?? '',
    備註: row.note ?? '',
  }));

  const usageRows = (movements ?? []).filter((row:any)=>row.movement_type==='competition_use');

  return <main className="shell">
    <section className="hero compactHero">
      <div className="eyebrow">RUBBER INVENTORY V2</div>
      <h1>球皮庫存異動</h1>
      <p>所有入庫、出庫、盤點與比賽實際領用都留下紀錄；比賽球皮標記「已黏貼／已交付」時會自動扣庫存一次。</p>
      <div className="topNav"><Link href="/rubber-catalog">球皮資料庫</Link><Link href="/competition-rubbers">比賽球皮</Link><Link href="/more">更多</Link></div>
    </section>

    {query.updated ? <div className="notice successNotice"><b>已更新：</b>庫存異動已記錄。</div> : null}
    {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

    <section className="competitionSummaryGrid">
      <div className="statCard"><span>啟用款式</span><strong>{active.length}</strong><small>款</small></div>
      <div className="statCard"><span>目前庫存</span><strong>{totalStock}</strong><small>片</small></div>
      <div className="statCard"><span>庫存成本</span><strong>{Math.round(totalCost).toLocaleString()}</strong><small>元</small></div>
      <div className="statCard"><span>低庫存</span><strong>{lowStock.length}</strong><small>款</small></div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>庫存異動</h2></div></div>
      <form action={adjustRubberInventory} className="inventoryForm">
        <label>球皮<select name="catalog_id" required defaultValue=""><option value="" disabled>選擇球皮</option>{active.map((item:any)=><option value={item.id} key={item.id}>{item.brand} {item.model}{item.sponge_thickness?` · ${item.sponge_thickness}`:''}{item.color?` · ${item.color}`:''}｜庫存 {item.stock_quantity}</option>)}</select></label>
        <label>異動類型<select name="mode" defaultValue="in"><option value="in">入庫增加</option><option value="out">手動出庫</option><option value="adjust_plus">盤點增加</option><option value="adjust_minus">盤點減少</option></select></label>
        <label>片數<input name="quantity" type="number" min="1" step="1" defaultValue="1" required/></label>
        <label className="wideField">備註<input name="note" placeholder="例如：9/29 進貨、盤點修正、測試用等"/></label>
        <button className="primaryButton wideField">儲存庫存異動</button>
      </form>
      <p className="muted" style={{marginTop:10}}>比賽換皮若從球皮資料庫選擇品項，並在比賽球皮頁改為「已黏貼」或「已交付」，系統會自動建立「比賽領用 -1」紀錄。</p>
    </section>

    {lowStock.length ? <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>低庫存提醒</h2></div><strong>{lowStock.length} 款</strong></div>
      <div className="inventoryAlertList">{lowStock.map((item:any)=><div key={item.id}><b>{item.brand} {item.model}</b><span>目前 {item.stock_quantity} 片｜安全庫存 {item.min_stock} 片</span></div>)}</div>
    </section> : null}

    <section className="card">
      <div className="sectionTitle"><div><span>03</span><h2>異動紀錄</h2></div><strong>{movements?.length ?? 0} 筆</strong></div>
      <DataPortTools title="球皮庫存異動" rows={movementRows} filename="球皮庫存異動" />
      {!movements?.length ? <p className="muted">尚無庫存異動紀錄。</p> : <div className="movementList">{(movements ?? []).map((row:any)=><article key={row.id}>
        <div><b>{row.rubber_catalog?.brand} {row.rubber_catalog?.model}</b><small>{new Date(row.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}{row.students?.display_name?` · ${row.students.display_name}`:''}{row.competitions?.name?` · ${row.competitions.name}`:''}</small></div>
        <div className={Number(row.quantity_change)>0?'stockPlus':'stockMinus'}><strong>{Number(row.quantity_change)>0?'+':''}{row.quantity_change}</strong><small>{MOVE_TEXT[row.movement_type] ?? row.movement_type}</small></div>
        <div><span>{row.stock_before} → {row.stock_after} 片</span>{row.note?<small>{row.note}</small>:null}</div>
      </article>)}</div>}
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>04</span><h2>學生歷史用皮</h2></div><strong>{usageRows.length} 筆領用</strong></div>
      {!usageRows.length ? <p className="muted">目前還沒有比賽實際領用紀錄；之後每次已黏貼的球皮都會自動累積在這裡。</p> : <div className="movementList">{usageRows.map((row:any)=><article key={row.id}>
        <div><b>{row.students?.display_name ?? '學生'}</b><small>{row.competitions?.name ?? '比賽'}</small></div>
        <div><strong>{row.rubber_catalog?.brand} {row.rubber_catalog?.model}</strong><small>{[row.rubber_catalog?.sponge_thickness,row.rubber_catalog?.color].filter(Boolean).join(' · ')}</small></div>
        <div><span>{new Date(row.created_at).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}</span></div>
      </article>)}</div>}
    </section>

    <style>{`.inventoryForm{display:grid;grid-template-columns:2fr 1fr .7fr;gap:10px}.inventoryForm label{font-size:12px;font-weight:800;color:#647184}.inventoryForm input,.inventoryForm select{width:100%;margin-top:5px;border:1px solid #dce2ea;border-radius:10px;padding:10px;background:#fff;font:inherit}.wideField{grid-column:1/-1}.inventoryAlertList{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.inventoryAlertList div{padding:12px;border:1px solid #f0d9d9;background:#fff7f7;border-radius:12px}.inventoryAlertList b,.inventoryAlertList span{display:block}.inventoryAlertList span{margin-top:4px;color:#8d4d4d}.movementList{display:flex;flex-direction:column;gap:8px;margin-top:12px}.movementList article{display:grid;grid-template-columns:1.5fr .7fr 1fr;gap:12px;align-items:center;padding:12px;border:1px solid #e1e6ec;border-radius:13px}.movementList small{display:block;color:#738093;margin-top:3px}.stockPlus strong{color:#17663a}.stockMinus strong{color:#a33}@media(max-width:700px){.inventoryForm{grid-template-columns:1fr}.wideField{grid-column:auto}.inventoryAlertList{grid-template-columns:1fr}.movementList article{grid-template-columns:1fr}.movementList article>div:nth-child(2),.movementList article>div:nth-child(3){display:flex;justify-content:space-between;align-items:center}}`}</style>
  </main>;
}
