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
type Wallet={id:string;student_id:string;balance:number};
type Staff={linked_user_id:string|null;display_name:string};
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

  const [{data:txRows},{data:studentRows},{data:categoryRows},{data:walletRows},{data:staffRows},{data:allTxRows}]=await Promise.all([
    supabase.from('wallet_transactions')
      .select('id,transaction_no,student_id,transaction_type,amount,balance_before,balance_after,category_id,payment_method,note,status,created_at,operator_user_id')
      .eq('team_id',teamId).gte('created_at',fromIso).lt('created_at',toIso)
      .order('created_at',{ascending:false}),
    supabase.from('students').select('id,display_name').eq('team_id',teamId),
    supabase.from('wallet_categories').select('id,name').eq('team_id',teamId),
    supabase.from('student_wallets').select('id,student_id,balance').eq('team_id',teamId),
    supabase.from('staff_members').select('linked_user_id,display_name').eq('team_id',teamId).eq('active',true),
    supabase.from('wallet_transactions').select('id,wallet_id,transaction_type,amount,status,reversal_of,operator_user_id').eq('team_id',teamId).order('created_at'),
  ]);

  const txs=(txRows??[]) as Tx[];
  const students=(studentRows??[]) as Student[];
  const categories=(categoryRows??[]) as Category[];
  const wallets=(walletRows??[]) as Wallet[];
  const staff=(staffRows??[]) as Staff[];
  const allTxs=(allTxRows??[]) as Array<{id:string;wallet_id:string;transaction_type:string;amount:number;status:string;reversal_of:string|null;operator_user_id:string}>;
  const studentMap=new Map(students.map(s=>[s.id,s.display_name]));
  const categoryMap=new Map(categories.map(c=>[c.id,c.name]));
  const operatorMap=new Map(staff.filter(s=>s.linked_user_id).map(s=>[String(s.linked_user_id),s.display_name]));

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

  const paymentStats=new Map<string,{name:string;amount:number;count:number}>();
  const paymentNames:Record<string,string>={cash:'現金',transfer:'匯款',other:'其他'};
  for(const t of effectiveTopUps){
    const key=t.payment_method||'other';
    const cur=paymentStats.get(key)??{name:paymentNames[key]??'其他',amount:0,count:0};
    cur.amount+=Number(t.amount);cur.count+=1;paymentStats.set(key,cur);
  }
  const paymentRows=[...paymentStats.values()].sort((a,b)=>b.amount-a.amount);

  const operatorStats=new Map<string,{name:string;count:number;topUp:number;charge:number}>();
  for(const t of txs){
    const key=t.operator_user_id;
    const cur=operatorStats.get(key)??{name:operatorMap.get(key)||'未綁定工作人員',count:0,topUp:0,charge:0};
    cur.count+=1;
    if(t.transaction_type==='top_up'&&t.status==='posted')cur.topUp+=Number(t.amount);
    if(t.transaction_type==='charge'&&t.status==='posted')cur.charge+=Number(t.amount);
    operatorStats.set(key,cur);
  }
  const operatorRows=[...operatorStats.values()].sort((a,b)=>b.count-a.count);

  const originalMap=new Map(allTxs.map(t=>[t.id,t]));
  const ledgerByWallet=new Map<string,number>();
  for(const t of allTxs){
    let delta=0;
    if(t.transaction_type==='top_up'&&t.status==='posted')delta=Number(t.amount);
    else if(t.transaction_type==='charge'&&t.status==='posted')delta=-Number(t.amount);
    else if(t.transaction_type==='reversal'&&t.reversal_of){
      const original=originalMap.get(t.reversal_of);
      if(original?.transaction_type==='top_up')delta=-Number(t.amount);
      else if(original?.transaction_type==='charge')delta=Number(t.amount);
    }
    ledgerByWallet.set(t.wallet_id,(ledgerByWallet.get(t.wallet_id)??0)+delta);
  }

  const balanceRows=wallets.map(w=>{
    const actual=Number(w.balance);
    const ledger=Number(ledgerByWallet.get(w.id)??0);
    return {
      student:studentMap.get(w.student_id)||'學生',
      actual,
      ledger,
      diff:Math.round((actual-ledger)*100)/100,
    };
  }).sort((a,b)=>b.actual-a.actual);
  const reconciliationIssues=balanceRows.filter(r=>Math.abs(r.diff)>0.009);

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
      <div className="sectionTitle"><div><span>03</span><h2>收款方式與操作人員</h2></div><strong>{operatorRows.length} 人</strong></div>
      <div className="dualStats">
        <div><h3>儲值收款方式</h3>{paymentRows.length?paymentRows.map(x=><article key={x.name}><span>{x.name}<small>{x.count} 筆</small></span><strong>{money(x.amount)}</strong></article>):<p className="muted">此區間沒有儲值。</p>}</div>
        <div><h3>操作人員</h3>{operatorRows.length?operatorRows.map(x=><article key={x.name}><span>{x.name}<small>{x.count} 筆</small></span><strong>儲值 {money(x.topUp)} · 扣款 {money(x.charge)}</strong></article>):<p className="muted">此區間沒有交易。</p>}</div>
      </div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>04</span><h2>學生餘額與對帳</h2></div><strong className={reconciliationIssues.length?'reconBad':'reconGood'}>{reconciliationIssues.length?reconciliationIssues.length+' 筆異常':'✓ 對帳正常'}</strong></div>
      <div className={reconciliationIssues.length?'notice errorNotice':'notice successNotice'}>{reconciliationIssues.length?'有錢包目前餘額與交易流水推導結果不一致，請先不要手動修改資料庫餘額。':'所有錢包目前餘額都與交易流水一致。'}</div>
      {!balanceRows.length?<p className="muted">目前尚無學生錢包。</p>:<div className="balanceTable">{balanceRows.map(r=><article key={r.student} className={Math.abs(r.diff)>0.009?'bad':''}><b>{r.student}</b><span>目前 {money(r.actual)}</span><span>流水推導 {money(r.ledger)}</span><strong>{Math.abs(r.diff)>0.009?'差額 '+money(r.diff):'正常'}</strong></article>)}</div>}
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>05</span><h2>交易明細</h2></div><strong>{txs.length} 筆</strong></div>
      {!txs.length?<p className="muted">此日期區間沒有交易。</p>:<div className="reportTxList">
        {txs.map(t=><article key={t.id}>
          <div><b>#{t.transaction_no} · {studentMap.get(t.student_id)||'學生'}</b><small>{new Date(t.created_at).toLocaleString('zh-TW')} · {t.transaction_type==='top_up'?'儲值':t.transaction_type==='charge'?'扣款':t.transaction_type==='reversal'?'沖正':t.transaction_type}</small>{t.category_id?<small>{categoryMap.get(t.category_id)||'已停用類別'}</small>:null}{t.note?<p>{t.note}</p>:null}</div>
          <div className="reportAmount"><strong>{t.transaction_type==='charge'?'-':t.transaction_type==='top_up'?'+':'↺ '}{money(Number(t.amount)).replace('NT$','')}</strong><small>交易後 {money(Number(t.balance_after))}</small>{t.status==='reversed'?<em>原交易已沖正</em>:null}</div>
        </article>)}
      </div>}
    </section>

    <style>{'.walletReportShell{max-width:960px}.rangeForm{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}.rangeForm label{font-size:11px;font-weight:900;color:#667386}.rangeForm input{display:block;width:100%;margin-top:5px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.reportStats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.reportStats article{padding:14px;border:1px solid #e2e7ed;border-radius:16px;background:#fff}.reportStats span,.reportStats small{display:block;color:#7b8795;font-size:10px}.reportStats strong{display:block;margin:6px 0;font-size:21px}.categoryStats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.categoryStats article{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px;border:1px solid #e5e9ee;border-radius:13px}.categoryStats small{display:block;color:#7b8795;font-size:10px}.reportTxList{display:grid;gap:8px}.reportTxList article{display:grid;grid-template-columns:1fr auto;gap:12px;padding:11px;border:1px solid #e5e9ee;border-radius:13px}.reportTxList small{display:block;color:#7b8795;font-size:10px;margin-top:2px}.reportTxList p{margin:4px 0 0;font-size:11px;color:#607083}.reportAmount{text-align:right}.reportAmount em{display:block;margin-top:4px;font-size:9px;color:#8a5d32;font-style:normal}.dualStats{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dualStats>div{border:1px solid #e5e9ee;border-radius:14px;padding:12px}.dualStats h3{margin:0 0 8px;font-size:13px}.dualStats article{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #eef1f4}.dualStats article:first-of-type{border-top:0}.dualStats span,.dualStats small{font-size:10px;color:#6f7b8a}.dualStats small{display:block;margin-top:2px}.dualStats strong{font-size:11px;text-align:right}.balanceTable{display:grid;gap:7px}.balanceTable article{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;align-items:center;padding:10px 11px;border:1px solid #e5e9ee;border-radius:12px}.balanceTable article.bad{border-color:#e7b8b2;background:#fff8f7}.balanceTable span{font-size:10px;color:#708093}.balanceTable strong{font-size:10px}.reconGood{color:#2d7b50}.reconBad{color:#b5483d}@media(max-width:760px){.dualStats{grid-template-columns:1fr}.balanceTable article{grid-template-columns:1fr 1fr}.balanceTable b,.balanceTable strong{grid-column:1/-1}.reportStats{grid-template-columns:1fr 1fr}.rangeForm{grid-template-columns:1fr 1fr}.rangeForm button{grid-column:1/-1}.categoryStats{grid-template-columns:1fr}}@media(max-width:480px){.reportStats,.rangeForm{grid-template-columns:1fr}.rangeForm button{grid-column:auto}.reportTxList article{grid-template-columns:1fr}.reportAmount{text-align:left}}'}</style>
  </main>;
}
