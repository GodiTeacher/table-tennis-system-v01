'use client';

import { useEffect, useMemo, useState } from 'react';

type Segment={id:string;date:string;start:string;end:string;total:number};
type Group={id:string;name:string};
type Props={month:string;segments:Segment[];groups:Group[];initial:Record<string,number>;saveAction:(formData:FormData)=>void|Promise<void>};
type Pattern={key:string;weekday:number;start:string;end:string;usualTotal:number;count:number};
type SavedPattern={group_id:string;weekday:number;start_time:string;end_time:string;default_count:number};

const WEEK=['一','二','三','四','五','六','日'];
const isoWeekday=(date:string)=>{const d=new Date(`${date}T00:00:00`).getDay();return d===0?7:d;};

export default function AirconGroupAttendanceEditor({month,segments,groups,initial,saveAction}:Props){
  const [values,setValues]=useState<Record<string,number>>(initial);
  const patterns=useMemo<Pattern[]>(()=>{
    const map=new Map<string,{key:string;weekday:number;start:string;end:string;totals:number[];count:number}>();
    for(const s of segments){
      const wd=isoWeekday(s.date),key=`${wd}-${s.start}-${s.end}`;const old=map.get(key);
      if(old){old.totals.push(s.total);old.count+=1;}else map.set(key,{key,weekday:wd,start:s.start,end:s.end,totals:[s.total],count:1});
    }
    return [...map.values()].map(p=>({key:p.key,weekday:p.weekday,start:p.start,end:p.end,usualTotal:Math.max(...p.totals),count:p.count})).sort((a,b)=>a.weekday-b.weekday||a.start.localeCompare(b.start));
  },[segments]);
  const defaultQuickCounts=useMemo(()=>Object.fromEntries(groups.map(g=>{
    const nums=segments.map(s=>Number(initial[`${s.id}:${g.id}`]??0)).filter(n=>n>0);return [g.id,nums.length?Math.max(...nums):0];
  })),[groups,segments,initial]);
  const [quickCounts,setQuickCounts]=useState<Record<string,number>>(defaultQuickCounts);
  const [selected,setSelected]=useState<Record<string,string[]>>({});
  const [moduleLoaded,setModuleLoaded]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/aircon/group-patterns',{cache:'no-store'}).then(r=>r.ok?r.json():{patterns:[]}).then((payload:{patterns?:SavedPattern[]})=>{
      if(cancelled)return;
      const sel:Record<string,string[]>={};const counts:Record<string,number>={...defaultQuickCounts};
      for(const p of payload.patterns??[]){
        const start=String(p.start_time).slice(0,5),end=String(p.end_time).slice(0,5);const key=`${Number(p.weekday)}-${start}-${end}`;
        sel[p.group_id]=[...(sel[p.group_id]??[]),key];counts[p.group_id]=Number(p.default_count??0);
      }
      setSelected(sel);setQuickCounts(counts);setModuleLoaded(true);
    }).catch(()=>setModuleLoaded(true));
    return ()=>{cancelled=true;};
  },[defaultQuickCounts]);

  const rows=useMemo(()=>segments.map(s=>{const counts=groups.map(g=>Math.max(0,Number(values[`${s.id}:${g.id}`]??0)));const sum=counts.reduce((a,b)=>a+b,0);return {...s,counts,sum,diff:s.total-sum};}),[segments,groups,values]);
  const complete=rows.filter(r=>r.diff===0).length;
  const over=rows.filter(r=>r.diff<0).length;
  const set=(key:string,raw:string)=>{const n=raw===''?0:Math.max(0,Math.floor(Number(raw)||0));setValues(v=>({...v,[key]:n}));};
  const togglePattern=(groupId:string,key:string)=>setSelected(prev=>{const list=prev[groupId]??[];return {...prev,[groupId]:list.includes(key)?list.filter(x=>x!==key):[...list,key]};});
  const applyGroup=(groupId:string)=>{
    const count=Math.max(0,Math.floor(Number(quickCounts[groupId]??0)));const picks=new Set(selected[groupId]??[]);if(!picks.size)return;
    setValues(prev=>{const next={...prev};for(const s of segments){const key=`${isoWeekday(s.date)}-${s.start}-${s.end}`;if(picks.has(key))next[`${s.id}:${groupId}`]=count;}return next;});
  };
  const clearGroup=(groupId:string)=>setValues(prev=>{const next={...prev};for(const s of segments)next[`${s.id}:${groupId}`]=0;return next;});
  const selectedPatternObjects=(groupId:string)=>(selected[groupId]??[]).map(key=>patterns.find(p=>p.key===key)).filter(Boolean).map(p=>({weekday:p!.weekday,start:p!.start,end:p!.end}));

  return <form action={saveAction} className="groupAttendanceForm">
    <input type="hidden" name="month" value={month}/>
    {groups.map(g=><span key={`hidden-${g.id}`}><input type="hidden" name={`module_count_${g.id}`} value={quickCounts[g.id]??0}/><input type="hidden" name={`module_patterns_${g.id}`} value={JSON.stringify(selectedPatternObjects(g.id))}/></span>)}
    <div className="quickFillBox">
      <div className="quickFillIntro"><b>⚡ 固定月費群組模組</b><span>設定一次後會記住。下個月進來時，勾選的固定時段與平常帶入人數會自動保留；只要微調人數或特殊日期即可。</span></div>
      <div className="quickGroupGrid">{groups.map(g=><article key={g.id} className="quickGroupCard">
        <header><b>{g.name}</b><label>平常帶入人數<input type="number" min="0" inputMode="numeric" value={quickCounts[g.id]??0} onChange={e=>setQuickCounts(v=>({...v,[g.id]:Math.max(0,Math.floor(Number(e.target.value)||0))}))}/></label></header>
        <div className="templateChoices">{patterns.map(p=>{const checked=(selected[g.id]??[]).includes(p.key);return <label key={p.key} className={checked?'picked':''}><input type="checkbox" checked={checked} onChange={()=>togglePattern(g.id,p.key)}/><span><b>週{WEEK[p.weekday-1]} {p.start}–{p.end}</b><small>本月 {p.count} 次 · 時段總人數約 {p.usualTotal}</small></span></label>})}</div>
        <div className="quickActions"><button type="button" className="secondaryButton" onClick={()=>setSelected(v=>({...v,[g.id]:patterns.map(p=>p.key)}))}>全選時段</button><button type="button" className="secondaryButton" onClick={()=>setSelected(v=>({...v,[g.id]:[]}))}>取消全選</button><button type="button" className="dangerButton" onClick={()=>clearGroup(g.id)}>清除此組</button><button type="button" className="primaryButton" disabled={(selected[g.id]??[]).length===0} onClick={()=>applyGroup(g.id)}>套用此群組</button></div>
      </article>)}</div>
      <div className="quickHint">{moduleLoaded?'固定模組已載入。':'正在讀取固定模組…'} 套用後先填入下方表格；最後按「一次儲存整月群組人數」，會同時保存本月資料與固定模組。</div>
    </div>

    <div className="groupAttendanceBar"><div><b>{complete}/{rows.length} 個時段已完整分組</b><span>{over?`有 ${over} 個時段超過總人數，請先修正。`:'不足的時段可以先儲存；結果區可選擇把剩餘人數列為「未分類／其他」。'}</span></div><button className="primaryButton" disabled={over>0}>💾 一次儲存整月群組人數</button></div>
    <div className="groupAttendanceTable">
      <div className="groupAttendanceHead"><span>日期／時段</span><span>學生出勤總數</span>{groups.map(g=><span key={g.id}>{g.name}</span>)}<span>群組合計</span></div>
      {rows.map(r=><div className={`groupAttendanceRow ${r.diff===0?'complete':r.diff<0?'over':'incomplete'}`} key={r.id}>
        <div className="segmentLabel"><b>{r.date}</b><span>{r.start}–{r.end}</span></div>
        <strong>{r.total} 人</strong>
        {groups.map((g,i)=>{const key=`${r.id}:${g.id}`;return <label key={g.id}><span>{g.name}</span><input type="number" min="0" inputMode="numeric" name={`g_${r.id}_${g.id}`} value={r.counts[i]} onChange={e=>set(key,e.target.value)}/></label>})}
        <div className="rowCheck"><b>{r.sum}/{r.total}</b><span>{r.diff===0?'完成':r.diff>0?`未分類 ${r.diff} 人`:`超過 ${Math.abs(r.diff)} 人`}</span></div>
      </div>)}
    </div>
    <div className="groupAttendanceFooter"><button className="primaryButton" disabled={over>0}>💾 一次儲存整月群組人數</button></div>
    <style>{`.groupAttendanceForm{margin-top:12px}.quickFillBox{margin:12px 0 18px;padding:14px;border:1px solid #e1e6eb;border-radius:14px;background:var(--theme-soft,#f7f8fb)}.quickFillIntro{display:flex;flex-direction:column;gap:3px;margin-bottom:12px}.quickFillIntro b{font-size:15px}.quickFillIntro span,.quickHint{font-size:12px;color:#677586}.quickGroupGrid{display:grid;gap:10px}.quickGroupCard{padding:12px;border:1px solid #dfe5ea;border-radius:13px;background:#fff}.quickGroupCard header{display:flex;justify-content:space-between;align-items:center;gap:12px}.quickGroupCard header>label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;color:#607080}.quickGroupCard header input{width:82px;padding:8px;border:1px solid #dce2e8;border-radius:9px}.templateChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.templateChoices label{display:flex;gap:8px;align-items:flex-start;padding:8px 9px;border:1px solid #e1e6eb;border-radius:10px;background:#fff;cursor:pointer}.templateChoices label.picked{border-color:var(--theme-accent,#7c3aed);background:color-mix(in srgb,var(--theme-soft,#f3ecff) 80%,white)}.templateChoices input{margin-top:3px}.templateChoices span{display:flex;flex-direction:column;gap:2px}.templateChoices b{font-size:12px}.templateChoices small{font-size:10px;color:#748191}.quickActions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:10px}.quickHint{margin-top:10px;padding:9px 10px;border-radius:9px;background:#fff}.groupAttendanceBar,.groupAttendanceFooter{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0}.groupAttendanceBar>div{display:flex;flex-direction:column;gap:2px}.groupAttendanceBar span{font-size:12px;color:#748191}.groupAttendanceTable{border:1px solid #e1e6eb;border-radius:14px;overflow:auto;background:#fff}.groupAttendanceHead,.groupAttendanceRow{display:grid;grid-template-columns:170px 120px repeat(${Math.max(groups.length,1)},minmax(120px,1fr)) 120px;gap:8px;align-items:center;min-width:${420+Math.max(groups.length,1)*130}px}.groupAttendanceHead{padding:10px 12px;background:var(--theme-soft,#f4f7fa);font-size:12px;font-weight:900;color:#586575;position:sticky;top:0;z-index:1}.groupAttendanceRow{padding:9px 12px;border-top:1px solid #eef1f4}.segmentLabel{display:flex;flex-direction:column}.segmentLabel b{font-size:13px}.segmentLabel span,.rowCheck span{font-size:11px;color:#748191}.groupAttendanceRow>strong{font-size:14px}.groupAttendanceRow label>span{display:none}.groupAttendanceRow input{width:100%;min-width:84px;padding:9px;border:1px solid #dce2e8;border-radius:9px;background:#fff;font-size:14px}.rowCheck{display:flex;flex-direction:column}.groupAttendanceRow.complete .rowCheck b{color:#157347}.groupAttendanceRow.incomplete .rowCheck b{color:#9a6700}.groupAttendanceRow.over{background:#fff3f3}.groupAttendanceRow.over .rowCheck b{color:#b42318}.groupAttendanceFooter{justify-content:flex-end}.primaryButton:disabled{opacity:.45;cursor:not-allowed}@media(max-width:900px){.templateChoices{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.quickGroupCard header{align-items:flex-start;flex-direction:column}.templateChoices{grid-template-columns:1fr}.quickActions{justify-content:stretch}.quickActions button{flex:1}.groupAttendanceHead{display:none}.groupAttendanceTable{border:0;overflow:visible;background:transparent}.groupAttendanceRow{display:grid;grid-template-columns:1fr 1fr;min-width:0;margin-bottom:9px;border:1px solid #e1e6eb;border-radius:12px;background:#fff}.groupAttendanceRow label{display:flex;align-items:center;gap:8px}.groupAttendanceRow label>span{display:block;flex:1;font-size:12px;font-weight:800}.groupAttendanceRow input{width:90px}.rowCheck{text-align:right}.groupAttendanceBar{align-items:stretch;flex-direction:column}.groupAttendanceFooter button,.groupAttendanceBar button{width:100%}}`}</style>
  </form>;
}
