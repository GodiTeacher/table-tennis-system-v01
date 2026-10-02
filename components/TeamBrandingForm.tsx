'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props={team:{name:string;short_name:string|null;logo_data_url:string|null;brand_color:string|null;tagline:string|null};canManage:boolean};
const MAX_BYTES=450*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp']);

export default function TeamBrandingForm({team,canManage}:Props){
  const router=useRouter();
  const [name,setName]=useState(team.name);
  const [shortName,setShortName]=useState(team.short_name??'');
  const [tagline,setTagline]=useState(team.tagline??'');
  const [color,setColor]=useState(team.brand_color||'#7c3aed');
  const [logo,setLogo]=useState(team.logo_data_url??'');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<{type:'ok'|'error';text:string}|null>(null);

  async function fileToDataUrl(file:File){return await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
  async function onFile(file?:File){if(!file)return;if(!TYPES.has(file.type)){setStatus({type:'error',text:'Logo 僅支援 PNG、JPG、WebP。'});return;}if(file.size>MAX_BYTES){setStatus({type:'error',text:'Logo 請控制在 450KB 以內。'});return;}try{setLogo(await fileToDataUrl(file));setStatus(null);}catch{setStatus({type:'error',text:'Logo 讀取失敗，請重新選擇。'});}}
  async function save(){
    if(!name.trim()){setStatus({type:'error',text:'團隊名稱不可空白。'});return;}
    if(!/^#[0-9A-Fa-f]{6}$/.test(color)){setStatus({type:'error',text:'品牌主題色格式不正確。'});return;}
    setBusy(true);setStatus(null);
    try{
      const supabase=createClient();
      const {error}=await supabase.rpc('update_current_team_branding',{target_name:name.trim(),target_short_name:shortName.trim(),target_logo_data_url:logo,target_brand_color:color,target_tagline:tagline.trim()});
      if(error)throw error;
      setStatus({type:'ok',text:'團隊品牌設定已更新。'});
      router.refresh();
    }catch(e:any){setStatus({type:'error',text:e?.message||'儲存失敗，請稍後再試。'});}finally{setBusy(false);}
  }

  return <div className="brandForm">
    {status?<div className={`notice ${status.type==='ok'?'successNotice':'errorNotice'}`}>{status.type==='ok'?'✓ ':''}{status.text}</div>:null}
    <div className="brandLogoPanel">
      <div className="brandLogoPreview" style={{borderColor:color}}>{logo?<img src={logo} alt={`${name} Logo`}/>:<span>🏓</span>}</div>
      <div><b>{shortName||name}</b><small>{tagline||'尚未設定團隊標語'}</small></div>
    </div>
    <div className="brandFields">
      <label>團隊名稱<input value={name} onChange={e=>setName(e.target.value)} disabled={!canManage}/></label>
      <label>團隊簡稱<input value={shortName} onChange={e=>setShortName(e.target.value)} placeholder="例如：管嶼桌球" disabled={!canManage}/></label>
      <label>品牌主題色<div className="colorField"><input type="color" value={color} onChange={e=>setColor(e.target.value)} disabled={!canManage}/><span>{color}</span></div></label>
      <label>副標語<input value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="例如：同心打球，一起成長" disabled={!canManage}/></label>
      <label className="wide">團隊 Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>onFile(e.target.files?.[0])} disabled={!canManage}/><small>PNG / JPG / WebP，450KB 內。檔案會先在瀏覽器轉換，再直接存入團隊品牌資料，避免頁面送出大檔造成錯誤。</small></label>
    </div>
    {canManage?<div className="brandActions"><button type="button" className="secondaryButton" onClick={()=>setLogo('')} disabled={busy||!logo}>移除 Logo</button><button type="button" className="primaryButton" onClick={save} disabled={busy}>{busy?'儲存中…':'儲存團隊品牌'}</button></div>:null}
  </div>;
}
