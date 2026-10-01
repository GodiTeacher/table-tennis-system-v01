'use client';

import { useEffect, useState } from 'react';
import AirconGroupFeeExport from '@/components/AirconGroupFeeExport';

type Row={name:string;monthlyFee:number;members:number;personHours:number;theoreticalShare:number;groupCoolingFee:number;coolingPerPerson:number;totalPerPerson:number};
type Data={month:string;totalCost:number;rows:Row[];unclassified:{personHours:number;groupCoolingFee:number}|null;rounding:string};

export default function AirconGroupFeeEnhancer(){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState('');
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    if(window.location.pathname!=='/aircon')return;
    const qs=new URLSearchParams(window.location.search);
    if(qs.get('allocate')!=='1')return;
    const month=qs.get('month');if(!month)return;
    setVisible(true);
    const url=`/api/aircon/group-fees?month=${encodeURIComponent(month)}${qs.get('allow_unclassified')==='1'?'&allow_unclassified=1':''}`;
    fetch(url,{cache:'no-store',credentials:'same-origin'})
      .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||'冷氣費匯出資料讀取失敗');return j as Data;})
      .then(j=>{setData(j);setError('');})
      .catch(e=>setError(e instanceof Error?e.message:'冷氣費匯出資料讀取失敗'));
  },[]);

  if(!visible)return null;
  return <aside className="airconExportDock">
    <div className="airconExportHead"><div><small>冷氣月結</small><b>冷氣費匯出</b></div><span>{data?.month??'讀取中'}</span></div>
    {error?<div className="airconExportError">{error}</div>:data?<><div className="airconExportSummary">學校冷氣費 <b>${Math.ceil(data.totalCost).toLocaleString()}</b>｜實際收費採無條件進位</div><AirconGroupFeeExport month={data.month} totalCost={data.totalCost} rows={data.rows} unclassified={data.unclassified}/></>:<div className="airconExportLoading">正在準備匯出資料…</div>}
    <style jsx>{`
      .airconExportDock{position:fixed;right:18px;bottom:92px;z-index:38;width:min(390px,calc(100vw - 28px));padding:14px;border-radius:18px;background:rgba(255,255,255,.96);border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 25%,#dfe5ea);box-shadow:0 16px 36px rgba(28,38,65,.16);backdrop-filter:blur(14px)}
      .airconExportHead{display:flex;justify-content:space-between;align-items:center;gap:10px}.airconExportHead>div{display:flex;flex-direction:column}.airconExportHead small{font-size:10px;color:#7a8594}.airconExportHead b{font-size:16px;color:#263244}.airconExportHead>span{font-size:11px;font-weight:900;color:var(--theme-accent,#7c3aed);background:var(--theme-soft,#f4f1ff);padding:4px 8px;border-radius:999px}.airconExportSummary{margin-top:9px;padding:9px 10px;border-radius:11px;background:var(--theme-soft,#f6f4ff);font-size:12px;color:#596577}.airconExportError{margin-top:9px;padding:10px;border-radius:10px;background:#fff1f0;color:#ad3d35;font-size:12px}.airconExportLoading{margin-top:9px;color:#7a8594;font-size:12px}
      @media(max-width:650px){.airconExportDock{left:10px;right:10px;bottom:78px;width:auto}}
    `}</style>
  </aside>;
}
