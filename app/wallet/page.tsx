import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';
import {bindNfcCard,chargeWallet,disableNfcCard,reverseWalletTransaction,topUpWallet} from './actions';

type Student={id:string;display_name:string;grade:number|null;class_name:string|null;seat_number:number|null};
type Wallet={id:string;student_id:string;balance:number;total_top_up:number;total_charge:number;status:string};
type Category={id:string;name:string;sort_order:number};
type Tx={id:string;transaction_no:number;student_id:string;transaction_type:string;amount:number;balance_after:number;category_id:string|null;note:string|null;status:string;created_at:string};
type Membership={member_role:string;permissions:Record<string,boolean>};
type NfcCard={id:string;student_id:string;card_label:string|null;status:string;issued_at:string;disabled_at:string|null};

const money=(v:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(v);
const typeText:Record<string,string>={top_up:'儲值',charge:'扣款',refund:'退款',reversal:'沖正',adjustment:'調整'};

export default async function WalletPage({searchParams}:{searchParams:Promise<{q?:string;student?:string;message?:string;error?:string;card_token?:string}>}){
  const params=await searchParams;
  const {supabase,userId,teamId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  if(!teamId)redirect('/more');
  if(!hasPlanFeature(entitlements,'nfc_wallet'))redirect('/plans?locked=nfc_wallet');

  const [{data:studentRows},{data:walletRows},{data:categoryRows},{data:txRows},{data:membershipRow},{data:nfcRows}]=await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name,seat_number').eq('team_id',teamId).eq('active',true).order('grade').order('class_name').order('seat_number'),
    supabase.from('student_wallets').select('id,student_id,balance,total_top_up,total_charge,status').eq('team_id',teamId),
    supabase.from('wallet_categories').select('id,name,sort_order').eq('team_id',teamId).eq('active',true).eq('category_type','charge').order('sort_order'),
    supabase.from('wallet_transactions').select('id,transaction_no,student_id,transaction_type,amount,balance_after,category_id,note,status,created_at').eq('team_id',teamId).order('created_at',{ascending:false}).limit(100),
    supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle(),
    supabase.from('nfc_cards').select('id,student_id,card_label,status,issued_at,disabled_at').eq('team_id',teamId).order('issued_at',{ascending:false}),
  ]);

  const students=(studentRows??[]) as Student[];
  const wallets=(walletRows??[]) as Wallet[];
  const categories=(categoryRows??[]) as Category[];
  const txs=(txRows??[]) as Tx[];
  const membership=(membershipRow??{member_role:'coach',permissions:{}}) as Membership;
  const nfcCards=(nfcRows??[]) as NfcCard[];
  const admin=['owner','admin'].includes(membership.member_role);
  const canTopUp=admin||Boolean(membership.permissions?.wallet_top_up);
  const canCharge=admin||Boolean(membership.permissions?.wallet_charge);
  const canManageNfc=admin||Boolean(membership.permissions?.nfc_manage);
  const canReverse=admin||Boolean(membership.permissions?.wallet_reverse);

  const q=(params.q??'').trim().toLocaleLowerCase('zh-Hant');
  const visible=q?students.filter(s=>(s.display_name+' '+(s.grade??'')+' '+(s.class_name??'')+' '+(s.seat_number??'')).toLocaleLowerCase('zh-Hant').includes(q)):students;
  const selected=students.find(s=>s.id===params.student)??visible[0]??students[0]??null;
  const wallet=selected?wallets.find(w=>w.student_id===selected.id):null;
  const studentTxs=selected?txs.filter(t=>t.student_id===selected.id):[];
  const categoryMap=new Map(categories.map(c=>[c.id,c.name]));
  const balance=Number(wallet?.balance??0);
  const activeCard=selected?nfcCards.find(card=>card.student_id===selected.id&&card.status==='active'):null;
  const cardHistory=selected?nfcCards.filter(card=>card.student_id===selected.id):[];
  const siteUrl=(process.env.NEXT_PUBLIC_APP_URL??'https://table-tennis-system-v01.cramtabletennis.workers.dev').replace(/\/$/,'');
  const newCardUrl=params.card_token?siteUrl+'/c/'+params.card_token:null;

  return <main className="shell walletShell">
    <section className="hero compactHero">
      <div className="eyebrow">NFC WALLET V1</div>
      <h1>NFC 智慧儲值</h1>
      <p>先用手動搜尋測試錢包、儲值與扣款；NTAG213 到貨後再接上感應入口。</p>
      <div className="topNav"><Link href="/more">返回更多</Link><Link href="/students">學生名單</Link><Link href="/wallet-report">交易報表</Link></div>
    </section>

    {params.message?<div className="notice successNotice">✓ {params.message}</div>:null}
    {params.error?<div className="notice errorNotice">{params.error}</div>:null}

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>選擇學生</h2></div><strong>{students.length} 人</strong></div>
      <form method="get" className="walletSearch">
        <input name="q" defaultValue={params.q??''} placeholder="搜尋姓名、年級、班級或座號"/>
        <button className="secondaryButton">搜尋</button>
        {q?<Link className="secondaryButton" href="/wallet">清除</Link>:null}
      </form>
      {!students.length?<p className="muted">目前沒有啟用中的學生。</p>:<div className="studentPicker">
        {visible.map(s=><Link key={s.id} href={'/wallet?student='+s.id} className={selected?.id===s.id?'active':''}>
          <b>{s.display_name}</b>
          <small>{s.grade?s.grade+'年級':''}{s.class_name?' · '+s.class_name:''}{s.seat_number?' · '+s.seat_number+'號':''}</small>
        </Link>)}
      </div>}
    </section>

    {selected?<><section className="walletHeroCard">
      <div><span>目前學生</span><h2>{selected.display_name}</h2><small>{selected.grade?selected.grade+'年級':''}{selected.class_name?' · '+selected.class_name:''}{selected.seat_number?' · '+selected.seat_number+'號':''}</small></div>
      <div className="balanceBox"><span>目前餘額</span><strong>{money(balance)}</strong><small>{wallet?'累積儲值 '+money(Number(wallet.total_top_up))+' · 累積消費 '+money(Number(wallet.total_charge)):'尚未建立交易，餘額為 0'}</small></div>
    </section>

    <div className="walletActionsGrid">
      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>儲值</h2></div><strong>{canTopUp?'可操作':'無權限'}</strong></div>
        <form action={topUpWallet} className="walletForm">
          <input type="hidden" name="student_id" value={selected.id}/>
          <label>儲值金額<input name="amount" type="number" min="1" step="1" placeholder="例如 1000" required disabled={!canTopUp}/></label>
          <label>收款方式<select name="payment_method" defaultValue="cash" disabled={!canTopUp}><option value="cash">現金</option><option value="transfer">匯款</option><option value="other">其他</option></select></label>
          <label className="wide">備註<input name="note" placeholder="可留空" maxLength={160} disabled={!canTopUp}/></label>
          <button className="primaryButton wide" disabled={!canTopUp}>＋ 確認儲值</button>
        </form>
        {!canTopUp?<p className="permissionNote">此帳號目前沒有儲值權限。</p>:null}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>扣款</h2></div><strong>{canCharge?'可操作':'無權限'}</strong></div>
        <form action={chargeWallet} className="walletForm">
          <input type="hidden" name="student_id" value={selected.id}/>
          <label>扣款金額<input name="amount" type="number" min="1" step="1" placeholder="例如 300" required disabled={!canCharge}/></label>
          <label>消費項目<select name="category_id" defaultValue="" disabled={!canCharge}><option value="">未分類</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="wide">備註<input name="note" placeholder="例如：Butterfly 球皮" maxLength={160} disabled={!canCharge}/></label>
          <button className="primaryButton wide" disabled={!canCharge||balance<=0}>− 確認扣款</button>
        </form>
        {balance<=0?<p className="permissionNote">目前餘額為 0，請先完成儲值。</p>:null}
      </section>
    </div>

    <section className="card">
      <div className="sectionTitle"><div><span>04</span><h2>NFC 卡片</h2></div><strong>{activeCard?'已綁定':'未綁定'}</strong></div>
      {newCardUrl?<div className="newCardBox"><b>請把這個網址寫入 NTAG213</b><code>{newCardUrl}</code><p>這個網址只負責辨識學生，不代表扣款授權；完成寫卡後可以直接用瀏覽器開啟網址測試。</p></div>:null}
      {activeCard?<div className="nfcCurrent">
        <div><b>{activeCard.card_label||'學生 NFC 卡'}</b><small>啟用於 {new Date(activeCard.issued_at).toLocaleString('zh-TW')}</small></div>
        {canManageNfc?<div className="nfcButtons">
          <form action={disableNfcCard}><input type="hidden" name="student_id" value={selected.id}/><input type="hidden" name="card_id" value={activeCard.id}/><input type="hidden" name="status" value="lost"/><button className="secondaryButton">標記遺失</button></form>
          <form action={disableNfcCard}><input type="hidden" name="student_id" value={selected.id}/><input type="hidden" name="card_id" value={activeCard.id}/><input type="hidden" name="status" value="disabled"/><button className="dangerButton">停用</button></form>
        </div>:null}
      </div>:<p className="muted">目前沒有啟用中的 NFC 卡。</p>}
      {canManageNfc?<form action={bindNfcCard} className="bindCardForm">
        <input type="hidden" name="student_id" value={selected.id}/>
        <label>卡片名稱<input name="card_label" placeholder="例如：白卡 01、鑰匙圈" maxLength={50}/></label>
        <button className="primaryButton">{activeCard?'補發／更換新卡':'＋ 建立 NFC 卡'}</button>
      </form>:<p className="permissionNote">此帳號沒有 NFC 卡片管理權限。</p>}
      {cardHistory.length>1?<details className="cardHistory"><summary>查看歷史卡片（{cardHistory.length}）</summary>{cardHistory.map(card=><div key={card.id}><span>{card.card_label||'NFC 卡'}</span><small>{card.status} · {new Date(card.issued_at).toLocaleDateString('zh-TW')}</small></div>)}</details>:null}
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>05</span><h2>最近交易</h2></div><strong>{studentTxs.length} 筆</strong></div>
      {!studentTxs.length?<p className="muted">這位學生目前還沒有交易紀錄。</p>:<div className="txList">
        {studentTxs.map(t=><article key={t.id}>
          <div className={'txIcon '+t.transaction_type}>{t.transaction_type==='top_up'?'+':t.transaction_type==='charge'?'−':'↺'}</div>
          <div className="txText"><b>{typeText[t.transaction_type]??t.transaction_type}{t.category_id&&categoryMap.get(t.category_id)?' · '+categoryMap.get(t.category_id):''}</b><small>交易 #{t.transaction_no} · {new Date(t.created_at).toLocaleString('zh-TW')}</small>{t.note?<p>{t.note}</p>:null}</div>
          <div className="txAmount"><strong>{t.transaction_type==='charge'?'-':'+'}{money(Number(t.amount)).replace('NT
        </article>)}
      </div>}
    </section></>:null}

    <style>{'.walletShell{max-width:960px}.walletSearch{display:flex;gap:8px;margin-bottom:12px}.walletSearch input{flex:1;min-width:0;padding:11px 12px;border:1px solid #dce2e8;border-radius:12px;font:inherit}.studentPicker{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:280px;overflow:auto}.studentPicker a{display:flex;flex-direction:column;gap:2px;padding:10px 11px;border:1px solid #e2e7ed;border-radius:12px;text-decoration:none;color:#263244;background:#fff}.studentPicker a.active{border-color:var(--theme-accent,#7c3aed);background:var(--theme-soft,#f5f3ff)}.studentPicker small{color:#7c8796;font-size:10px}.walletHeroCard{display:grid;grid-template-columns:1fr 1.2fr;gap:16px;align-items:center;margin:14px 0;padding:18px;border-radius:22px;background:linear-gradient(135deg,#18202d,#344158);color:#fff}.walletHeroCard span{font-size:10px;letter-spacing:.08em;color:#cbd5e1}.walletHeroCard h2{margin:4px 0;font-size:25px}.walletHeroCard small{color:#cbd5e1}.balanceBox{text-align:right}.balanceBox strong{display:block;font-size:36px;line-height:1.1;margin:5px 0}.walletActionsGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.walletForm{display:grid;grid-template-columns:1fr 1fr;gap:9px}.walletForm label{font-size:11px;font-weight:900;color:#667386}.walletForm input,.walletForm select{display:block;width:100%;margin-top:5px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.walletForm .wide{grid-column:1/-1}.permissionNote{margin:10px 0 0;padding:9px 11px;border-radius:10px;background:#fff7ed;color:#9a5a24;font-size:11px}.txList{display:grid;gap:8px}.txList article{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;padding:11px;border:1px solid #e5e9ee;border-radius:14px}.txIcon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:950;background:#eef2f6}.txIcon.top_up{background:#eaf8f0;color:#238454}.txIcon.charge{background:#fff1ee;color:#c34b3f}.txText{min-width:0}.txText small,.txAmount small{display:block;color:#7b8795;font-size:10px;margin-top:2px}.txText p{margin:4px 0 0;color:#607083;font-size:11px}.txAmount{text-align:right}.txAmount strong{font-size:16px}.reverseForm{margin-top:6px}.reverseForm button{font-size:10px;padding:5px 8px}.txAmount em{display:inline-block;margin-top:4px;padding:2px 5px;border-radius:999px;background:#eef2f6;color:#6b7280;font-size:9px;font-style:normal}.newCardBox{display:grid;gap:7px;margin:10px 0;padding:12px;border-radius:14px;background:#eefaf4;border:1px solid #ccebd9}.newCardBox code{display:block;overflow-wrap:anywhere;padding:9px;border-radius:9px;background:#fff;font-size:11px}.newCardBox p{margin:0;color:#617263;font-size:11px}.nfcCurrent{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border:1px solid #e2e7ed;border-radius:14px}.nfcCurrent>div:first-child{display:flex;flex-direction:column;gap:3px}.nfcCurrent small{color:#7b8795;font-size:10px}.nfcButtons{display:flex;gap:7px}.bindCardForm{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:10px}.bindCardForm label{font-size:11px;font-weight:900;color:#667386}.bindCardForm input{display:block;width:100%;margin-top:5px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.cardHistory{margin-top:12px}.cardHistory summary{cursor:pointer;font-size:11px;font-weight:800;color:#657285}.cardHistory div{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid #eef1f4;font-size:11px}.cardHistory small{color:#7b8795}@media(max-width:760px){.studentPicker{grid-template-columns:repeat(2,1fr)}.walletHeroCard,.walletActionsGrid{grid-template-columns:1fr}.balanceBox{text-align:left}.walletForm{grid-template-columns:1fr}.walletForm .wide{grid-column:auto}.walletSearch{flex-wrap:wrap}.nfcCurrent{align-items:flex-start;flex-direction:column}.nfcButtons{width:100%}.nfcButtons form{flex:1}.nfcButtons button{width:100%}.bindCardForm{grid-template-columns:1fr}.walletSearch input{flex-basis:100%}}@media(max-width:440px){.studentPicker{grid-template-columns:1fr}.txList article{grid-template-columns:auto 1fr}.txAmount{grid-column:2;text-align:left}.balanceBox strong{font-size:31px}}'}</style>
  </main>;
}
,'')}</strong><small>餘額 {money(Number(t.balance_after))}</small>{t.status==='reversed'?<em>已沖正</em>:null}{canReverse&&t.status==='posted'&&(t.transaction_type==='top_up'||t.transaction_type==='charge')?<form action={reverseWalletTransaction} className="reverseForm"><input type="hidden" name="student_id" value={selected.id}/><input type="hidden" name="transaction_id" value={t.id}/><input type="hidden" name="note" value="誤登沖正"/><button className="dangerButton">沖正</button></form>:null}</div>
        </article>)}
      </div>}
    </section></>:null}

    <style>{'.walletShell{max-width:960px}.walletSearch{display:flex;gap:8px;margin-bottom:12px}.walletSearch input{flex:1;min-width:0;padding:11px 12px;border:1px solid #dce2e8;border-radius:12px;font:inherit}.studentPicker{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:280px;overflow:auto}.studentPicker a{display:flex;flex-direction:column;gap:2px;padding:10px 11px;border:1px solid #e2e7ed;border-radius:12px;text-decoration:none;color:#263244;background:#fff}.studentPicker a.active{border-color:var(--theme-accent,#7c3aed);background:var(--theme-soft,#f5f3ff)}.studentPicker small{color:#7c8796;font-size:10px}.walletHeroCard{display:grid;grid-template-columns:1fr 1.2fr;gap:16px;align-items:center;margin:14px 0;padding:18px;border-radius:22px;background:linear-gradient(135deg,#18202d,#344158);color:#fff}.walletHeroCard span{font-size:10px;letter-spacing:.08em;color:#cbd5e1}.walletHeroCard h2{margin:4px 0;font-size:25px}.walletHeroCard small{color:#cbd5e1}.balanceBox{text-align:right}.balanceBox strong{display:block;font-size:36px;line-height:1.1;margin:5px 0}.walletActionsGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.walletForm{display:grid;grid-template-columns:1fr 1fr;gap:9px}.walletForm label{font-size:11px;font-weight:900;color:#667386}.walletForm input,.walletForm select{display:block;width:100%;margin-top:5px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.walletForm .wide{grid-column:1/-1}.permissionNote{margin:10px 0 0;padding:9px 11px;border-radius:10px;background:#fff7ed;color:#9a5a24;font-size:11px}.txList{display:grid;gap:8px}.txList article{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;padding:11px;border:1px solid #e5e9ee;border-radius:14px}.txIcon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:950;background:#eef2f6}.txIcon.top_up{background:#eaf8f0;color:#238454}.txIcon.charge{background:#fff1ee;color:#c34b3f}.txText{min-width:0}.txText small,.txAmount small{display:block;color:#7b8795;font-size:10px;margin-top:2px}.txText p{margin:4px 0 0;color:#607083;font-size:11px}.txAmount{text-align:right}.txAmount strong{font-size:16px}.txAmount em{display:inline-block;margin-top:4px;padding:2px 5px;border-radius:999px;background:#eef2f6;color:#6b7280;font-size:9px;font-style:normal}.newCardBox{display:grid;gap:7px;margin:10px 0;padding:12px;border-radius:14px;background:#eefaf4;border:1px solid #ccebd9}.newCardBox code{display:block;overflow-wrap:anywhere;padding:9px;border-radius:9px;background:#fff;font-size:11px}.newCardBox p{margin:0;color:#617263;font-size:11px}.nfcCurrent{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border:1px solid #e2e7ed;border-radius:14px}.nfcCurrent>div:first-child{display:flex;flex-direction:column;gap:3px}.nfcCurrent small{color:#7b8795;font-size:10px}.nfcButtons{display:flex;gap:7px}.bindCardForm{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:10px}.bindCardForm label{font-size:11px;font-weight:900;color:#667386}.bindCardForm input{display:block;width:100%;margin-top:5px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.cardHistory{margin-top:12px}.cardHistory summary{cursor:pointer;font-size:11px;font-weight:800;color:#657285}.cardHistory div{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid #eef1f4;font-size:11px}.cardHistory small{color:#7b8795}@media(max-width:760px){.studentPicker{grid-template-columns:repeat(2,1fr)}.walletHeroCard,.walletActionsGrid{grid-template-columns:1fr}.balanceBox{text-align:left}.walletForm{grid-template-columns:1fr}.walletForm .wide{grid-column:auto}.walletSearch{flex-wrap:wrap}.nfcCurrent{align-items:flex-start;flex-direction:column}.nfcButtons{width:100%}.nfcButtons form{flex:1}.nfcButtons button{width:100%}.bindCardForm{grid-template-columns:1fr}.walletSearch input{flex-basis:100%}}@media(max-width:440px){.studentPicker{grid-template-columns:1fr}.txList article{grid-template-columns:auto 1fr}.txAmount{grid-column:2;text-align:left}.balanceBox strong{font-size:31px}}'}</style>
  </main>;
}
