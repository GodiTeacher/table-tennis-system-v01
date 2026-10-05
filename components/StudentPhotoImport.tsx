'use client';

import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';

type Row={display_name:string;grade:number|null;class_name:string|null;seat_number:number|null;gender:string|null;confidence:number|null};
type Quota={used:number;monthlyLimit:number|null;remaining:number|null};
type FieldKey='display_name'|'grade'|'class_name'|'seat_number'|'gender';
const FIELD_OPTIONS:Array<{key:FieldKey;label:string;hint:string}>=[
  {key:'display_name',label:'姓名',hint:'必要欄位'},
  {key:'grade',label:'年級',hint:'例如 1～6 年級'},
  {key:'class_name',label:'班級',hint:'例如 102、三甲'},
  {key:'seat_number',label:'座號',hint:'例如 1、12'},
  {key:'gender',label:'性別',hint:'男／女'},
];

async function compressImage(file:File){
  const bitmap=await createImageBitmap(file);
  const max=2800; const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d'); if(!ctx)throw new Error('無法處理圖片'); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
  if(!blob)throw new Error('圖片壓縮失敗');
  return new File([blob],'student-roster.jpg',{type:'image/jpeg'});
}

export default function StudentPhotoImport({importAction}:{importAction:(formData:FormData)=>void|Promise<void>}){
  const pathname=usePathname();
  const [open,setOpen]=useState(false); const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(''); const [rows,setRows]=useState<Row[]>([]); const [quota,setQuota]=useState<Quota|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [progress,setProgress]=useState(0); const [progressText,setProgressText]=useState('');
  const [fields,setFields]=useState<FieldKey[]>(['display_name','grade','class_name']);
  useEffect(()=>{if(pathname==='/students')fetch('/api/ocr-students/quota',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(d.ok)setQuota({used:d.used,monthlyLimit:d.monthlyLimit,remaining:d.remaining});}).catch(()=>{});},[pathname]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  useEffect(()=>{if(open)document.body.classList.add('photoImportOpen');else document.body.classList.remove('photoImportOpen');return()=>document.body.classList.remove('photoImportOpen');},[open]);
  useEffect(()=>{if(!busy)return;const stages=[{p:18,t:'正在準備圖片…'},{p:38,t:'正在讀取名單文字…'},{p:62,t:'正在辨識學生資料…'},{p:82,t:'正在整理成表格…'},{p:92,t:'即將完成…'}];let i=0;setProgress(8);setProgressText('正在上傳照片…');const timer=setInterval(()=>{if(i<stages.length){setProgress(stages[i].p);setProgressText(stages[i].t);i++;}},1100);return()=>clearInterval(timer);},[busy]);
  const quotaText=useMemo(()=>quota?.monthlyLimit==null?'照片文字辨識不限次數':`本月已用 ${quota?.used??0} / ${quota?.monthlyLimit??5} 次`,[quota]);
  if(pathname!=='/students')return null;

  function toggleField(key:FieldKey){if(key==='display_name')return;setFields(current=>current.includes(key)?current.filter(x=>x!==key):[...current,key]);}
  async function choose(next:File|null){setError('');setRows([]);if(preview)URL.revokeObjectURL(preview);setPreview('');setFile(null);if(!next)return;try{const compressed=await compressImage(next);setFile(compressed);setPreview(URL.createObjectURL(compressed));}catch(e:any){setError(e?.message||'圖片處理失敗');}}
  async function recognize(){
    if(!file)return; setBusy(true);setError('');
    try{
      const fd=new FormData();fd.set('image',file);fd.set('fields',JSON.stringify(fields));
      const res=await fetch('/api/ocr-students/recognize',{method:'POST',body:fd});
      const data=await res.json().catch(()=>({ok:false,error:'辨識服務回傳格式異常'}));
      if(!res.ok||!data.ok)throw new Error(data.error||'辨識失敗');
      setProgress(100);setProgressText('辨識完成');setRows(data.rows??[]);if(data.quota)setQuota(data.quota);
    }catch(e:any){setError(e?.message||'辨識失敗');}finally{setTimeout(()=>{setBusy(false);setProgress(0);setProgressText('');},250);}
  }
  function patch(i:number,key:keyof Row,value:any){setRows(rows=>rows.map((r,idx)=>idx===i?{...r,[key]:value}:r));}

  return <>
    <button className="photoImportFab" onClick={()=>setOpen(true)}>📷 拍照匯入名單</button>
    {open?<div className="photoImportBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setOpen(false)}}><section className="photoImportModal">
      <div className="photoImportHead"><div><span>快速建立學生</span><h2>拍照辨識學生名單</h2><p>先勾選照片裡真的有的欄位，再開始辨識。不同學校的名單格式不一樣，這樣辨識會更準。</p></div><button aria-label="關閉" disabled={busy} onClick={()=>setOpen(false)}>×</button></div>
      <div className="quotaBar"><b>{quotaText}</b><small>照片只用於本次辨識，不永久保存。</small></div>
      {!rows.length?<>
        <div className="recognitionFields"><div className="recognitionFieldsTitle"><b>這張名單要辨識哪些資料？</b><small>姓名固定辨識；其他只勾照片中有的欄位。</small></div><div className="recognitionFieldGrid">{FIELD_OPTIONS.map(option=>{const checked=fields.includes(option.key);return <button key={option.key} type="button" className={`recognitionField ${checked?'selected':''}`} onClick={()=>toggleField(option.key)} aria-pressed={checked}><span>{checked?'✓':'＋'}</span><div><b>{option.label}</b><small>{option.hint}</small></div></button>})}</div></div>
        <div className="photoPickArea">
          {preview?<img src={preview} alt="學生名單預覽"/>:<div className="photoPlaceholder">📄<b>請拍攝或選擇學生名單</b><small>建議正面拍攝、文字佔滿畫面、避免反光與模糊</small></div>}
          <div className="photoSourceActions"><label className="secondaryButton">🖼️ 從相簿選擇<input hidden type="file" accept="image/*" onChange={e=>choose(e.target.files?.[0]??null)}/></label><label className="secondaryButton">📷 直接拍照<input hidden type="file" accept="image/*" capture="environment" onChange={e=>choose(e.target.files?.[0]??null)}/></label></div>
          {busy?<div className="recognitionProgress"><div className="recognitionProgressTop"><b>{progressText||'辨識中…'}</b><span>{progress}%</span></div><div className="recognitionProgressTrack"><i style={{width:`${progress}%`}}/></div><small>辨識時間通常約數秒至十多秒，請保持此頁開啟。</small></div>:null}
          <div className="photoActions"><button className="primaryButton" disabled={!file||busy||quota?.remaining===0} onClick={recognize}>{busy?'辨識中…':'開始辨識'}</button></div>
        </div>
      </>:<form action={importAction} className="photoReviewForm">
        <input type="hidden" name="import_payload" value={JSON.stringify(rows.map(({confidence,...r})=>r))}/>
        <div className="reviewTitle"><div><b>辨識到 {rows.length} 位學生</b><small>黃色提示代表辨識信心較低，請特別確認。</small></div><button type="button" className="secondaryButton" onClick={()=>setRows([])}>重新拍攝</button></div>
        <div className="photoTableWrap"><table><thead><tr><th>姓名</th>{fields.includes('grade')?<th>年級</th>:null}{fields.includes('class_name')?<th>班級</th>:null}{fields.includes('seat_number')?<th>座號</th>:null}{fields.includes('gender')?<th>性別</th>:null}<th></th></tr></thead><tbody>{rows.map((r,i)=><tr key={i} className={r.confidence!=null&&r.confidence<.75?'lowConfidence':''}><td><input value={r.display_name} onChange={e=>patch(i,'display_name',e.target.value)}/></td>{fields.includes('grade')?<td><select value={r.grade??''} onChange={e=>patch(i,'grade',e.target.value?Number(e.target.value):null)}><option value="">未設定</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g}</option>)}</select></td>:null}{fields.includes('class_name')?<td><input value={r.class_name??''} onChange={e=>patch(i,'class_name',e.target.value||null)}/></td>:null}{fields.includes('seat_number')?<td><input type="number" min="1" max="99" value={r.seat_number??''} onChange={e=>patch(i,'seat_number',e.target.value?Number(e.target.value):null)}/></td>:null}{fields.includes('gender')?<td><select value={r.gender??''} onChange={e=>patch(i,'gender',e.target.value||null)}><option value="">未設定</option><option>男</option><option>女</option><option>其他</option></select></td>:null}<td><button type="button" className="removeRow" onClick={()=>setRows(rows=>rows.filter((_,idx)=>idx!==i))}>刪除</button></td></tr>)}</tbody></table></div>
        <div className="photoFooter"><button type="button" className="secondaryButton" onClick={()=>setRows(rows=>[...rows,{display_name:'',grade:null,class_name:null,seat_number:null,gender:null,confidence:null}])}>＋補一位</button><button className="primaryButton" disabled={!rows.some(r=>r.display_name.trim())}>確認匯入 {rows.filter(r=>r.display_name.trim()).length} 位學生</button></div>
      </form>}
      {error?<div className="photoError">{error}</div>:null}<div className="photoModalBottomSpacer"/>
    </section></div>:null}
    <style jsx global>{`
      body.photoImportOpen{overflow:hidden}.photoImportFab{position:fixed;right:22px;bottom:92px;z-index:45;border:0;border-radius:999px;padding:12px 16px;background:var(--theme-accent,#0f766e);color:#fff;font-weight:900;box-shadow:0 12px 32px rgba(20,30,45,.22);cursor:pointer}.photoImportBackdrop{position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.45);display:grid;place-items:center;padding:18px}.photoImportModal{width:min(920px,100%);max-height:calc(100dvh - 28px);overflow:auto;overscroll-behavior:contain;background:#fff;border-radius:24px;padding:20px 20px 34px;box-shadow:0 24px 70px rgba(15,23,42,.28)}.photoImportHead{display:flex;justify-content:space-between;gap:18px}.photoImportHead span{font-size:10px;font-weight:950;letter-spacing:.13em;color:#8994a4}.photoImportHead h2{margin:4px 0;font-size:23px}.photoImportHead p{margin:0;color:#758092;font-size:13px}.photoImportHead>button{border:0;background:#f2f5f7;border-radius:50%;width:34px;height:34px;min-width:34px;font-size:22px;cursor:pointer}.quotaBar{display:flex;justify-content:space-between;gap:12px;margin:16px 0;padding:10px 12px;border-radius:13px;background:#f6f8fa;color:#586575;font-size:12px}.quotaBar small{color:#7c8796}.recognitionFields{margin:0 0 14px;padding:13px;border:1px solid #e6eaf0;border-radius:16px;background:#fbfcfd}.recognitionFieldsTitle{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.recognitionFieldsTitle small{color:#7b8795}.recognitionFieldGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.recognitionField{border:1px solid #dce3ea;border-radius:12px;background:#fff;padding:9px;display:flex;gap:7px;align-items:center;text-align:left;color:#647184;cursor:pointer}.recognitionField.selected{border-color:var(--theme-accent,#0f766e);background:#f0f8f7;color:#243746}.recognitionField>span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#eef2f5;font-weight:900}.recognitionField.selected>span{background:var(--theme-accent,#0f766e);color:#fff}.recognitionField div{display:flex;flex-direction:column}.recognitionField b{font-size:13px}.recognitionField small{font-size:10px;color:#8a95a3}.photoPickArea{border:1px dashed #ccd5df;border-radius:18px;padding:14px}.photoPickArea img{display:block;max-width:100%;max-height:44vh;margin:auto;border-radius:13px}.photoPlaceholder{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#6d7989;font-size:34px}.photoPlaceholder b{font-size:15px;color:#334155}.photoPlaceholder small{font-size:12px}.photoSourceActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.photoSourceActions label{text-align:center;cursor:pointer}.photoActions,.photoFooter{display:flex;justify-content:flex-end;gap:9px;margin-top:11px}.photoActions .primaryButton{min-width:180px}.recognitionProgress{margin-top:12px;padding:12px;border-radius:13px;background:#f6f8fa}.recognitionProgressTop{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#4b596b}.recognitionProgressTrack{height:8px;background:#e4e9ee;border-radius:999px;overflow:hidden;margin:8px 0}.recognitionProgressTrack i{display:block;height:100%;border-radius:inherit;background:var(--theme-accent,#0f766e);transition:width .45s ease}.recognitionProgress small{font-size:11px;color:#7d8998}.photoActions button:disabled,.photoFooter button:disabled{opacity:.45;cursor:not-allowed}.reviewTitle{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:8px 0 12px}.reviewTitle div{display:flex;flex-direction:column;gap:3px}.reviewTitle small{color:#8a6c29}.photoTableWrap{overflow:auto}.photoTableWrap table{width:100%;border-collapse:collapse;min-width:620px}.photoTableWrap th,.photoTableWrap td{padding:7px;border-bottom:1px solid #edf0f3;text-align:left}.photoTableWrap th{font-size:11px;color:#768294}.photoTableWrap input,.photoTableWrap select{width:100%;border:1px solid #dce2e8;border-radius:9px;padding:8px;background:#fff}.photoTableWrap tr.lowConfidence{background:#fff8e7}.removeRow{border:0;background:none;color:#b42318;font-weight:800;cursor:pointer}.photoError{margin-top:12px;padding:10px 12px;border-radius:11px;background:#fff1f0;color:#b42318;font-size:12px;font-weight:800}.photoModalBottomSpacer{height:8px}
      @media(max-width:680px){.photoImportFab{right:12px;bottom:84px;padding:11px 14px}.photoImportBackdrop{padding:0;align-items:end}.photoImportModal{width:100%;max-height:calc(100dvh - 64px);border-radius:22px 22px 0 0;padding:16px 15px calc(118px + env(safe-area-inset-bottom));box-shadow:0 -12px 45px rgba(15,23,42,.24)}.photoImportHead h2{font-size:21px}.quotaBar,.reviewTitle,.recognitionFieldsTitle{align-items:flex-start;flex-direction:column}.recognitionFieldGrid{grid-template-columns:1fr 1fr}.recognitionField:first-child{grid-column:1/-1}.photoPickArea img{max-height:42vh}.photoSourceActions{grid-template-columns:1fr 1fr}.photoActions{position:sticky;bottom:0;background:#fff;padding:10px 0 4px;justify-content:stretch}.photoActions .primaryButton{width:100%;min-width:0}.photoFooter{position:sticky;bottom:0;background:#fff;padding:10px 0 4px}.photoModalBottomSpacer{height:12px}}
    `}</style>
  </>;
}
