'use client';

import { useRef, useState } from 'react';

type Column = { key:string; label:string };
type Props = {
  title:string;
  filename:string;
  columns:Column[];
  rows:Record<string, unknown>[];
  lineTitle?:string;
  importAction?: (formData:FormData)=>void | Promise<void>;
  importHelp?:string;
};

function csvEscape(value:unknown){ const text=String(value ?? ''); return `"${text.replaceAll('"','""')}"`; }
function download(content:string,type:string,filename:string){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
function parseCsv(text:string){
  const rows:string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){ cell+='"'; i++; }
      else quoted=!quoted;
    } else if(ch===',' && !quoted){ row.push(cell); cell=''; }
    else if((ch==='\n' || ch==='\r') && !quoted){ if(ch==='\r' && text[i+1]==='\n') i++; row.push(cell); if(row.some(v=>v.trim())) rows.push(row); row=[]; cell=''; }
    else cell+=ch;
  }
  row.push(cell); if(row.some(v=>v.trim())) rows.push(row);
  if(!rows.length) return [];
  const headers=rows[0].map(v=>v.trim());
  return rows.slice(1).map(r=>Object.fromEntries(headers.map((h,idx)=>[h,r[idx] ?? ''])));
}

function lineText(props:Props){
  const lines=[props.lineTitle ?? props.title,''];
  props.rows.forEach((row,idx)=>{ lines.push(`${idx+1}. `+props.columns.map(c=>`${c.label}：${String(row[c.key] ?? '')}`).join('｜')); });
  return lines.join('\n');
}

function exportImage(props:Props){
  const width=900; const lineHeight=28; const height=Math.max(360,150+props.rows.length*lineHeight*1.7);
  const canvas=document.createElement('canvas'); canvas.width=width*2; canvas.height=height*2; const ctx=canvas.getContext('2d'); if(!ctx) return;
  ctx.scale(2,2); ctx.fillStyle='#f5f7fa'; ctx.fillRect(0,0,width,height); ctx.fillStyle='#172033'; ctx.font='700 30px sans-serif'; ctx.fillText(props.title,36,48);
  ctx.font='14px sans-serif'; let y=92;
  props.rows.forEach((row,idx)=>{ ctx.fillStyle='#fff'; ctx.fillRect(28,y-20,width-56,Math.max(44,lineHeight+12)); ctx.fillStyle='#172033'; const text=`${idx+1}. `+props.columns.map(c=>`${c.label} ${String(row[c.key] ?? '')}`).join('　'); ctx.fillText(text.slice(0,110),42,y+6); y+=lineHeight+24; });
  const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download=`${props.filename}.png`; a.click();
}

export default function DataPortTools(props:Props){
  const fileRef=useRef<HTMLInputElement>(null); const [payload,setPayload]=useState(''); const [importName,setImportName]=useState('');
  const exportCsv=()=>{ const rows:unknown[][]=[props.columns.map(c=>c.label),...props.rows.map(r=>props.columns.map(c=>r[c.key]))]; const csv='\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\r\n'); download(csv,'text/csv;charset=utf-8',`${props.filename}.csv`); };
  const exportJson=()=>download(JSON.stringify(props.rows,null,2),'application/json;charset=utf-8',`${props.filename}.json`);
  const copyLine=async()=>{ await navigator.clipboard.writeText(lineText(props)); alert('已複製 LINE 文字。'); };
  const onFile=async(file?:File)=>{ if(!file) return; const text=await file.text(); let rows:unknown[]=[]; try{ rows=file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCsv(text.replace(/^\ufeff/,'')); if(!Array.isArray(rows)) throw new Error('格式錯誤'); setPayload(JSON.stringify(rows)); setImportName(`${file.name}｜${rows.length} 筆`); }catch{ setPayload(''); setImportName('檔案格式無法解析'); } };
  return <div className="dataPortTools">
    <div className="dataPortButtons"><button type="button" onClick={copyLine}>LINE 文字</button><button type="button" onClick={()=>exportImage(props)}>圖片</button><button type="button" onClick={exportCsv}>Excel / CSV</button><button type="button" onClick={exportJson}>JSON</button></div>
    {props.importAction ? <form action={props.importAction} className="dataImportForm"><input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={e=>onFile(e.target.files?.[0])}/><input type="hidden" name="import_payload" value={payload}/><button disabled={!payload}>匯入檔案</button><small>{importName || props.importHelp || '支援 Excel 匯出的 CSV 與 JSON'}</small></form> : null}
    <style>{`.dataPortTools{margin:12px 0;padding:12px;border:1px solid #e0e5eb;border-radius:14px;background:#f9fbfc}.dataPortButtons{display:flex;gap:8px;flex-wrap:wrap}.dataPortButtons button,.dataImportForm button{border:0;border-radius:9px;padding:9px 12px;background:#e9eef3;color:#243246;font-weight:800;cursor:pointer}.dataImportForm{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.dataImportForm input[type=file]{max-width:260px}.dataImportForm small{color:#748094}.dataImportForm button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:620px){.dataPortButtons button{flex:1 1 46%}.dataImportForm{align-items:stretch}.dataImportForm input[type=file],.dataImportForm button{width:100%;max-width:none}}`}</style>
  </div>;
}
