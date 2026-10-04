'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const STORAGE_KEY='tt-scroll-restore';
const MAX_AGE=20000;

type SavedScroll={path:string;y:number;at:number};

export default function ScrollPositionKeeper(){
  const pathname=usePathname();
  const searchParams=useSearchParams();
  const search=searchParams.toString();

  useEffect(()=>{
    const onSubmit=(event:SubmitEvent)=>{
      const form=event.target instanceof HTMLFormElement?event.target:null;
      if(!form)return;
      const method=(form.getAttribute('method')||form.method||'get').toLowerCase();
      if(method!=='post')return;
      const payload:SavedScroll={path:window.location.pathname,y:window.scrollY,at:Date.now()};
      try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(payload));}catch{}
    };
    document.addEventListener('submit',onSubmit,true);
    return()=>document.removeEventListener('submit',onSubmit,true);
  },[]);

  useLayoutEffect(()=>{
    let saved:SavedScroll|null=null;
    try{
      const raw=sessionStorage.getItem(STORAGE_KEY);
      if(raw)saved=JSON.parse(raw) as SavedScroll;
    }catch{}
    if(!saved)return;
    if(saved.path!==window.location.pathname||Date.now()-saved.at>MAX_AGE){
      try{sessionStorage.removeItem(STORAGE_KEY);}catch{}
      return;
    }

    const y=Math.max(0,saved.y);
    const restore=()=>window.scrollTo({top:y,left:0,behavior:'auto'});
    restore();
    const a=requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});
    const timer=window.setTimeout(()=>{
      restore();
      try{sessionStorage.removeItem(STORAGE_KEY);}catch{}
    },250);
    return()=>{cancelAnimationFrame(a);window.clearTimeout(timer)};
  },[pathname,search]);

  return null;
}
