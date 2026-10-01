'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AirconGroupFeeExport from '@/components/AirconGroupFeeExport';

type Row={name:string;monthlyFee:number;members:number;personHours:number;theoreticalShare:number;groupCoolingFee:number;coolingPerPerson:number;totalPerPerson:number};
type Data={month:string;totalCost:number;rows:Row[];unclassified:{personHours:number;groupCoolingFee:number}|null;rounding:string};

export default function AirconGroupFeeEnhancer(){
  const [data,setData]=useState<Data|null>(null);const [mount,setMount]=useState<HTMLElement|null>(null);
  useEffect(()=>{
    if(window.location.pathname!=='/aircon')return;const qs=new URLSearchParams(window.location.search);if(qs.get('allocate')!=='1')return;const month=qs.get('month');if(!month)return;
    const host=document.getElementById('group-results');if(!host)return;let target=host.querySelector<HTMLElement>('[data-aircon-ceil-results]');if(!target){target=document.createElement('div');target.dataset.airconCeilResults='1';host.appendChild(target);}setMount(target);
    const oldGrid=host.querySelector<HTMLElement>('.groupResultGrid');const oldNotice=oldGrid?.nextElementSibling as HTMLElement|null;
    const url=`/api/aircon/group-fees?month=${encodeURIComponent(month)}${qs.get('allow_unclassified')==='1'?'&allow_unclassified=1':''}`;
    fetch(url,{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||'計算失敗');return j as Data;}).then(j=>{setData(j);if(oldGrid)oldGrid.style.display='none';if(oldNotice?.classList.contains('notice'))oldNotice.style.display='none';}).catch(()=>{});
    return()=>{if(oldGrid)oldGrid.style.display='';if(oldNotice?.classList.contains('notice'))oldNotice.style.display='';target?.remove();};
  },[]);
  if(!mount||!data)return null;
  return createPortal(<div className="ceilFeeBlock">
    <div className="ceilNotice"><b>實際收費採無條件進位。</b> 每人冷氣費先無條件進位到整元，再乘以群組收費人數，因此不會因小數四捨五入而少收。</div>
    <div className="ceilGrid">{data.rows.map(r=><article key={r.name}><header><div><b>{r.name}</b><span>原月費 ${Math.round(r.monthlyFee).toLocaleString()}｜{r.members} 人</span></div><strong>{r.personHours.toFixed(1)} 人時</strong></header><div className="ceilMetrics"><div><span>群組應收冷氣費</span><b>${r.groupCoolingFee.toLocaleString()}</b></div><div><span>每人冷氣費</span><b>{r.members>0?`$${r.coolingPerPerson.toLocaleString()}`:'請填人數'}</b></div><div><span>每人本月應收</span><b>{r.members>0?`$${Math.round(r.totalPerPerson).toLocaleString()}`:'—'}</b></div></div></article>)}{data.unclassified&&data.unclassified.groupCoolingFee>0?<article className="unclassified"><header><div><b>未分類／其他</b><span>尚未指定到月費群組的人數</span></div><strong>{data.unclassified.personHours.toFixed(1)} 人時</strong></header><div className="ceilMetrics"><div><span>應分攤冷氣費</span><b>${data.unclassified.groupCoolingFee.toLocaleString()}</b></div><div><span>狀態</span><b>待後續處理</b></div><div><span>說明</span><b>不轉嫁其他群組</b></div></div></article>:null}</div>
    <div className="ceilRule"><b>收費規則：</b>理論群組分攤仍依加權人時比例計算；真正向家長收費時，每人冷氣費採無條件進位至整元，群組應收金額＝進位後每人冷氣費 × 收費人數。</div>
    <div className="exportBox"><b>匯出家長／教練通知</b><AirconGroupFeeExport month={data.month} totalCost={data.totalCost} rows={data.rows} unclassified={data.unclassified}/></div>
    <style jsx>{`.ceilFeeBlock{margin-top:14px}.ceilNotice,.ceilRule{padding:12px 14px;border-radius:12px;background:var(--theme-soft,#f4f7fa);font-size:13px;line-height:1.55}.ceilNotice{background:#eefaf2;color:#27633c}.ceilGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.ceilGrid article{border:1px solid #e1e6eb;border-radius:14px;background:#fff;padding:13px}.ceilGrid article.unclassified{border-style:dashed}.ceilGrid header{display:flex;justify-content:space-between;gap:10px}.ceilGrid header>div{display:flex;flex-direction:column;gap:2px}.ceilGrid header span{font-size:12px;color:#748191}.ceilGrid header>strong{color:var(--theme-accent,#7c3aed)}.ceilMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.ceilMetrics div{padding:10px;border-radius:10px;background:var(--theme-soft,#f4f7fa)}.ceilMetrics span{display:block;font-size:10px;color:#748191}.ceilMetrics b{font-size:15px}.exportBox{margin-top:12px;padding:12px 14px;border:1px solid #e1e6eb;border-radius:12px;background:#fff}.exportBox>b{display:block;margin-bottom:4px}@media(max-width:760px){.ceilGrid{grid-template-columns:1fr}.ceilMetrics{grid-template-columns:1fr 1fr 1fr}}@media(max-width:520px){.ceilMetrics{grid-template-columns:1fr}}`}</style>
  </div>,mount);
}
