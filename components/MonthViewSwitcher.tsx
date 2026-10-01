'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export default function MonthViewSwitcher({label}:{label:string}){
  const pathname=usePathname();
  const searchParams=useSearchParams();
  const now=new Date();
  const fallback=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const month=searchParams.get('month')||fallback;
  const change=(value:string)=>{
    if(!value)return;
    const p=new URLSearchParams(searchParams.toString());
    p.set('month',value);
    p.set('date',`${value}-01`);
    p.delete('message');p.delete('error');p.delete('calculate');p.delete('allocate');
    window.location.href=`${pathname}?${p.toString()}`;
  };
  return <div className="monthViewShell"><div className="monthViewCard"><div><small>VIEW MONTH</small><b>{label}</b><span>只切換檢視月份，不會新增、修改或重新套用資料。</span></div><input aria-label={label} type="month" value={month} onChange={e=>change(e.target.value)}/></div>
    <style>{`.monthViewShell{max-width:980px;margin:18px auto -4px;padding:0 16px}.monthViewCard{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:14px 16px;border:1px solid rgba(124,58,237,.16);border-radius:18px;background:rgba(255,255,255,.86);box-shadow:0 8px 28px rgba(42,31,78,.06);backdrop-filter:blur(8px)}.monthViewCard div{display:flex;flex-direction:column;gap:2px}.monthViewCard small{font-size:10px;font-weight:900;letter-spacing:.08em;color:var(--theme-accent,#7c3aed)}.monthViewCard b{font-size:16px}.monthViewCard span{font-size:12px;color:#748191}.monthViewCard input{min-width:170px;padding:10px 12px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font-size:14px}@media(max-width:600px){.monthViewCard{align-items:stretch;flex-direction:column}.monthViewCard input{width:100%;min-width:0}}`}</style>
  </div>;
}
