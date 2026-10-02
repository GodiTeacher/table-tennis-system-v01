'use client';

import {useState} from 'react';

type Props={currentImage?:string|null};

export default function CompetitionPublicImageInput({currentImage}:Props){
  const [preview,setPreview]=useState(currentImage||'');
  const [data,setData]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function onFile(file?:File){
    if(!file)return;
    setBusy(true);setError('');
    try{
      if(!file.type.startsWith('image/'))throw new Error('請選擇圖片檔。');
      const bitmap=await createImageBitmap(file);
      const max=1200;const ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('瀏覽器無法處理圖片。');
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      let quality=.84;let out=canvas.toDataURL('image/jpeg',quality);
      while(out.length>1_350_000&&quality>.5){quality-=.08;out=canvas.toDataURL('image/jpeg',quality)}
      if(out.length>1_600_000)throw new Error('圖片仍然太大，請換一張較小的圖片。');
      setData(out);setPreview(out);
    }catch(e:any){setError(e?.message||'圖片處理失敗。');setData('')}
    finally{setBusy(false)}
  }

  return <div className="competitionImageUpload">
    <input type="hidden" name="public_image_data" value={data}/>
    <label>直接上傳圖片<input type="file" accept="image/*" onChange={e=>onFile(e.target.files?.[0])}/></label>
    <small>{busy?'正在壓縮圖片…':'可直接選手機照片；系統會先縮圖壓縮後再儲存。'}</small>
    {error?<span className="imageError">{error}</span>:null}
    {preview?<div className="imagePreview"><img src={preview} alt="比賽公開圖片預覽"/><label><input type="checkbox" name="clear_public_image" onChange={e=>{if(e.target.checked){setPreview('');setData('')}}}/> 移除目前圖片</label></div>:null}
    <style>{`.competitionImageUpload{display:grid;gap:7px;padding:12px;border:1px dashed #d8dce5;border-radius:14px;background:#fafbfc}.competitionImageUpload>label{font-size:12px;font-weight:800;color:#667386}.competitionImageUpload input[type=file]{display:block;width:100%;margin-top:6px}.competitionImageUpload small{color:#8a94a3}.imageError{font-size:12px;color:#b42318}.imagePreview{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.imagePreview img{width:140px;height:96px;object-fit:cover;border-radius:12px;border:1px solid #e1e5eb}.imagePreview label{font-size:12px;color:#7a3541;font-weight:800}`}</style>
  </div>;
}
