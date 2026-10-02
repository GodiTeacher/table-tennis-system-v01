'use client';

import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

type Modules={competitions:boolean;countdown:boolean;announcements:boolean;standards:boolean;rubber_guide:boolean;blade_guide:boolean;career_guide:boolean;service_rules:boolean};
type Props={team:{public_enabled:boolean;public_slug:string|null;public_description:string|null;public_modules:Partial<Modules>|null};canManage:boolean};

const ITEMS:[keyof Modules,string,string][]=[
  ['competitions','比賽資訊','公開比賽名稱、日期、地點與截止日；參賽名單另行逐場控制'],
  ['countdown','比賽倒數','在家長首頁顯示最近兩場賽事倒數'],
  ['announcements','家長公告','顯示管理員發布、置頂與排程的公開公告'],
  ['standards','球隊規範','顯示家長版球隊規範摘要'],
  ['rubber_guide','球皮介紹','顯示球皮選擇與基礎知識入口'],
  ['blade_guide','球板介紹','顯示球板選擇與基礎知識入口'],
  ['career_guide','桌球職涯','顯示桌球升學與發展方向入口'],
  ['service_rules','代工規則','顯示球皮／球板更換與代工說明'],
];

export default function PublicPortalSettingsForm({team,canManage}:Props){
  const router=useRouter();
  const defaults=useMemo<Modules>(()=>({competitions:true,countdown:true,announcements:true,standards:true,rubber_guide:true,blade_guide:true,career_guide:true,service_rules:true,...(team.public_modules||{})}),[team.public_modules]);
  const [enabled,setEnabled]=useState(Boolean(team.public_enabled));
  const [slug,setSlug]=useState(team.public_slug||'');
  const [description,setDescription]=useState(team.public_description||'');
  const [modules,setModules]=useState<Modules>(defaults);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<{type:'ok'|'error';text:string}|null>(null);
  const publicPath=slug?`/p/${slug}`:'';

  async function save(){setBusy(true);setStatus(null);try{const supabase=createClient();const {error}=await supabase.rpc('update_current_team_public_settings',{target_enabled:enabled,target_slug:slug,target_description:description,target_modules:modules});if(error)throw error;setStatus({type:'ok',text:'家長／訪客公開設定已更新。'});router.refresh();}catch(e:any){setStatus({type:'error',text:e?.message||'儲存失敗，請稍後再試。'});}finally{setBusy(false)}}
  async function copyLink(){if(!publicPath)return;const url=`${location.origin}${publicPath}`;await navigator.clipboard.writeText(url);setStatus({type:'ok',text:'家長公開網址已複製。'});}

  return <div className="publicSettings">
    {status?<div className={`notice ${status.type==='ok'?'successNotice':'errorNotice'}`}>{status.type==='ok'?'✓ ':''}{status.text}</div>:null}
    <div className="publicToggleRow"><div><b>啟用家長公開頁</b><span>開啟後，拿到網址的人不需登入即可查看你選擇公開的內容。</span></div><label className="switchLabel"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} disabled={!canManage}/><span>{enabled?'公開中':'未公開'}</span></label></div>
    <div className="publicFieldGrid"><label>公開網址代碼<input value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="例如 kuanyu-tt" disabled={!canManage}/><small>僅限英文小寫、數字、-，3～40 字元。</small></label><label>家長首頁介紹<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="例如：比賽、規範與桌球資訊都可從這裡查看。" disabled={!canManage}/></label></div>
    <div className="publicModuleGrid">{ITEMS.map(([key,title,desc])=><label className={`publicModuleCard ${modules[key]?'on':''}`} key={key}><input type="checkbox" checked={modules[key]} onChange={e=>setModules(m=>({...m,[key]:e.target.checked}))} disabled={!canManage}/><div><b>{title}</b><span>{desc}</span></div></label>)}</div>
    <div className="publicActions">{publicPath&&enabled?<><a className="secondaryButton" href={publicPath} target="_blank">預覽家長頁</a><button type="button" className="secondaryButton" onClick={copyLink}>複製家長網址</button></>:null}{canManage?<button type="button" className="primaryButton" onClick={save} disabled={busy}>{busy?'儲存中…':'儲存公開設定'}</button>:null}</div>
    <style>{`.publicSettings{display:grid;gap:16px}.publicToggleRow{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:16px;border-radius:18px;background:var(--theme-soft,#f5f3ff)}.publicToggleRow div{display:grid;gap:4px}.publicToggleRow span,.publicFieldGrid small,.publicModuleCard span{font-size:12px;color:#748094}.switchLabel{display:flex;align-items:center;gap:8px;font-weight:800;white-space:nowrap}.switchLabel input{width:20px;height:20px}.publicFieldGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.publicFieldGrid label{font-size:12px;font-weight:800;color:#647184}.publicFieldGrid input,.publicFieldGrid textarea{width:100%;margin-top:6px;border:1px solid #dce2ea;border-radius:12px;padding:12px 13px;font:inherit;background:#fff}.publicModuleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.publicModuleCard{display:flex;gap:12px;align-items:flex-start;border:1px solid #e0e6ed;border-radius:16px;padding:14px;background:#fff;cursor:pointer}.publicModuleCard.on{border-color:var(--theme-accent,#7c3aed);background:var(--theme-soft,#faf7ff)}.publicModuleCard input{margin-top:3px;width:18px;height:18px}.publicModuleCard div{display:grid;gap:4px}.publicActions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}@media(max-width:680px){.publicFieldGrid,.publicModuleGrid{grid-template-columns:1fr}.publicToggleRow{align-items:flex-start}.publicActions>*{flex:1 1 100%;text-align:center}}`}</style>
  </div>;
}
