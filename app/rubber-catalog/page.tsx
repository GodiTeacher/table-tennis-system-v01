import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { createRubberCatalogItem, deleteRubberCatalogItem, updateRubberCatalogItem } from './actions';

const COLOR_TEXT: Record<string,string> = { red:'紅', black:'黑', other:'其他' };

export default async function RubberCatalogPage({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');
  const { data: items } = await supabase.from('rubber_catalog').select('*').order('active', { ascending:false }).order('brand').order('model').order('color');
  const activeItems = (items ?? []).filter((item:any)=>item.active);
  const totalStock = activeItems.reduce((sum:number,item:any)=>sum+Number(item.stock_quantity ?? 0),0);
  const stockValue = activeItems.reduce((sum:number,item:any)=>sum+Number(item.stock_quantity ?? 0)*Number(item.cost_price ?? 0),0);
  const lowStock = activeItems.filter((item:any)=>Number(item.stock_quantity ?? 0) <= Number(item.min_stock ?? 0)).length;

  return <main className="shell">
    <section className="hero compactHero">
      <div className="eyebrow">RUBBER CATALOG</div>
      <h1>球皮資料庫／庫存</h1>
      <p>先把球隊常用球皮建立在這裡，比賽換皮時直接選，不必重複輸入品牌、型號與價格。</p>
      <div className="topNav"><Link href="/competition-rubbers">比賽球皮管理</Link><Link href="/competitions">比賽管理</Link><Link href="/more">更多</Link></div>
    </section>

    {query.created ? <div className="notice successNotice"><b>已新增：</b>球皮已加入資料庫。</div> : null}
    {query.updated ? <div className="notice successNotice"><b>已更新：</b>庫存與價格已儲存。</div> : null}
    {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

    <section className="competitionSummaryGrid">
      <div className="statCard"><span>啟用款式</span><strong>{activeItems.length}</strong><small>款</small></div>
      <div className="statCard"><span>庫存總片數</span><strong>{totalStock}</strong><small>片</small></div>
      <div className="statCard"><span>庫存成本</span><strong>{Math.round(stockValue).toLocaleString()}</strong><small>元</small></div>
      <div className="statCard"><span>低庫存</span><strong>{lowStock}</strong><small>款</small></div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>新增球皮</h2></div></div>
      <form action={createRubberCatalogItem} className="catalogGrid">
        <label>品牌<input name="brand" required placeholder="Butterfly"/></label>
        <label>型號<input name="model" required placeholder="Tenergy 05"/></label>
        <label>厚度<input name="sponge_thickness" placeholder="2.1 / MAX"/></label>
        <label>顏色<select name="color" defaultValue=""><option value="">未設定</option><option value="red">紅</option><option value="black">黑</option><option value="other">其他</option></select></label>
        <label>SKU／代碼<input name="sku" placeholder="可留空"/></label>
        <label>目前庫存<input name="stock_quantity" type="number" min="0" defaultValue="0"/></label>
        <label>安全庫存<input name="min_stock" type="number" min="0" defaultValue="0"/></label>
        <label>成本<input name="cost_price" type="number" min="0" step="1" defaultValue="0"/></label>
        <label>售價<input name="sale_price" type="number" min="0" step="1" defaultValue="0"/></label>
        <label className="wideField">備註<input name="notes" placeholder="供應商、打法、備貨提醒等"/></label>
        <button className="primaryButton wideField">＋ 新增球皮</button>
      </form>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>球皮清單</h2></div><strong>{items?.length ?? 0} 款</strong></div>
      {!items?.length ? <p className="muted">尚未建立球皮資料，先從上方新增常用款式。</p> : <div className="catalogList">{items.map((item:any)=>{
        const low = item.active && Number(item.stock_quantity ?? 0) <= Number(item.min_stock ?? 0);
        return <article key={item.id} className="catalogCard">
          <div className="catalogHead"><div><b>{item.brand} {item.model}</b><small>{[item.sponge_thickness,COLOR_TEXT[item.color],item.sku].filter(Boolean).join(' · ') || '未設定規格'}</small></div><div><strong>{item.stock_quantity} 片</strong><span className={low ? 'lowStock' : ''}>{low ? '低庫存' : item.active ? '啟用中' : '已停用'}</span></div></div>
          <form action={updateRubberCatalogItem} className="catalogGrid edit"><input type="hidden" name="id" value={item.id}/>
            <label>品牌<input name="brand" required defaultValue={item.brand}/></label>
            <label>型號<input name="model" required defaultValue={item.model}/></label>
            <label>厚度<input name="sponge_thickness" defaultValue={item.sponge_thickness ?? ''}/></label>
            <label>顏色<select name="color" defaultValue={item.color ?? ''}><option value="">未設定</option><option value="red">紅</option><option value="black">黑</option><option value="other">其他</option></select></label>
            <label>SKU<input name="sku" defaultValue={item.sku ?? ''}/></label>
            <label>庫存<input name="stock_quantity" type="number" min="0" defaultValue={item.stock_quantity}/></label>
            <label>安全庫存<input name="min_stock" type="number" min="0" defaultValue={item.min_stock}/></label>
            <label>成本<input name="cost_price" type="number" min="0" step="1" defaultValue={Number(item.cost_price ?? 0)}/></label>
            <label>售價<input name="sale_price" type="number" min="0" step="1" defaultValue={Number(item.sale_price ?? 0)}/></label>
            <label className="switchRow"><input type="checkbox" name="active" defaultChecked={item.active}/>啟用</label>
            <label className="wideField">備註<input name="notes" defaultValue={item.notes ?? ''}/></label>
            <button className="primaryButton">儲存修改</button>
          </form>
          <form action={deleteRubberCatalogItem} className="deleteRow"><input type="hidden" name="id" value={item.id}/><ConfirmSubmitButton className="secondaryButton dangerText" confirmText="確定要刪除這款球皮嗎？已建立的比賽需求仍會保留文字紀錄。">刪除</ConfirmSubmitButton></form>
        </article>;
      })}</div>}
    </section>

    <style>{`.catalogGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.catalogGrid label{font-size:12px;font-weight:800;color:#647184}.catalogGrid input,.catalogGrid select{width:100%;margin-top:5px;border:1px solid #dce2ea;border-radius:10px;padding:10px;background:#fff;font:inherit}.wideField{grid-column:1/-1}.catalogList{display:flex;flex-direction:column;gap:12px}.catalogCard{border:1px solid #e1e6ec;border-radius:16px;padding:14px;background:#fbfcfe}.catalogHead{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}.catalogHead small{display:block;color:#738093;margin-top:4px}.catalogHead>div:last-child{text-align:right}.catalogHead span{display:block;margin-top:4px;color:#637084;font-size:12px;font-weight:800}.catalogHead .lowStock{color:#a33}.deleteRow{text-align:right;margin-top:8px}.dangerText{color:#a33}@media(max-width:980px){.catalogGrid{grid-template-columns:repeat(3,1fr)}}@media(max-width:620px){.catalogGrid{grid-template-columns:1fr 1fr}.wideField{grid-column:1/-1}.catalogHead{align-items:flex-start}}`}</style>
  </main>;
}
