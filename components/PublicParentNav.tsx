'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const ITEMS=[
  {suffix:'',label:'首頁',icon:'⌂'},
  {suffix:'/competitions',label:'比賽',icon:'🏆'},
  {suffix:'/announcements',label:'公告',icon:'●'},
  {suffix:'/more',label:'更多',icon:'•••'},
] as const;

export default function PublicParentNav(){
  const pathname=usePathname();
  if(!pathname?.startsWith('/p/'))return null;
  const parts=pathname.split('/').filter(Boolean); const slug=parts[1]; if(!slug)return null;
  const base=`/p/${slug}`;
  return <nav className="parentBottomNav" aria-label="家長公開頁導覽">
    {ITEMS.map(item=>{const href=`${base}${item.suffix}`;const active=item.suffix===''?pathname===base:pathname===href||pathname.startsWith(`${href}/`);return <Link href={href} key={item.label} className={active?'active':''}><span>{item.icon}</span><b>{item.label}</b></Link>})}
    <style>{`.parentBottomNav{position:fixed;z-index:80;left:50%;bottom:14px;transform:translateX(-50%);width:min(560px,calc(100% - 24px));display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:7px;border-radius:24px;background:rgba(255,255,255,.96);border:1px solid #e6e1ef;box-shadow:0 14px 40px rgba(63,49,91,.16);backdrop-filter:blur(14px)}.parentBottomNav a{text-decoration:none;color:#7b8493;display:grid;place-items:center;gap:2px;padding:6px 4px;border-radius:17px;font-size:11px}.parentBottomNav a span{font-size:17px;line-height:1}.parentBottomNav a b{font-size:11px}.parentBottomNav a.active{color:#6d28d9;background:linear-gradient(135deg,#f2eaff,#fff0f6)}@media(min-width:800px){.parentBottomNav{bottom:18px}.parentBottomNav a{padding:8px 4px}}`}</style>
  </nav>;
}
