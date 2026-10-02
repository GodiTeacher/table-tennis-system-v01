'use client';

import {useEffect,useMemo,useState} from 'react';

type Props={currentImages?:string[]|null};
const MAX_IMAGES=6;

function isUsableImageSource(src:string){
  const s=src.trim();
  return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(s)||/^https?:\/\//i.test(s);
}

async function compressImage(file:File){
  if(!file.type.startsWith('image/'))throw new Error('請選擇圖片檔。');
  const bitmap=await createImageBitmap(file);
  const max=1100;const ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('瀏覽器無法處理圖片。');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let quality=.76;let out=canvas.toDataURL('image/jpeg',quality);
  while(out.length>720_000&&quality>.44){quality-=.07;out=canvas.toDataURL('image/jpeg',quality)}
  if(out.length>880_000)throw new Error('其中一張圖片仍然太大，請換較小的圖片。');
  return out;
}

export default function CompetitionPublicImageInput({currentImages}:Props){
  const initial=useMemo(()=>Array.from(new Set((currentImages||[]).filter(Boolean).map(x=>x.trim()).filter(isUsableImageSource))).slice(0,MAX_IMAGES),[currentImages]);
  const [existing,setExisting]=useState<string[]>(initial);
  const [added,setAdded]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);

  const count=existing.length+added.length;

  async function onFiles(files?:FileList|null){
    if(!files?.length)return;
    const room=MAX_IMAGES-count;
    if(room<=0){setError(`每場最多 ${MAX_IMAGES} 張圖片。`);return;}
    setBusy(true);setError('');
    try{
      const chosen=Array.from(files).slice(0,room);
      const results:string[]=[];
      for(const file of chosen)results.push(await compressImage(file));
      setAdded(v=>[...v,...results].slice(0,MAX_IMAGES-existing.length));
      if(files.length>room)setError(`已達上限，只加入前 ${room} 張；每場最多 ${MAX_IMAGES} 張。`);
    }catch(e:any){setError(e?.message||'圖片處理失敗。');}
    finally{setBusy(false)}
  }

  function removeExisting(index:number){setExisting(v=>v.filter((_,i)=>i!==index));}
  function removeAdded(index:number){setAdded(v=>v.filter((_,i)=>i!==index));}

  return <div className="competitionImageUpload" suppressHydrationWarning>
    {mounted?existing.map((src,i)=><input key={`existing-${i}`} type="hidden" name="public_image_existing" value={src}/>):null}
    {mounted?added.map((src,i)=><input key={`added-${i}`} type="hidden" name="public_image_data" value={src}/>):null}
    <label>直接上傳圖片（可多選，最多 {MAX_IMAGES} 張）<input type="file" accept="image/*" multiple disabled={busy||count>=MAX_IMAGES} onChange={e=>{void onFiles(e.target.files);e.currentTarget.value='';}}/></label>
    <small>{busy?'正在壓縮圖片…':`目前 ${count}/${MAX_IMAGES} 張；可一次選多張，系統會自動縮圖壓縮。`}</small>
    {error?<span className="imageError">{error}</span>:null}
    {mounted&&count?<div className="imagePreviewGrid">
      {existing.map((src,i)=><div className="imagePreviewCard" key={`e-${i}-${src.length}`}><span>{i+1}</span><div className="previewMedia"><img src={src} alt={`比賽公開圖片預覽 ${i+1}`} onError={()=>removeExisting(i)}/></div><button type="button" onClick={()=>removeExisting(i)}>移除</button></div>)}
      {added.map((src,i)=><div className="imagePreviewCard" key={`a-${i}-${src.length}`}><span>{existing.length+i+1}</span><div className="previewMedia"><img src={src} alt={`新上傳圖片預覽 ${i+1}`} onError={()=>removeAdded(i)}/></div><button type="button" onClick={()=>removeAdded(i)}>移除</button></div>)}
    </div>:null}
    <style>{`.competitionImageUpload{display:grid;gap:7px;padding:12px;border:1px dashed #d8dce5;border-radius:14px;background:#fafbfc}.competitionImageUpload>label{font-size:12px;font-weight:800;color:#667386}.competitionImageUpload input[type=file]{display:block;width:100%;margin-top:6px}.competitionImageUpload small{color:#8a94a3}.imageError{font-size:12px;color:#b42318}.imagePreviewGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:10px;margin-top:5px}.imagePreviewCard{position:relative;min-width:0;border:1px solid #e0e5eb;border-radius:13px;padding:6px;background:#fff;overflow:hidden}.previewMedia{height:96px;border-radius:9px;overflow:hidden;background:#f3f5f7;display:grid;place-items:center}.previewMedia img{display:block;width:100%;height:100%;object-fit:contain;background:#f3f5f7;color:transparent}.imagePreviewCard>span{position:absolute;z-index:2;left:9px;top:9px;background:#324052;color:#fff;width:23px;height:23px;border-radius:999px;display:grid;place-items:center;font-size:10px;font-weight:900}.imagePreviewCard button{width:100%;margin-top:6px;border:0;border-radius:9px;padding:7px;background:#fff0ef;color:#a23b32;font-size:11px;font-weight:900;cursor:pointer}@media(max-width:560px){.imagePreviewGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
  </div>;
}
