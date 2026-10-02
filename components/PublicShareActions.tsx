'use client';

import {useState} from 'react';

type Props={text:string;url?:string;label?:string};
export default function PublicShareActions({text,url,label='分享'}:Props){
  const [done,setDone]=useState('');
  const payload=url?`${text}\n${url}`:text;
  async function copy(){try{await navigator.clipboard.writeText(payload);setDone('已複製 LINE 文字');setTimeout(()=>setDone(''),2200)}catch{setDone('複製失敗')}}
  async function share(){try{if(navigator.share){await navigator.share({title:label,text,url});setDone('已開啟分享')}else{await copy()}}catch(e:any){if(e?.name!=='AbortError')setDone('分享失敗')}}
  return <div className="publicShareActions"><button type="button" className="secondaryButton" onClick={copy}>複製 LINE 文字</button><button type="button" className="secondaryButton" onClick={share}>分享</button>{done?<span>{done}</span>:null}<style>{`.publicShareActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px}.publicShareActions span{font-size:11px;color:#188451;font-weight:800}@media(max-width:600px){.publicShareActions button{flex:1}}`}</style></div>;
}
