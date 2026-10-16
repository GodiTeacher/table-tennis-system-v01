import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';
import WalletReminderCopyButton from '@/components/WalletReminderCopyButton';

type Student={id:string;display_name:string;grade:number|null;class_name:string|null};
type Wallet={student_id:string;balance:number};
type ParentLink={student_id:string;active:boolean;low_balance_threshold:number};
type Membership={member_role:string;permissions:Record<string,boolean>};

const money=(v:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(v);

export default async function LowBalancePage(){
  const {supabase,userId,teamId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  if(!teamId)redirect('/more');
  if(!hasPlanFeature(entitlements,'nfc_wallet'))redirect('/plans?locked=nfc_wallet');

  const [{data:studentRows},{data:walletRows},{data:parentRows},{data:membershipRow}]=await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name').eq('team_id',teamId).eq('active',true).order('grade').order('class_name').order('display_name'),
    supabase.from('student_wallets').select('student_id,balance').eq('team_id',teamId),
    supabase.from('parent_wallet_links').select('student_id,active,low_balance_threshold').eq('team_id',teamId).eq('active',true),
    supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle(),
  ]);

  const membership=(membershipRow??{member_role:'coach',permissions:{}}) as Membership;
  const admin=['owner','admin'].includes(membership.member_role);
  const canView=admin||Boolean(membership.permissions?.wallet_view)||Boolean(membership.permissions?.wallet_reports);
  if(!canView)redirect('/wallet?error='+encodeURIComponent('目前帳號沒有查看低餘額名單的權限。'));

  const students=(studentRows??[]) as Student[];
  const wallets=(walletRows??[]) as Wallet[];
  const links=(parentRows??[]) as ParentLink[];
  const walletMap=new Map(wallets.map(w=>[w.student_id,Number(w.balance)]));
  const linkMap=new Map(links.map(l=>[l.student_id,l]));
  const rows=students.map(s=>{
    const balance=walletMap.get(s.id)??0;
    const link=linkMap.get(s.id);
    const threshold=Number(link?.low_balance_threshold??300);
    return {...s,balance,threshold,hasLink:Boolean(link),isLow:balance<threshold};
  });
  const lowRows=rows.filter(r=>r.isLow).sort((a,b)=>a.balance-b.balance);

  return <main className="shell lowBalanceShell">
    <section className="hero compactHero">
      <div className="eyebrow">LOW BALANCE</div><h1>低餘額提醒</h1>
      <p>以每位學生設定的家長提醒門檻為準；尚未設定家長連結者先使用預設門檻 $300。</p>
      <div className="topNav"><Link href="/wallet">返回 NFC 錢包</Link></div>
    </section>

    <section className="summaryCard">
      <div><span>低餘額學生</span><strong>{lowRows.length}</strong><small>共 {students.length} 位啟用學生</small></div>
      <div><span>已設定家長連結</span><strong>{links.length}</strong><small>可由學生錢包頁管理</small></div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>需要提醒</h2></div><strong>{lowRows.length} 人</strong></div>
      {!lowRows.length?<div className="notice successNotice">✓ 目前沒有低於提醒門檻的學生。</div>:<div className="lowList">
        {lowRows.map(r=>{
          const text=r.display_name+'家長您好，目前孩子的儲值餘額為 '+money(r.balance)+'，已低於提醒門檻 '+money(r.threshold)+'。如需繼續使用相關費用，請再協助儲值，謝謝！';
          return <article key={r.id}>
            <div className="studentInfo"><b>{r.display_name}</b><small>{r.grade?r.grade+'年級':''}{r.class_name?' · '+r.class_name:''}{r.hasLink?' · 已啟用家長查詢':' · 尚未建立家長查詢連結'}</small></div>
            <div className="balanceInfo"><span>目前餘額</span><strong>{money(r.balance)}</strong><small>門檻 {money(r.threshold)}</small></div>
            <div className="reminderActions"><WalletReminderCopyButton text={text}/><Link className="secondaryButton" href={'/wallet?student='+r.id}>開啟學生錢包</Link></div>
          </article>;
        })}
      </div>}
    </section>

    <style>{'.lowBalanceShell{max-width:860px}.summaryCard{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.summaryCard>div{padding:16px;border-radius:18px;background:#fff;border:1px solid #e4e9ef}.summaryCard span,.summaryCard small{display:block;color:#7b8795;font-size:10px}.summaryCard strong{display:block;font-size:28px;margin:4px 0}.lowList{display:grid;gap:9px}.lowList article{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:12px;border:1px solid #e5e9ee;border-radius:14px}.studentInfo b{display:block}.studentInfo small,.balanceInfo span,.balanceInfo small{display:block;color:#7b8795;font-size:10px;margin-top:2px}.balanceInfo{text-align:right}.balanceInfo strong{display:block;font-size:18px;color:#b4533d}.reminderActions{display:flex;gap:7px}.reminderActions a{text-decoration:none}@media(max-width:680px){.summaryCard{grid-template-columns:1fr 1fr}.lowList article{grid-template-columns:1fr auto}.reminderActions{grid-column:1/-1}.reminderActions>*{flex:1;text-align:center}}@media(max-width:460px){.summaryCard{grid-template-columns:1fr}.lowList article{grid-template-columns:1fr}.balanceInfo{text-align:left}.reminderActions{display:grid;grid-template-columns:1fr}}'}</style>
  </main>;
}
