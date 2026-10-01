'use client';

import { useMemo, useState } from 'react';

type Segment={id:string;date:string;start:string;end:string;total:number};
type Group={id:string;name:string};
type Props={month:string;segments:Segment[];groups:Group[];initial:Record<string,number>;saveAction:(formData:FormData)=>void|Promise<void>};

export default function AirconGroupAttendanceEditor({month,segments,groups,initial,saveAction}:Props){
  const [values,setValues]=useState<Record<string,number>>(initial);
  const rows=useMemo(()=>segments.map(s=>{const counts=groups.map(g=>Math.max(0,Number(values[`${s.id}:${g.id}`]??0)));const sum=counts.reduce((a,b)=>a+b,0);return {...s,counts,sum,diff:s.total-sum};}),[segments,groups,values]);
  const complete=rows.filter(r=>r.diff===0).length;
  const over=rows.filter(r=>r.diff<0).length;
  const set=(key:string,raw:string)=>{const n=raw===''?0:Math.max(0,Math.floor(Number(raw)||0));setValues(v=>({...v,[key]:n}));};
  return <form action={saveAction} className="groupAttendanceForm">
    <input type="hidden" name="month" value={month}/>
    <div className="groupAttendanceBar"><div><b>{complete}/{rows.length} 個時段已完整分組</b><span>{over?`有 ${over} 個時段超過總人數，請先修正。`:'每列群組合計應與學生出勤的總人數一致。'}</span></div><button className="primaryButton" disabled={over>0}>💾 一次儲存整月群組人數</button></div>
    <div className="groupAttendanceTable">
      <div className="groupAttendanceHead"><span>日期／時段</span><span>學生出勤總數</span>{groups.map(g=><span key={g.id}>{g.name}</span>)}<span>群組合計</span></div>
      {rows.map(r=><div className={`groupAttendanceRow ${r.diff===0?'complete':r.diff<0?'over':'incomplete'}`} key={r.id}>
        <div className="segmentLabel"><b>{r.date}</b><span>{r.start}–{r.end}</span></div>
        <strong>{r.total} 人</strong>
        {groups.map((g,i)=>{const key=`${r.id}:${g.id}`;return <label key={g.id}><span>{g.name}</span><input type="number" min="0" inputMode="numeric" name={`g_${r.id}_${g.id}`} value={r.counts[i]} onChange={e=>set(key,e.target.value)}/></label>})}
        <div className="rowCheck"><b>{r.sum}/{r.total}</b><span>{r.diff===0?'完成':r.diff>0?`尚差 ${r.diff} 人`:`超過 ${Math.abs(r.diff)} 人`}</span></div>
      </div>)}
    </div>
    <div className="groupAttendanceFooter"><button className="primaryButton" disabled={over>0}>💾 一次儲存整月群組人數</button></div>
    <style>{`.groupAttendanceForm{margin-top:12px}.groupAttendanceBar,.groupAttendanceFooter{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0}.groupAttendanceBar>div{display:flex;flex-direction:column;gap:2px}.groupAttendanceBar span{font-size:12px;color:#748191}.groupAttendanceTable{border:1px solid #e1e6eb;border-radius:14px;overflow:auto;background:#fff}.groupAttendanceHead,.groupAttendanceRow{display:grid;grid-template-columns:170px 120px repeat(${Math.max(groups.length,1)},minmax(120px,1fr)) 120px;gap:8px;align-items:center;min-width:${420+Math.max(groups.length,1)*130}px}.groupAttendanceHead{padding:10px 12px;background:var(--theme-soft,#f4f7fa);font-size:12px;font-weight:900;color:#586575;position:sticky;top:0;z-index:1}.groupAttendanceRow{padding:9px 12px;border-top:1px solid #eef1f4}.segmentLabel{display:flex;flex-direction:column}.segmentLabel b{font-size:13px}.segmentLabel span,.rowCheck span{font-size:11px;color:#748191}.groupAttendanceRow>strong{font-size:14px}.groupAttendanceRow label>span{display:none}.groupAttendanceRow input{width:100%;min-width:84px;padding:9px;border:1px solid #dce2e8;border-radius:9px;background:#fff;font-size:14px}.rowCheck{display:flex;flex-direction:column}.groupAttendanceRow.complete .rowCheck b{color:#157347}.groupAttendanceRow.incomplete .rowCheck b{color:#9a6700}.groupAttendanceRow.over{background:#fff3f3}.groupAttendanceRow.over .rowCheck b{color:#b42318}.groupAttendanceFooter{justify-content:flex-end}.primaryButton:disabled{opacity:.45;cursor:not-allowed}@media(max-width:700px){.groupAttendanceHead{display:none}.groupAttendanceTable{border:0;overflow:visible;background:transparent}.groupAttendanceRow{display:grid;grid-template-columns:1fr 1fr;min-width:0;margin-bottom:9px;border:1px solid #e1e6eb;border-radius:12px;background:#fff}.groupAttendanceRow label{display:flex;align-items:center;gap:8px}.groupAttendanceRow label>span{display:block;flex:1;font-size:12px;font-weight:800}.groupAttendanceRow input{width:90px}.rowCheck{text-align:right}.groupAttendanceBar{align-items:stretch;flex-direction:column}.groupAttendanceFooter button,.groupAttendanceBar button{width:100%}}`}</style>
  </form>;
}
