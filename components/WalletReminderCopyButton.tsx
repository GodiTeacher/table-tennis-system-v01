'use client';

import {useState} from 'react';

export default function WalletReminderCopyButton({text}:{text:string}){
  const [copied,setCopied]=useState(false);
  async function copy(){
    try{
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1800);
    }catch{
      setCopied(false);
    }
  }
  return <button type="button" className="secondaryButton" onClick={copy}>{copied?'已複製 ✓':'複製提醒文字'}</button>;
}
