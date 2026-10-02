'use client';

import {useState} from 'react';

type Props={currentImages?:string[]|null};
type Preview={id:string;src:string;isNew:boolean};

const MAX_IMAGES=6;

export default function CompetitionPublicImageInput({currentImages}:Props){
  const initial=(currentImages||[]).filter(Boolean).slice(0,MAX_IMAGES);
  const [items,setItems]=useState<Preview[]>(initial.map((src,i)=>({id:`existing-${i}`,src,isNew:false})));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function compress(file:File){
    if(!file.type.startsWith('image/'))throw new Error(`${file.name} 不是圖片檔。`);
    const bitmap=await createImageBitmap(file);
    const max=1000;const ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('瀏覽器無法處理圖片。');
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    let quality=.8;let out=canvas.toDataURL('image/jpeg',quality);
    while(out.length>720_000&&quality>.45){quality-=.08;out=canvas.toDataURL('image/jpeg',quality)}
    if(out.length>850_000)throw new Error(`${file.name} 壓縮後仍然太大，請換較小的圖片。`);
    return out;
  }

  async function onFiles(files:FileList|null){
    if(!files?.length)return;
    const remaining=MAX_IMAGES-items.length;
    if(remaining<=0){setError(`每場比賽最多可放 ${MAX_IMAGES} 張圖片。`);return;}
    setBusy(true);setError('');
    try{
      const chosen=Array.from(files).slice(0,remaining);
      const compressed:Preview[]=[];
      for(const file of chosen){
        const src=await compress(file);
        compressed.push({id:`new-${Date.now()}-${compressed.length}`,src,isNew:true});
      }
      setItems(prev=>[...prev,...compressed]);
      if(files.length>remaining)setError(`最多 ${MAX_IMAGES} 張，本次只加入前 ${remaining} 張。`);
    }catch(e:any){setError(e?.message||'圖片處理失敗。')}
    finally{setBusy(false)}
  }

  function remove(id:string){setItems(prev=>prev.filter(x=>x.id!==id));}

  const existing=items.filter(x=>!x.isNew);
  const added=items.filter(x=>x.isNew);

  return <div className="competitionImageUpload">
    {existing.map(x=><input key={`keep-${x.id}`} type="hidden" name="public_image_existing" value={x.src}/>)}
    {added.map(x=><input key={`new-${x.id}`} type="hidden" name="public_image_data" value={x.src}/>)}
    <label>直接上傳圖片（可多選，最多 {MAX_IMAGES} 張）
      <input type="file" accept="image/*" multiple disabled={busy||items.length>=MAX_IMAGES} onChange={e=>{onFiles(e.target.files);e.currentTarget.value='';}}/>
    </label>
    <small>{busy?'正在壓縮圖片…':`目前 ${items.length}/${MAX_IMAGES} 張；可一次選多張，系統會自動縮圖壓縮。`}</small>
    {error?<span className="imageError">{error}</span>:null}
    {items.length?<div className="imagePreviewGrid">{items.map((item,index)=><div className="imagePreviewCard" key={item.id}>
      <img src={item.src} alt={`比賽公開圖片預覽 ${index+1}`}/><span>{index+1}</span><button type="button" onClick={()=>remove(item.id)}>移除</button>
    </div>)}</div>:<div className="emptyImages">尚未加入圖片</div>}
    <style>{`.competitionImageUpload{display:grid;gap:8px;padding:12px;border:1px dashed #d8dce5;border-radius:14px;background:#fafbfc}.competitionImageUpload>label{font-size:12px;font-weight:800;color:#667386}.competitionImageUpload input[type=file]{display:block;width:100%;margin-top:6px}.competitionImageUpload small{color:#8a94a3}.imageError{font-size:12px;color:#b42318}.imagePreviewGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:9px}.imagePreviewCard{position:relative;border:1px solid #e1e5eb;border-radius:12px;background:#fff;padding:6px}.imagePreviewCard img{display:block;width:100%;height:92px;object-fit:contain;border-radius:8px;background:#f6f7f9}.imagePreviewCard span{position:absolute;left:10px;top:10px;width:22px;height:22px;border-radius:999px;display:grid;place-items:center;background:#182234cc;color:white;font-size:11px;font-weight:900}.imagePreviewCard button{width:100%;margin-top:6px;border:0;border-radius:8px;padding:6px 8px;background:#fff0ef;color:#a33;font-size:11px;font-weight:800;cursor:pointer}.emptyImages{padding:10px;border-radius:10px;background:#f3f5f8;color:#8a94a3;font-size:12px;text-align:center}`}</style>
  </div>;
}
