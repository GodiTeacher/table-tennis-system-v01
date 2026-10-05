'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';

type Row={display_name:string;grade:number|null;class_name:string|null;seat_number:number|null;gender:string|null;confidence:number|null};
type Quota={used:number;monthlyLimit:number|null;remaining:number|null};
type Crop={x:number;y:number;w:number;h:number};

async function compressImage(file:File){
  const bitmap=await createImageBitmap(file);
  const max=3200;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('無法處理圖片');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));if(!blob)throw new Error('圖片壓縮失敗');
  return new File([blob],'student-roster.jpg',{type:'image/jpeg'});
}

async function makeRecognitionParts(file:File,crop:Crop){
  const bitmap=await createImageBitmap(file);
  const sx=Math.max(0,Math.round(bitmap.width*crop.x/100));const sy=Math.max(0,Math.round(bitmap.height*crop.y/100));
  const sw=Math.max(1,Math.min(bitmap.width-sx,Math.round(bitmap.width*crop.w/100)));const sh=Math.max(1,Math.min(bitmap.height-sy,Math.round(bitmap.height*crop.h/100)));
  const ratio=sh/sw;
  const parts=ratio>5.2?8:ratio>4.2?7:ratio>3.2?6:ratio>2.35?5:ratio>1.55?4:3;
  const segmentH=sh/parts;const overlap=Math.max(8,Math.round(segmentH*.16));
  const result:File[]=[];
  for(let i=0;i<parts;i++){
    const baseStart=Math.round(segmentH*i);const baseEnd=Math.round(segmentH*(i+1));
    const localStart=Math.max(0,baseStart-(i?overlap:0));const localEnd=Math.min(sh,baseEnd+(i<parts-1?overlap:0));const partH=Math.max(1,localEnd-localStart);
    const scale=Math.max(1,Math.min(6,1800/sw,1350/partH));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(partH*scale));
    const ctx=canvas.getContext('2d');if(!ctx)continue;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter='grayscale(1) contrast(1.3) brightness(1.05)';
    ctx.drawImage(bitmap,sx,sy+localStart,sw,partH,0,0,canvas.width,canvas.height);ctx.filter='none';
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));if(blob)result.push(new File([blob],`roster-part-${String(i+1).padStart(2,'0')}.jpg`,{type:'image/jpeg'}));
  }
  bitmap.close();return result;
}

