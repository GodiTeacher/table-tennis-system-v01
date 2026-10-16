import {createHash} from 'node:crypto';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type PublicWallet={
  team:{name:string;short_name:string|null;school_name:string|null;logo_data_url:string|null;brand_color:string|null};
  student:{display_name:string;grade:number|null;class_name:string|null;seat_number:number|null};
  wallet:{balance:number;low_balance_threshold:number;is_low_balance:boolean};
  transactions:Array<{
    transaction_no:number;transaction_type:string;amount:number;balance_after:number;
    note:string|null;status:string;created_at:string;category_name:string|null;
  }>;
};

const money=(v:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(v);
const typeText:Record<string,string>={top_up:'儲值',charge:'扣款',refund:'退款',reversal:'沖正',adjustment:'調整'};

export default async function FamilyWalletPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const raw=String(token??'').trim();
  if(!raw)notFound();

  const tokenHash=createHash('sha256').update(raw).digest('hex');
  const supabase=await createClient();
  const {data,error}=await supabase.rpc('get_public_wallet_by_token',{target_token_hash:tokenHash});
  if(error||!data)notFound();

  const info=data as PublicWallet;
  const color=info.team.brand_color||'#7c3aed';

  return <main className="familyWallet" style={{'--family-color':color} as React.CSSProperties}>
    <section className="familyHero">
      <div className="familyBrand">
        {info.team.logo_data_url?<img src={info.team.logo_data_url} alt="Logo"/>:<div className="familyLogo">🏓</div>}
        <div><span>{info.team.school_name||'桌球隊'}</span><h1>{info.team.short_name||info.team.name}</h1></div>
      </div>
    </section>

    <section className="familyBody">
      <article className="studentCard">
        <div><span>學生</span><h2>{info.student.display_name}</h2><small>{info.student.grade?info.student.grade+'年級':''}{info.student.class_name?' · '+info.student.class_name:''}{info.student.seat_number?' · '+info.student.seat_number+'號':''}</small></div>
        <div className="familyBalance"><span>目前餘額</span><strong>{money(Number(info.wallet.balance))}</strong></div>
      </article>

      {info.wallet.is_low_balance?<div className="lowBalance">⚠️ 餘額低於 {money(Number(info.wallet.low_balance_threshold))}，請留意後續儲值。</div>:<div className="balanceOk">✓ 目前餘額高於提醒門檻 {money(Number(info.wallet.low_balance_threshold))}</div>}

      <section className="familyCard">
        <div className="familyTitle"><h2>最近交易</h2><span>{info.transactions.length} 筆</span></div>
        {!info.transactions.length?<p className="muted">目前尚無交易紀錄。</p>:<div className="familyTxList">
          {info.transactions.map(t=><article key={t.transaction_no}>
            <div><b>{typeText[t.transaction_type]??t.transaction_type}{t.category_name?' · '+t.category_name:''}</b><small>{new Date(t.created_at).toLocaleString('zh-TW')}</small>{t.note?<p>{t.note}</p>:null}</div>
            <div className="familyTxAmount"><strong>{t.transaction_type==='charge'?'-':t.transaction_type==='top_up'?'+':'↺ '}{money(Number(t.amount)).replace('NT$','')}</strong><small>餘額 {money(Number(t.balance_after))}</small>{t.status==='reversed'?<em>已沖正</em>:null}</div>
          </article>)}
        </div>}
      </section>

      <footer>此頁僅提供查詢。家長無法透過此連結修改餘額、儲值或扣款。</footer>
    </section>

    <style>{'.familyWallet{min-height:100vh;background:linear-gradient(180deg,color-mix(in srgb,var(--family-color) 10%,#f8fafc),#fff);color:#202938}.familyHero{padding:28px 16px 52px;background:linear-gradient(135deg,var(--family-color),color-mix(in srgb,var(--family-color) 72%,#ffffff));color:#fff}.familyBrand{max-width:720px;margin:auto;display:flex;gap:13px;align-items:center}.familyBrand img,.familyLogo{width:62px;height:62px;border-radius:18px;background:#fff;object-fit:contain;display:grid;place-items:center;font-size:28px}.familyBrand span{font-size:11px;opacity:.86}.familyBrand h1{margin:3px 0 0;font-size:24px}.familyBody{max-width:720px;margin:-30px auto 0;padding:0 14px 60px}.studentCard,.familyCard{background:#fff;border:1px solid #e5e9ef;border-radius:22px;box-shadow:0 10px 28px rgba(24,33,47,.07)}.studentCard{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:18px}.studentCard span,.studentCard small{color:#7b8795;font-size:10px}.studentCard h2{margin:3px 0;font-size:22px}.familyBalance{text-align:right}.familyBalance strong{display:block;margin-top:4px;font-size:31px;color:var(--family-color)}.lowBalance,.balanceOk{margin:12px 0;padding:12px 14px;border-radius:14px;font-size:12px;font-weight:800}.lowBalance{background:#fff2e8;color:#a35a18}.balanceOk{background:#edf8f2;color:#2c7650}.familyCard{padding:16px}.familyTitle{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.familyTitle h2{margin:0;font-size:17px}.familyTitle span{font-size:11px;color:#7b8795}.familyTxList{display:grid;gap:8px}.familyTxList article{display:grid;grid-template-columns:1fr auto;gap:12px;padding:11px;border:1px solid #edf0f4;border-radius:13px}.familyTxList b{font-size:13px}.familyTxList small{display:block;color:#7b8795;font-size:10px;margin-top:3px}.familyTxList p{margin:4px 0 0;font-size:11px;color:#657184}.familyTxAmount{text-align:right}.familyTxAmount strong{font-size:14px}.familyTxAmount em{display:block;margin-top:4px;font-size:9px;color:#8a5d32;font-style:normal}footer{text-align:center;color:#8791a0;font-size:10px;padding:18px 8px}@media(max-width:520px){.studentCard{grid-template-columns:1fr}.familyBalance{text-align:left}.familyTxList article{grid-template-columns:1fr}.familyTxAmount{text-align:left}}'}</style>
  </main>;
}
