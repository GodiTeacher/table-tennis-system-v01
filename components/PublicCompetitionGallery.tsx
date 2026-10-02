'use client';

import {useEffect,useState} from 'react';

type Props={images:string[];name:string};

export default function PublicCompetitionGallery({images,name}:Props){
  const clean=images.filter(Boolean);
  const [active,setActive]=useState<number|null>(null);

  useEffect(()=>{
    if(active===null)return;
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape')setActive(null);
      if(e.key==='ArrowRight')setActive(v=>v===null?null:(v+1)%clean.length);
      if(e.key==='ArrowLeft')setActive(v=>v===null?null:(v-1+clean.length)%clean.length);
    };
    document.addEventListener('keydown',onKey);
    document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow='';};
  },[active,clean.length]);

  if(!clean.length)return null;

  return <>
    <div className={`publicImageGallery count-${Math.min(clean.length,4)}`}>
      {clean.map((src,index)=><button type="button" className="publicImageThumb" key={`${src.slice(0,40)}-${index}`} onClick={()=>setActive(index)} aria-label={`放大查看 ${name} 圖片 ${index+1}`}>
        <img src={src} alt={`${name} 圖片 ${index+1}`}/>
        {index===0&&clean.length>1?<span>{clean.length} 張</span>:null}
      </button>)}
    </div>
    {active!==null?<div className="imageLightbox" role="dialog" aria-modal="true" aria-label={`${name} 圖片放大檢視`} onClick={()=>setActive(null)}>
      <button type="button" className="lightboxClose" onClick={()=>setActive(null)} aria-label="關閉">×</button>
      {clean.length>1?<button type="button" className="lightboxNav prev" onClick={e=>{e.stopPropagation();setActive((active-1+clean.length)%clean.length)}} aria-label="上一張">‹</button>:null}
      <div className="lightboxStage" onClick={e=>e.stopPropagation()}>
        <img src={clean[active]} alt={`${name} 圖片 ${active+1}`}/>
        <div className="lightboxCount">{active+1} / {clean.length}</div>
      </div>
      {clean.length>1?<button type="button" className="lightboxNav next" onClick={e=>{e.stopPropagation();setActive((active+1)%clean.length)}} aria-label="下一張">›</button>:null}
    </div>:null}
    <style jsx>{`
      .publicImageGallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin-bottom:14px}
      .publicImageThumb{position:relative;height:150px;padding:0;border:1px solid #e5e8ee;border-radius:14px;overflow:hidden;background:#f5f6f8;cursor:zoom-in}
      .publicImageThumb img{display:block;width:100%;height:100%;object-fit:contain;background:#f7f8fa;transition:transform .18s ease}
      .publicImageThumb:hover img{transform:scale(1.025)}
      .publicImageThumb span{position:absolute;right:8px;bottom:8px;border-radius:999px;padding:5px 8px;background:#182234cc;color:#fff;font-size:10px;font-weight:900}
      .imageLightbox{position:fixed;inset:0;z-index:9999;background:rgba(13,18,28,.92);display:grid;place-items:center;padding:46px 82px 58px;backdrop-filter:blur(6px)}
      .lightboxStage{position:relative;width:min(1000px,84vw);height:min(74vh,760px);display:grid;place-items:center}
      .lightboxStage img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
      .lightboxCount{position:absolute;left:50%;bottom:-28px;transform:translateX(-50%);color:#fff;font-size:12px;font-weight:800;background:#ffffff1a;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px}
      .lightboxClose,.lightboxNav{position:fixed;border:0;color:#fff;background:#ffffff1a;backdrop-filter:blur(6px);cursor:pointer}
      .lightboxClose{right:18px;top:18px;width:44px;height:44px;border-radius:999px;font-size:30px;line-height:1}
      .lightboxNav{top:50%;transform:translateY(-50%);width:48px;height:70px;border-radius:16px;font-size:44px;line-height:1}.lightboxNav.prev{left:14px}.lightboxNav.next{right:14px}
      @media(max-width:900px){.imageLightbox{padding:50px 58px 64px}.lightboxStage{width:min(860px,82vw);height:min(72vh,700px)}}
      @media(max-width:640px){.publicImageGallery{grid-template-columns:repeat(2,minmax(0,1fr))}.publicImageThumb{height:118px}.imageLightbox{padding:58px 12px 70px}.lightboxStage{width:94vw;height:68vh}.lightboxNav{top:auto;bottom:10px;transform:none;width:60px;height:42px;font-size:30px}.lightboxNav.prev{left:calc(50% - 68px)}.lightboxNav.next{right:calc(50% - 68px)}}
    `}</style>
  </>;
}
