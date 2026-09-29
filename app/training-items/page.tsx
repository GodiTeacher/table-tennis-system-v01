import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { createCustomTrainingItem, deleteCustomTrainingItem, updateCustomTrainingItem } from './actions';

const LEVELS = ['A','B','C','D','E','F'] as const;
const DOMAINS = ['控球與擊球','移動與銜接','旋轉發接發','實戰與戰術','打法與專項發展','身體與比賽習慣'];

type SkillRow = {
  id: string;
  name: string;
  domain: string;
  subcategory: string | null;
  goal: string | null;
  notes: string | null;
  recommended_levels: string[] | null;
  is_active: boolean;
};

export default async function TrainingItemsPage({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; deleted?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');
  const { data: customItems } = await supabase
    .from('skills')
    .select('id,name,domain,subcategory,goal,notes,recommended_levels,is_active')
    .eq('is_custom', true)
    .order('is_active', { ascending: false })
    .order('domain')
    .order('name');

  const items = (customItems ?? []) as SkillRow[];
  return <main className="shell">
    <section className="hero compactHero">
      <div className="eyebrow">TRAINING LIBRARY</div>
      <h1>自訂訓練項目</h1>
      <p>保留系統預設技能，同時建立屬於自己隊伍的訓練項目；新增後會直接出現在「今日訓練」的 A～F 推薦清單。</p>
      <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/history">歷史訓練</Link><Link href="/more">更多</Link></div>
    </section>

    {query.created ? <div className="notice successNotice"><b>已新增：</b>自訂訓練項目已加入隊伍技能庫。</div> : null}
    {query.updated ? <div className="notice successNotice"><b>已更新：</b>訓練項目設定已儲存。</div> : null}
    {query.deleted ? <div className="notice successNotice"><b>已刪除：</b>自訂項目已移除。</div> : null}
    {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>新增訓練項目</h2></div></div>
      <form action={createCustomTrainingItem} className="customItemGrid">
        <label>項目名稱<input name="name" required placeholder="例如：反手兩點轉正手搶攻"/></label>
        <label>訓練面向<select name="domain" required defaultValue=""><option value="" disabled>選擇面向</option>{DOMAINS.map((domain)=><option key={domain} value={domain}>{domain}</option>)}</select></label>
        <label>分類<input name="subcategory" required placeholder="例如：前三板／步法／多球"/></label>
        <label className="wideField">訓練目標<input name="goal" placeholder="例如：建立兩點移動後的正手主動進攻"/></label>
        <fieldset className="wideField levelPicker"><legend>推薦程度（可複選）</legend>{LEVELS.map((level)=><label key={level}><input type="checkbox" name="recommended_levels" value={level}/><span>{level}</span></label>)}</fieldset>
        <label className="wideField">教練備註<textarea name="notes" rows={3} placeholder="器材、餵球方式、輪轉方式、注意事項等"/></label>
        <button className="primaryButton wideField">＋ 加入隊伍訓練庫</button>
      </form>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>隊伍自訂項目</h2></div><strong>{items.length} 項</strong></div>
      {!items.length ? <p className="muted">目前還沒有自訂項目；系統預設技能仍會照常顯示。</p> : <div className="customItemList">{items.map((item)=>{
        const levels = item.recommended_levels ?? [];
        return <article className={`customItemCard ${item.is_active ? '' : 'inactive'}`} key={item.id}>
          <div className="customItemHead"><div><b>{item.name}</b><small>{item.domain} · {item.subcategory ?? '未分類'}</small></div><div className="levelChips">{levels.map((level)=><span key={level}>{level}</span>)}</div></div>
          <form action={updateCustomTrainingItem} className="customItemGrid edit">
            <input type="hidden" name="id" value={item.id}/>
            <label>項目名稱<input name="name" required defaultValue={item.name}/></label>
            <label>訓練面向<select name="domain" required defaultValue={item.domain}>{DOMAINS.map((domain)=><option key={domain} value={domain}>{domain}</option>)}</select></label>
            <label>分類<input name="subcategory" required defaultValue={item.subcategory ?? ''}/></label>
            <label className="wideField">訓練目標<input name="goal" defaultValue={item.goal ?? ''}/></label>
            <fieldset className="wideField levelPicker"><legend>推薦程度</legend>{LEVELS.map((level)=><label key={level}><input type="checkbox" name="recommended_levels" value={level} defaultChecked={levels.includes(level)}/><span>{level}</span></label>)}</fieldset>
            <label className="wideField">教練備註<textarea name="notes" rows={2} defaultValue={item.notes ?? ''}/></label>
            <label className="switchRow"><input type="checkbox" name="is_active" defaultChecked={item.is_active}/>啟用中</label>
            <button className="primaryButton">儲存修改</button>
          </form>
          <form action={deleteCustomTrainingItem} className="deleteRow"><input type="hidden" name="id" value={item.id}/><ConfirmSubmitButton className="secondaryButton dangerText" confirmText={`確定要刪除「${item.name}」嗎？如果已有歷史課程使用，系統會阻止刪除，請改用停用。`}>刪除</ConfirmSubmitButton></form>
        </article>;
      })}</div>}
    </section>

    <style>{`.customItemGrid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px}.customItemGrid label{font-size:12px;font-weight:800;color:#647184}.customItemGrid input,.customItemGrid select,.customItemGrid textarea{width:100%;margin-top:5px;border:1px solid #dce2ea;border-radius:10px;padding:10px;background:#fff;font:inherit}.wideField{grid-column:1/-1}.levelPicker{grid-column:1/-1;border:1px solid #dce2ea;border-radius:12px;padding:10px 12px}.levelPicker legend{font-size:12px;font-weight:800;color:#647184}.levelPicker label{display:inline-flex;align-items:center;gap:5px;margin:4px 10px 4px 0}.levelPicker input{width:auto;margin:0}.customItemList{display:flex;flex-direction:column;gap:12px}.customItemCard{border:1px solid #e0e6ed;border-radius:16px;padding:14px;background:#fbfcfe}.customItemCard.inactive{opacity:.65}.customItemHead{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}.customItemHead small{display:block;color:#738093;margin-top:4px}.levelChips{display:flex;gap:5px;flex-wrap:wrap}.levelChips span{display:inline-flex;min-width:28px;height:28px;align-items:center;justify-content:center;border-radius:8px;background:#eaf1fa;color:#2c67b0;font-weight:900}.deleteRow{text-align:right;margin-top:8px}.dangerText{color:#a33}@media(max-width:700px){.customItemGrid{grid-template-columns:1fr}.wideField,.levelPicker{grid-column:auto}.customItemHead{align-items:flex-start}}`}</style>
  </main>;
}