export default function StudentPhotoImport({importAction}:{importAction:(formData:FormData)=>void|Promise<void>}){
  const pathname=usePathname();const cropRef=useRef<HTMLDivElement|null>(null);const dragStart=useRef<{x:number;y:number}|null>(null);
  const [open,setOpen]=useState(false);const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState('');const [rows,setRows]=useState<Row[]>([]);const [quota,setQuota]=useState<Quota|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [progress,setProgress]=useState(0);const [progressText,setProgressText]=useState('');const [crop,setCrop]=useState<Crop>({x:0,y:0,w:100,h:100});const [cropTouched,setCropTouched]=useState(false);

  useEffect(()=>{if(pathname==='/students')fetch('/api/ocr-students/quota',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(d.ok)setQuota({used:d.used,monthlyLimit:d.monthlyLimit,remaining:d.remaining});}).catch(()=>{});},[pathname]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  useEffect(()=>{if(open)document.body.classList.add('photoImportOpen');else document.body.classList.remove('photoImportOpen');return()=>document.body.classList.remove('photoImportOpen');},[open]);
  useEffect(()=>{if(!busy)return;const stages=[{p:15,t:'正在裁切與放大…'},{p:30,t:'正在切成多個小區段…'},{p:50,t:'正在逐段辨識姓名…'},{p:70,t:'正在補抓漏掉的姓名…'},{p:86,t:'正在合併與去除重複…'},{p:94,t:'即將完成…'}];let i=0;setProgress(7);setProgressText('正在準備照片…');const timer=setInterval(()=>{if(i<stages.length){setProgress(stages[i].p);setProgressText(stages[i].t);i++;}},2600);return()=>clearInterval(timer);},[busy]);
  const quotaText=useMemo(()=>quota?.monthlyLimit==null?'照片文字辨識不限次數':`本月已用 ${quota?.used??0} / ${quota?.monthlyLimit??5} 次`,[quota]);
  if(pathname!=='/students')return null;

  async function choose(next:File|null){setError('');setRows([]);if(preview)URL.revokeObjectURL(preview);setPreview('');setFile(null);setCrop({x:0,y:0,w:100,h:100});setCropTouched(false);if(!next)return;try{const compressed=await compressImage(next);setFile(compressed);setPreview(URL.createObjectURL(compressed));}catch(e:any){setError(e?.message||'圖片處理失敗');}}
  function pointPct(e:React.PointerEvent<HTMLDivElement>){const rect=cropRef.current?.getBoundingClientRect();if(!rect)return null;return{x:Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))};}
  function cropStart(e:React.PointerEvent<HTMLDivElement>){if(busy)return;const p=pointPct(e);if(!p)return;dragStart.current=p;e.currentTarget.setPointerCapture(e.pointerId);setCrop({x:p.x,y:p.y,w:0,h:0});setCropTouched(true);}
  function cropMove(e:React.PointerEvent<HTMLDivElement>){if(!dragStart.current)return;const p=pointPct(e);if(!p)return;const s=dragStart.current;setCrop({x:Math.min(s.x,p.x),y:Math.min(s.y,p.y),w:Math.abs(p.x-s.x),h:Math.abs(p.y-s.y)});}
  function cropEnd(){dragStart.current=null;setCrop(c=>c.w<5||c.h<5?{x:0,y:0,w:100,h:100}:c);}
  function resetCrop(){setCrop({x:0,y:0,w:100,h:100});setCropTouched(false);}

  async function recognize(){
    if(!file)return;setBusy(true);setError('');
    try{
      const parts=await makeRecognitionParts(file,crop);if(!parts.length)throw new Error('無法建立辨識圖片，請重新選擇照片');
      const fd=new FormData();parts.forEach(p=>fd.append('images',p));fd.set('fields',JSON.stringify(['display_name']));
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),50000);
      const res=await fetch('/api/ocr-students/recognize',{method:'POST',body:fd,signal:controller.signal});clearTimeout(timer);
      const data=await res.json().catch(()=>({ok:false,error:'辨識服務回傳格式異常'}));if(!res.ok||!data.ok)throw new Error(data.error||'辨識失敗');
      setProgress(100);setProgressText('辨識完成');setRows(data.rows??[]);if(data.quota)setQuota(data.quota);
    }catch(e:any){setError(e?.name==='AbortError'?'辨識超過 50 秒，已停止。這次不扣使用次數，請把框選範圍縮小後再試。':(e?.message||'辨識失敗'));}finally{setTimeout(()=>{setBusy(false);setProgress(0);setProgressText('');},250);}
  }
  function patch(i:number,value:string){setRows(rows=>rows.map((r,idx)=>idx===i?{...r,display_name:value}:r));}

  return <>
    <button className="photoImportFab" onClick={()=>setOpen(true)}>📷 拍照匯入名單</button>
    {open?<div className="photoImportBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setOpen(false)}}><section className="photoImportModal">
      <div className="photoImportHead"><div><span>快速建立學生</span><h2>拍照辨識學生姓名</h2><p>V1 先把「姓名」做到快又準；班級、座號、性別之後會用整列對齊方式加入。</p></div><button aria-label="關閉" disabled={busy} onClick={()=>setOpen(false)}>×</button></div>
      <div className="quotaBar"><b>{quotaText}</b><small>照片只用於本次辨識，不永久保存。</small></div>
      {!rows.length?<>
        <div className="nameOnlyNotice"><b>這一版只辨識姓名</b><span>請框住姓名欄，框得越精準，辨識率越高。</span></div>
        <div className="photoPickArea">
          {preview?<><div className="cropHelp"><b>框選姓名欄</b><span>{cropTouched?'已框選，可重新拖曳調整':'請直接在照片上拖曳，只框姓名'}</span><button type="button" onClick={resetCrop}>辨識整張</button></div><div ref={cropRef} className="cropStage" onPointerDown={cropStart} onPointerMove={cropMove} onPointerUp={cropEnd} onPointerCancel={cropEnd}><img src={preview} alt="學生名單預覽" draggable={false}/><div className="cropShade"/><div className="cropBox" style={{left:`${crop.x}%`,top:`${crop.y}%`,width:`${crop.w}%`,height:`${crop.h}%`}}><span>姓名辨識範圍</span></div></div></>:<div className="photoPlaceholder">📄<b>請拍攝或選擇學生名單</b><small>選好後直接框住姓名欄即可</small></div>}
          <div className="photoSourceActions"><label className="secondaryButton">🖼️ 從相簿選擇<input hidden type="file" accept="image/*" onChange={e=>choose(e.target.files?.[0]??null)}/></label><label className="secondaryButton">📷 直接拍照<input hidden type="file" accept="image/*" capture="environment" onChange={e=>choose(e.target.files?.[0]??null)}/></label></div>
          {file&&!cropTouched?<div className="cropTip">💡 建議先框住姓名欄；系統會自動切成更多小段、放大後並行辨識。</div>:null}
          {busy?<div className="recognitionProgress"><div className="recognitionProgressTop"><b>{progressText||'辨識中…'}</b><span>{progress}%</span></div><div className="recognitionProgressTrack"><i style={{width:`${progress}%`}}/></div><small>長姓名欄會自動切成 3～8 段，重疊辨識後再合併去重。</small></div>:null}
          <div className="photoActions"><button className="primaryButton" disabled={!file||busy||quota?.remaining===0} onClick={recognize}>{busy?'辨識中…':'開始辨識姓名'}</button></div>
        </div>
      </>:<form action={importAction} className="photoReviewForm">
        <input type="hidden" name="import_payload" value={JSON.stringify(rows.map(({confidence,...r})=>r))}/>
        <div className="reviewTitle"><div><b>辨識到 {rows.length} 位學生</b><small>請快速掃一遍；錯字可以直接修改。</small></div><button type="button" className="secondaryButton" onClick={()=>setRows([])}>重新辨識</button></div>
        <div className="photoTableWrap"><table><thead><tr><th>姓名</th><th></th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.display_name}-${i}`}><td><input value={r.display_name} onChange={e=>patch(i,e.target.value)}/></td><td><button type="button" className="removeRow" onClick={()=>setRows(rows=>rows.filter((_,idx)=>idx!==i))}>刪除</button></td></tr>)}</tbody></table></div>
        <div className="photoFooter"><button type="button" className="secondaryButton" onClick={()=>setRows(rows=>[...rows,{display_name:'',grade:null,class_name:null,seat_number:null,gender:null,confidence:null}])}>＋補一位</button><button className="primaryButton" disabled={!rows.some(r=>r.display_name.trim())}>確認匯入 {rows.filter(r=>r.display_name.trim()).length} 位學生</button></div>
      </form>}
      {error?<div className="photoError">{error}</div>:null}<div className="photoModalBottomSpacer"/>
    </section></div>:null}
    <style jsx global>{`
      body.photoImportOpen{overflow:hidden}.photoImportFab{position:fixed;right:22px;bottom:92px;z-index:45;border:0;border-radius:999px;padding:12px 16px;background:var(--theme-accent,#0f766e);color:#fff;font-weight:900;box-shadow:0 12px 32px rgba(20,30,45,.22)}.photoImportBackdrop{position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.45);display:grid;place-items:center;padding:18px}.photoImportModal{width:min(920px,100%);max-height:calc(100dvh - 28px);overflow:auto;overscroll-behavior:contain;background:#fff;border-radius:24px;padding:20px 20px 34px}.photoImportHead{display:flex;justify-content:space-between;gap:18px}.photoImportHead h2{margin:4px 0;font-size:23px}.photoImportHead p{margin:0;color:#758092;font-size:13px}.photoImportHead span{font-size:10px;font-weight:950;letter-spacing:.13em;color:#8994a4}.photoImportHead>button{border:0;background:#f2f5f7;border-radius:50%;width:34px;height:34px;min-width:34px;font-size:22px}.quotaBar{display:flex;justify-content:space-between;gap:12px;margin:16px 0;padding:10px 12px;border-radius:13px;background:#f6f8fa;color:#586575;font-size:12px}.nameOnlyNotice{display:flex;flex-direction:column;gap:4px;padding:12px 14px;margin-bottom:14px;border-radius:14px;background:#eef7f5;color:#324b48}.nameOnlyNotice span{font-size:12px;color:#667386}.photoPickArea{border:1px dashed #ccd5df;border-radius:18px;padding:14px}.photoPlaceholder{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#6d7989;font-size:34px}.photoPlaceholder b{font-size:15px;color:#334155}.photoPlaceholder small{font-size:12px}.cropHelp{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:9px;font-size:12px;color:#667386}.cropHelp span{flex:1;min-width:180px}.cropHelp button{border:1px solid #dbe2e9;background:#fff;border-radius:10px;padding:7px 10px;font-weight:800}.cropStage{position:relative;width:min(100%,620px);margin:auto;touch-action:none;user-select:none;overflow:hidden;border-radius:14px;background:#eef2f5}.cropStage img{display:block;width:100%;height:auto;pointer-events:none}.cropShade{position:absolute;inset:0;background:rgba(15,23,42,.20);pointer-events:none}.cropBox{position:absolute;border:3px solid #ff8a3d;background:rgba(255,255,255,.08);pointer-events:none;min-width:2px;min-height:2px}.cropBox span{position:absolute;left:0;top:-28px;background:#ff8a3d;color:#fff;padding:4px 7px;border-radius:7px;font-size:10px;font-weight:900;white-space:nowrap}.photoSourceActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.photoSourceActions label{text-align:center}.cropTip{margin-top:10px;padding:10px 12px;border-radius:12px;background:#fff7ed;color:#9a5a24;font-size:12px;font-weight:700}.photoActions,.photoFooter{display:flex;justify-content:flex-end;gap:9px;margin-top:11px}.recognitionProgress{margin-top:12px;padding:12px;border-radius:13px;background:#f6f8fa}.recognitionProgressTop{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#4b596b}.recognitionProgressTrack{height:8px;background:#e4e9ee;border-radius:999px;overflow:hidden;margin:8px 0}.recognitionProgressTrack i{display:block;height:100%;border-radius:inherit;background:var(--theme-accent,#0f766e);transition:width .45s ease}.recognitionProgress small{font-size:11px;color:#7d8998}.primaryButton,.secondaryButton{border:0;border-radius:12px;padding:11px 14px;font-weight:900}.primaryButton{background:#26364b;color:#fff}.secondaryButton{background:#eef2f6;color:#26364b}.reviewTitle{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:8px 0 12px}.reviewTitle small{display:block;color:#8a6b28;margin-top:4px}.photoTableWrap{overflow:auto;border:1px solid #e1e7ed;border-radius:14px;max-height:min(58vh,620px)}.photoTableWrap table{width:100%;border-collapse:collapse;min-width:360px}.photoTableWrap th,.photoTableWrap td{padding:8px;border-bottom:1px solid #e8edf2;text-align:left}.photoTableWrap input{width:100%;border:1px solid #dbe2e9;border-radius:9px;padding:9px;background:#fff}.removeRow{border:0;background:#fff0f0;color:#b42318;border-radius:8px;padding:7px}.photoError{margin-top:12px;padding:12px 14px;border-radius:12px;background:#fff0ee;color:#b42318;font-size:12px;font-weight:800}.photoModalBottomSpacer{height:8px}
      @media(max-width:720px){.photoImportBackdrop{padding:0;align-items:end}.photoImportModal{max-height:calc(100dvh - 18px);border-radius:24px 24px 0 0;padding:18px 16px max(116px,calc(env(safe-area-inset-bottom) + 92px))}.quotaBar{flex-direction:column}.cropStage{width:100%}.photoSourceActions{grid-template-columns:1fr 1fr}.photoActions{position:static}.photoActions .primaryButton{width:100%}.photoFooter{position:static;background:#fff;padding:10px 0}.photoTableWrap{max-height:52vh;overflow-y:auto;-webkit-overflow-scrolling:touch}.cropHelp span{min-width:100%}}
    `}</style>
  </>;
}
