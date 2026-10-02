import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type PublicTeam={name:string;short_name:string|null;brand_color:string|null;public_modules:Record<string,boolean>|null};
type Announcement={id:string;title:string;body:string;pinned:boolean;published_from:string|null;published_until:string|null;created_at:string};
function dateLabel(v:string|null){if(!v)return '';const [y,m,d]=v.split('-');return `${y}/${m}/${d}`}

export default async function PublicAnnouncementsPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const supabase=await createClient();
  const {data:teamRows}=await supabase.rpc('get_public_team',{target_slug:slug});const team=teamRows?.[0] as PublicTeam|undefined;
  if(!team||team.public_modules?.announcements===false)notFound();
  const {data}=await supabase.rpc('get_public_announcements',{target_slug:slug});const rows=(data||[]) as Announcement[];
  return <main className="publicSubPage" style={{'--brand':team.brand_color||'#7c3aed'} as React.CSSProperties}>
    <header><span>家長資訊站</span><h1>最新公告</h1><p>{team.short_name||team.name}的重要提醒與家長通知。</p></header>
    <section className="publicListShell">
      {!rows.length?<div className="emptyState">目前沒有公開中的公告。</div>:rows.map(a=><article className={`announcementCard ${a.pinned?'pinned':''}`} key={a.id}>{a.pinned?<strong className="pin">置頂</strong>:null}<h2>{a.title}</h2><p>{a.body}</p><footer>{a.published_from||a.published_until?<span>{a.published_from?`自 ${dateLabel(a.published_from)}`:''}{a.published_from&&a.published_until?' · ':''}{a.published_until?`至 ${dateLabel(a.published_until)}`:''}</span>:<span>球隊公告</span>}</footer></article>)}
    </section>
    <style>{`.publicSubPage{min-height:100vh;padding-bottom:100px;background:linear-gradient(180deg,#f7f4ff,#f8fcfc);color:#182234}.publicSubPage>header{padding:34px 20px 44px;background:linear-gradient(135deg,var(--brand),#ec4899 55%,#16b8aa);color:#fff}.publicSubPage>header>*{display:block;max-width:850px;margin-left:auto;margin-right:auto}.publicSubPage>header span{font-size:12px;font-weight:900;opacity:.9}.publicSubPage>header h1{font-size:32px;margin-top:5px;margin-bottom:4px}.publicSubPage>header p{margin-top:0;opacity:.9}.publicListShell{max-width:850px;margin:-18px auto 0;padding:0 16px;display:grid;gap:12px}.announcementCard,.emptyState{background:#fff;border:1px solid #e4e1ec;border-radius:22px;padding:19px;box-shadow:0 10px 28px #6b5d8b12}.announcementCard.pinned{border-color:#d8c4ff;background:linear-gradient(145deg,#fff,#fbf7ff)}.announcementCard h2{margin:5px 0 9px;font-size:19px}.announcementCard p{white-space:pre-wrap;margin:0;color:#5f6d80;line-height:1.75}.announcementCard footer{margin-top:14px;padding-top:11px;border-top:1px solid #eef0f4;font-size:11px;color:#8992a0}.pin{display:inline-block;border-radius:999px;padding:5px 8px;font-size:10px;color:#6d28d9;background:#f0e7ff}.emptyState{color:#7b8595}@media(max-width:640px){.publicSubPage>header h1{font-size:27px}}`}</style>
  </main>;
}
