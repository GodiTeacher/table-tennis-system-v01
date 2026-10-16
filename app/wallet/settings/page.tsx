import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';
import {createWalletCategory,renameWalletCategory,toggleWalletCategory} from './actions';

type Category={id:string;name:string;active:boolean;sort_order:number};
type Membership={member_role:string};

export default async function WalletSettingsPage({searchParams}:{searchParams:Promise<{message?:string;error?:string}>}){
  const params=await searchParams;
  const {supabase,userId,teamId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  if(!teamId)redirect('/more');
  if(!hasPlanFeature(entitlements,'nfc_wallet'))redirect('/plans?locked=nfc_wallet');

  const [{data:membershipRow},{data:rows}]=await Promise.all([
    supabase.from('team_members').select('member_role').eq('team_id',teamId).eq('user_id',userId).maybeSingle(),
    supabase.from('wallet_categories').select('id,name,active,sort_order').eq('team_id',teamId).eq('category_type','charge').order('sort_order').order('name')
  ]);
  const membership=membershipRow as Membership|null;
  if(!membership||!['owner','admin'].includes(membership.member_role))redirect('/wallet?error='+encodeURIComponent('只有 Owner／Admin 可以管理消費類別。'));
  const categories=(rows??[]) as Category[];

  return <main className="shell walletSettingsShell">
    <section className="hero compactHero"><div className="eyebrow">WALLET SETTINGS</div><h1>消費類別管理</h1><p>可新增、改名、停用或重新啟用扣款項目。歷史交易仍保留原類別關聯。</p><div className="topNav"><Link href="/wallet">返回 NFC 錢包</Link></div></section>
    {params.message?<div className="notice successNotice">✓ {params.message}</div>:null}
    {params.error?<div className="notice errorNotice">{params.error}</div>:null}

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>新增類別</h2></div></div>
      <form action={createWalletCategory} className="newCategoryForm">
        <input name="name" placeholder="例如：點心、比賽報名費" maxLength={40} required/>
        <button className="primaryButton">＋ 新增</button>
      </form>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>現有類別</h2></div><strong>{categories.length} 類</strong></div>
      <div className="categoryManageList">
        {categories.map(c=><article key={c.id} className={!c.active?'inactive':''}>
          <form action={renameWalletCategory} className="renameCategory">
            <input type="hidden" name="id" value={c.id}/>
            <input name="name" defaultValue={c.name} maxLength={40} required/>
            <button className="secondaryButton">儲存名稱</button>
          </form>
          <form action={toggleWalletCategory}>
            <input type="hidden" name="id" value={c.id}/>
            <input type="hidden" name="active" value={c.active?'0':'1'}/>
            <button className={c.active?'dangerButton':'primaryButton'}>{c.active?'停用':'重新啟用'}</button>
          </form>
          <span className={c.active?'categoryStatus active':'categoryStatus'}>{c.active?'使用中':'已停用'}</span>
        </article>)}
      </div>
    </section>

    <style>{'.walletSettingsShell{max-width:760px}.newCategoryForm{display:grid;grid-template-columns:1fr auto;gap:9px}.newCategoryForm input,.renameCategory input{width:100%;padding:11px 12px;border:1px solid #dce2e8;border-radius:11px;font:inherit;background:#fff}.categoryManageList{display:grid;gap:9px}.categoryManageList article{display:grid;grid-template-columns:1fr auto auto;gap:9px;align-items:center;padding:11px;border:1px solid #e4e9ee;border-radius:14px}.categoryManageList article.inactive{background:#fafafa;opacity:.68}.renameCategory{display:grid;grid-template-columns:1fr auto;gap:8px}.categoryStatus{font-size:10px;font-weight:900;color:#8a5a52;background:#fff0ee;padding:6px 8px;border-radius:999px}.categoryStatus.active{color:#2c7650;background:#edf8f2}@media(max-width:620px){.newCategoryForm,.categoryManageList article,.renameCategory{grid-template-columns:1fr}.categoryManageList article form button,.newCategoryForm button{width:100%}.categoryStatus{width:max-content}}'}</style>
  </main>;
}
