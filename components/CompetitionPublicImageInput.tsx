'use client';

import {useEffect,useMemo,useState} from 'react';

type Props={currentImages?:string[]|null};
type ImageItem={id:string;src:string};
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
  const initial=useMemo<ImageItem[]>(()=>Array.from(new Set((currentImages||[]).filter(Boolean).map(x=>x.trim()).filter(isUsableImageSource))).slice(0,MAX_IMAGES).map((src,i)=>({id:`saved-${i}-${src.length}`,src})),[currentImages]);
  const [items,setItems]=useState<ImageItem[]>(initial);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);

  async function onFiles(files?:FileList|null){
    if(!files?.length)return;
    const room=MAX_IMAGES-items.length;
    if(room<=0){setError(`每場最多 ${MAX_IMAGES} 張圖片。`);return;}
    setBusy(true);setError('');
    try{
      const chosen=Array.from(files).slice(0,room);
      const results:ImageItem[]=[];
      for(let i=0;i<chosen.length;i++){
        const src=await compressImage(chosen[i]);
        results.push({id:`new-${Date.now()}-${i}-${src.length}`,src});
      }
      setItems(v=>[...v,...results].slice(0,MAX_IMAGES));
      if(files.length>room)setError(`已達上限，只加入前 ${room} 張；每場最多 ${MAX_IMAGES} 張。`);
    }catch(e:any){setError(e?.message||'圖片處理失敗。');}
    finally{setBusy(false)}
  }

  function remove(index:number){setItems(v=>v.filter((_,i)=>i!==index));}
  function move(index:number,delta:number){
    setItems(v=>{
      const target=index+delta;if(target<0||target>=v.length)return v;
      const next=[...v];[next[index],next[target]]=[next[target],next[index]];return next;
    });
  }

  return <div className="competitionImageUpload" suppressHydrationWarning>
    {mounted?items.map(item=><input key={`ordered-${item.id}`} type="hidden" name="public_image_ordered" value={item.src}/>):null}
    <label>直接上傳圖片（可多選，最多 {MAX_IMAGES} 張）<input type="file" accept="image/*" multiple disabled={busy||items.length>=MAX_IMAGES} onChange={e=>{void onFiles(e.target.files);e.currentTarget.value='';}}/></label>
    <small>{busy?'正在壓縮圖片…':`目前 ${items.length}/${MAX_IMAGES} 張；可用「往前／往後」調整家長版顯示順序。`}</small>
    {error?<span className="imageError">{error}</span>:null}
    {mounted&&items.length?<div className="imagePreviewGrid">
      {items.map((item,i)=><div className="imagePreviewCard" key={item.id}>
        <span>{i+1}</span>
        <div className="previewMedia"><img src={item.src} alt={`比賽公開圖片預覽 ${i+1}`} onError={()=>remove(i)}/></div>
        <div className="orderButtons"><button type="button" disabled={i===0} onClick={()=>move(i,-1)}>← 往前</button><button type="button" disabled={i===items.length-1} onClick={()=>move(i,1)}>往後 →</button></div>
        <button className="removeButton" type="button" onClick={()=>remove(i)}>移除</button>
      </div>)}
    </div>:null}
    <style>{`.competitionImageUpload{display:grid;gap:7px;padding:12px;border:1px dashed #d8dce5;border-radius:14px;background:#fafbfc}.competitionImageUpload>label{font-size:12px;font-weight:800;color:#667386}.competitionImageUpload input[type=file]{display:block;width:100%;margin-top:6px}.competitionImageUpload small{color:#8a94a3}.imageError{font-size:12px;color:#b42318}.imagePreviewGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:5px}.imagePreviewCard{position:relative;min-width:0;border:1px solid #e0e5eb;border-radius:13px;padding:6px;background:#fff;overflow:hidden}.previewMedia{height:100px;border-radius:9px;overflow:hidden;background:#f3f5f7;display:grid;place-items:center}.previewMedia img{display:block;width:100%;height:100%;object-fit:contain;background:#f3f5f7;color:transparent}.imagePreviewCard>span{position:absolute;z-index:2;left:9px;top:9px;background:#324052;color:#fff;width:23px;height:23px;border-radius:999px;display:grid;place-items:center;font-size:10px;font-weight:900}.orderButtons{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.orderButtons button,.removeButton{border:0;border-radius:8px;padding:7px 5px;font-size:10px;font-weight:900;cursor:pointer}.orderButtons button{background:#eef2ff;color:#5146a5}.orderButtons button:disabled{opacity:.35;cursor:not-allowed}.removeButton{width:100%;margin-top:5px;background:#fff0ef;color:#a23b32}@media(max-width:560px){.imagePreviewGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
  </div>;
}
