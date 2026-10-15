import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';

type Tx={
  id:string;transaction_no:number;student_id:string;transaction_type:string;amount:number;
  balance_before:number;balance_after:number;category_id:string|null;payment_method:string|null;
  note:string|null;status:string;created_at:string;operator_user_id:string;
};
type Student={id:string;display_name:string};
type Category={id:string;name:string};
type Wallet={balance:number};
type Membership={member_role:string;permissions:Record<string,boolean>};

const money=(v:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(v);
const pad=(n:number)=>String(n).padStart(2,'0');
const localDate=(d:Date)=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());

export default async function WalletReportPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
  const q=await searchParams;
  const {supabase,userId,teamId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  if(!teamId)redirect('/more');
  if(!hasPlanFeature(entitlements,'nfc_wallet'))redirect('/plans?locked=nfc_wallet');

  const {data:membershipRow}=await supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle();
  const membership=(membershipRow??{member_role:'coach',permissions:{}}) as Membership;
  const admin=['owner','admin'].includes(membership.member_role);
  const canReport=admin||Boolean(membership.permissions?.wallet_reports);
  if(!canReport)redirect('/wallet?error='+encodeURIComponent('目前帳號沒有查看財務報表的權限。'));

  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const from=q.from||localDate(monthStart);
  const to=q.to||localDate(now);
  const fromIso=from+'T00:00:00+08:00';
  const toDate=new Date(to+'T00:00:00+08:00');
  toDate.setDate(toDate.getDate()+1);
  const toIso=toDate.toISOString();

  const [{data:txRows},{data:studentRows},{data:categoryRows},{data:walletRows}]=await Promise.all([
    supabase.from('wallet_transactions')
      .select('id,transaction_no,student_id,transaction_type,amount,balance_before,balance_after,category_id,payment_method,note,status,created_at,operator_user_id')
      .eq('team_id',teamId).gte('created_at',fromIso).lt('created_at',toIso)
      .order('created_at',{ascending:false}),
    supabase.from('students').select('id,display_name').eq('team_id',teamId),
    supabase.from('wallet_categories').select('id,name').eq('team_id',teamId),
    supabase.from('student_wallets').select('balance').eq('team_id',teamId),
  ]);

  const txs=(txRows??[]) as Tx[];
  const students=(studentRows??[]) as Student[];
  const categories=(categoryRows??[]) as Category[];
  const wallets=(walletRows??[]) as Wallet[];
  const studentMap=new Map(students.map(s=>[s.id,s.display_name]));
  const categoryMap=new Map(categories.map(c=>[c.id,c.name]));

  const effectiveTopUps=txs.filter(t=>t.transaction_type==='top_up'&&t.status==='posted');
  const effectiveCharges=txs.filter(t=>t.transaction_type==='charge'&&t.status==='posted');
  const reversals=txs.filter(t=>t.transaction_type==='reversal');
  const topUpTotal=effectiveTopUps.reduce((a,t)=>a+Number(t.amount),0);
  const chargeTotal=effectiveCharges.reduce((a,t)=>a+Number(t.amount),0);
  const outstanding=wallets.reduce((a,w)=>a+Number(w.balance),0);

  const categoryTotals=new Map<string,{name:string;amount:number;count:number}>();
  for(const t of effectiveCharges){
    const key=t.category_id||'uncategorized';
    const cur=categoryTotals.get(key)??{name:t.category_id?(categoryMap.get(t.category_id)||'已停用類別'):'未分類',amount:0,count:0};
    cur.amount+=Number(t.amount);cur.count+=1;categoryTotals.set(key,cur);
  }
  const categoryStats=[...categoryTotals.values()].sort((a,b)=>b.amount-a.amount);

  const exportHref='/wallet-report/export?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to);

  return <main className="shell walletReportShell">
    <section className="hero compactHero">
      <div className="eyebrow">WALLET REPORT</div><h1>NFC 儲值報表</h1>
      <p>儲值屬於預收款；學生實際消費才列為核銷。沖正會另外保留紀錄。</p>
      <div className="topNav"><Link href="/wallet">返回錢包</Link><a href={exportHref}>匯出 CSV</a></div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>查詢區間</h2></div><strong>{from} ～ {to}</strong></div>
      <form method="get" className="rangeForm">
        <label>開始日期<input type="date" name="from" defaultValue={from}/></label>
        <label>結束日期<input type="date" name="to" defaultValue={to}/></label>
        <button className="primaryButton">查詢</button>
      </form>
    </section>

    <section className="reportStats">
      <article><span>有效儲值／預收流入</span><strong>{money(topUpTotal)}</strong><small>{effectiveTopUps.length} 筆</small></article>
      <article><span>有效扣款／消費核銷</span><strong>{money(chargeTotal)}</strong><small>{effectiveCharges.length} 筆</small></article>
      <article><span>沖正</span><strong>{reversals.length} 筆</strong><small>原交易保留</small></article>
      <article><span>目前未使用儲值餘額</span><strong>{money(outstanding)}</strong><small>所有學生錢包合計</small></article>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>消費項目統計</h2></div><strong>{categoryStats.length} 類</strong></div>
      {!categoryStats.length?<p className="muted">此區間沒有有效扣款。</p>:<div className="categoryStats">
        {categoryStats.map(x=><article key={x.name}><div><b>{x.name}</b><small>{x.count} 筆</small></div><strong>{money(x.amount)}</strong></article>)}
      </div>}
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>03</span><h2>交易明細</h2></div><strong>{txs.length} 筆</strong></div>
      {!txs.length?<p className="muted">此日期區間沒有交易。</p>:<div className="reportTxList">
        {txs.map(t=><article key={t.id}>
          <div><b>#{t.transaction_no} · {studentMap.get(t.student_id)||'學生'}</b><small>{new Date(t.created_at).toLocaleString('zh-TW')} · {t.transaction_type==='top_up'?'儲值':t.transaction_type==='charge'?'扣款':t.transaction_type==='reversal'?'沖正':t.transaction_type}</small>{t.category_id?<small>{categoryMap.get(t.category_id)||'已停用類別'}</small>:null}{t.note?<p>{t.note}</p>:null}</div>
          <div className="reportAmount"><strong>{t.transaction_type==='charge'?'-':t.transaction_type==='top_up'?'+':'↺ '}{money(Number(t.amount)).replace('NT$','')}</strong><small>交易後 {money(Number(t.balance_after))}</small>{t.status==='reversed'?<em>原交易已沖正</em>:null}</div>
        </article>)}
      </div>}
    </section>

    <style>{'.walletReportShell{max-width:960px}.rangeForm{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}.rangeForm label{font-size:11px;font-weight:900;color:#667386}.rangeForm input{display:block;width:100%;margin-top:5px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.reportStats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.reportStats article{padding:14px;border:1px solid #e2e7ed;border-radius:16px;background:#fff}.reportStats span,.reportStats small{display:block;color:#7b8795;font-size:10px}.reportStats strong{display:block;margin:6px 0;font-size:21px}.categoryStats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.categoryStats article{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px;border:1px solid #e5e9ee;border-radius:13px}.categoryStats small{display:block;color:#7b8795;font-size:10px}.reportTxList{display:grid;gap:8px}.reportTxList article{display:grid;grid-template-columns:1fr auto;gap:12px;padding:11px;border:1px solid #e5e9ee;border-radius:13px}.reportTxList small{display:block;color:#7b8795;font-size:10px;margin-top:2px}.reportTxList p{margin:4px 0 0;font-size:11px;color:#607083}.reportAmount{text-align:right}.reportAmount em{display:block;margin-top:4px;font-size:9px;color:#8a5d32;font-style:normal}@media(max-width:760px){.reportStats{grid-template-columns:1fr 1fr}.rangeForm{grid-template-columns:1fr 1fr}.rangeForm button{grid-column:1/-1}.categoryStats{grid-template-columns:1fr}}@media(max-width:480px){.reportStats,.rangeForm{grid-template-columns:1fr}.rangeForm button{grid-column:auto}.reportTxList article{grid-template-columns:1fr}.reportAmount{text-align:left}}'}</style>
  </main>;
}
