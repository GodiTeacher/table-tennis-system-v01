import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';
import {configureQuickCharge,disableQuickCharge,quickChargeStudent} from './actions';

type Student={id:string;display_name:string;grade:number|null;class_name:string|null;seat_number:number|null};
type Wallet={student_id:string;balance:number};
type Category={id:string;name:string;active:boolean};
type Membership={member_role:string;permissions:Record<string,boolean>};

const money=(v:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(v);

export default async function QuickWalletPage({searchParams}:{searchParams:Promise<{student?:string;message?:string;error?:string}>}){
  const params=await searchParams;
  const {supabase,userId,teamId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  if(!teamId)redirect('/more');
  if(!hasPlanFeature(entitlements,'nfc_wallet'))redirect('/plans?locked=nfc_wallet');

  const jar=await cookies();
  const enabled=jar.get('wallet-quick-enabled')?.value==='1';
  const amount=Number(jar.get('wallet-quick-amount')?.value??0);
  const categoryId=jar.get('wallet-quick-category')?.value??'';
  const note=jar.get('wallet-quick-note')?.value??'';

  const [{data:studentRows},{data:walletRows},{data:categoryRows},{data:membershipRow}]=await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name,seat_number').eq('team_id',teamId).eq('active',true).order('grade').order('class_name').order('seat_number'),
    supabase.from('student_wallets').select('student_id,balance').eq('team_id',teamId),
    supabase.from('wallet_categories').select('id,name,active').eq('team_id',teamId).eq('category_type','charge').order('sort_order'),
    supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle(),
  ]);

  const students=(studentRows??[]) as Student[];
  const wallets=(walletRows??[]) as Wallet[];
  const categories=(categoryRows??[]) as Category[];
  const membership=(membershipRow??{member_role:'coach',permissions:{}}) as Membership;
  const admin=['owner','admin'].includes(membership.member_role);
  const canCharge=admin||Boolean(membership.permissions?.wallet_charge);
  if(!canCharge)redirect('/wallet?error='+encodeURIComponent('目前帳號沒有快速扣款權限。'));

  const selected=students.find(s=>s.id===params.student)??null;
  const selectedBalance=selected?Number(wallets.find(w=>w.student_id===selected.id)?.balance??0):0;
  const activeCategories=categories.filter(c=>c.active);
  const activeCategory=activeCategories.find(c=>c.id===categoryId);

  return <main className="shell quickWalletShell">
    <section className="hero compactHero">
      <div className="eyebrow">NFC QUICK CHARGE</div>
      <h1>快速扣款</h1>
      <p>先設定固定金額與項目，再依序感應學生卡片。每次感應後只需要確認一次。</p>
      <div className="topNav"><Link href="/wallet">返回 NFC 錢包</Link></div>
    </section>

    {params.message?<div className="notice successNotice">✓ {params.message}</div>:null}
    {params.error?<div className="notice errorNotice">{params.error}</div>:null}

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>快速扣款設定</h2></div><strong>{enabled?'模式開啟':'模式關閉'}</strong></div>
      <form action={configureQuickCharge} className="quickConfig">
        <label>固定扣款金額<input name="amount" type="number" min="1" step="1" defaultValue={amount||50} required/></label>
        <label>消費項目<select name="category_id" defaultValue={categoryId}><option value="">未分類</option>{activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="wide">備註<input name="note" defaultValue={note} placeholder="例如：點心、訓練用品"/></label>
        <button className="primaryButton wide">{enabled?'更新快速扣款設定':'開啟快速扣款模式'}</button>
      </form>
      {enabled?<form action={disableQuickCharge} className="disableQuick"><button className="secondaryButton">關閉快速扣款模式</button></form>:null}
    </section>

    <section className="quickModeCard">
      <div><span>目前固定扣款</span><strong>{enabled?money(amount):'未啟用'}</strong><small>{activeCategory?.name||'未分類'}{note?' · '+note:''}</small></div>
      <div className={enabled?'modePill on':'modePill'}>{enabled?'等待感應':'尚未開啟'}</div>
    </section>

    {selected?<section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>確認扣款</h2></div><strong>NFC 已辨識</strong></div>
      <div className="quickStudent">
        <div><span>學生</span><h2>{selected.display_name}</h2><small>{selected.grade?selected.grade+'年級':''}{selected.class_name?' · '+selected.class_name:''}{selected.seat_number?' · '+selected.seat_number+'號':''}</small></div>
        <div><span>目前餘額</span><strong>{money(selectedBalance)}</strong></div>
      </div>
      <div className="quickConfirm">
        <div><span>本次扣款</span><strong>-{money(amount)}</strong><small>扣款後預估 {money(Math.max(0,selectedBalance-amount))}</small></div>
        <form action={quickChargeStudent}>
          <input type="hidden" name="student_id" value={selected.id}/>
          <button className="primaryButton" disabled={!enabled||selectedBalance<amount}>確認扣款</button>
        </form>
      </div>
      {selectedBalance<amount?<div className="notice errorNotice">餘額不足，系統不會允許扣款。</div>:null}
    </section>:<section className="card scanWaiting">
      <div className="sectionTitle"><div><span>02</span><h2>等待下一張 NFC 卡</h2></div></div>
      <div className="scanIcon">◉</div>
      <p>{enabled?'現在直接感應學生 NTAG213，系統會自動帶到確認頁。':'請先開啟快速扣款模式。'}</p>
      <details><summary>沒有帶卡？手動選擇學生</summary><div className="manualStudents">{students.map(s=><Link key={s.id} href={'/wallet/quick?student='+s.id}>{s.display_name}</Link>)}</div></details>
    </section>}

    <style>{'.quickWalletShell{max-width:760px}.quickConfig{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quickConfig label{font-size:11px;font-weight:900;color:#667386}.quickConfig input,.quickConfig select{display:block;width:100%;margin-top:5px;padding:11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.quickConfig .wide{grid-column:1/-1}.disableQuick{margin-top:10px}.quickModeCard{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:14px 0;padding:18px;border-radius:20px;background:linear-gradient(135deg,#1e293b,#34445e);color:#fff}.quickModeCard span,.quickModeCard small{display:block;color:#cbd5e1;font-size:10px}.quickModeCard strong{display:block;font-size:30px;margin:4px 0}.modePill{padding:8px 11px;border-radius:999px;background:#475569;color:#dce3ea;font-size:11px;font-weight:900}.modePill.on{background:#def7e9;color:#23724b}.quickStudent{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:15px;border:1px solid #e5e9ef;border-radius:15px}.quickStudent span,.quickStudent small{display:block;color:#7b8795;font-size:10px}.quickStudent h2{margin:3px 0}.quickStudent>div:last-child{text-align:right}.quickStudent>div:last-child strong{font-size:24px}.quickConfirm{display:flex;justify-content:space-between;align-items:end;gap:14px;margin-top:12px;padding:15px;border-radius:15px;background:var(--theme-soft,#f5f3ff)}.quickConfirm span,.quickConfirm small{display:block;font-size:10px;color:#667386}.quickConfirm strong{display:block;font-size:25px;margin:4px 0;color:var(--theme-primary,#273444)}.scanWaiting{text-align:center}.scanIcon{width:84px;height:84px;border-radius:50%;margin:10px auto;display:grid;place-items:center;background:var(--theme-soft,#f3f6f8);color:var(--theme-primary,#273444);font-size:36px}.scanWaiting details{text-align:left;margin-top:14px}.manualStudents{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.manualStudents a{text-decoration:none;color:var(--theme-primary,#273444);background:var(--theme-soft,#f3f6f8);padding:7px 9px;border-radius:999px;font-size:11px}@media(max-width:580px){.quickConfig{grid-template-columns:1fr}.quickConfig .wide{grid-column:auto}.quickStudent{grid-template-columns:1fr}.quickStudent>div:last-child{text-align:left}.quickConfirm{align-items:stretch;flex-direction:column}.quickConfirm form,.quickConfirm button{width:100%}}'}</style>
  </main>;
}
