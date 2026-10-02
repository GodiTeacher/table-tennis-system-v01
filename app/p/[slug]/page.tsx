import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type PublicTeam={team_id:string;name:string;short_name:string|null;school_name:string|null;sport_name:string|null;logo_data_url:string|null;brand_color:string|null;tagline:string|null;public_description:string|null;public_modules:Record<string,boolean>|null};
type Competition={id:string;name:string;start_date:string;end_date:string|null;location:string|null;registration_deadline:string|null;status:string};
const MODULES=[
  ['standards','📘','球隊規範','訓練、請假、比賽、器材與家長配合原則'],
  ['rubber_guide','🔴','球皮介紹','認識反膠、顆粒與選擇方向'],
  ['blade_guide','🏓','球板介紹','認識純木、纖維與球板結構'],
  ['career_guide','🌱','桌球職涯','從校隊、競賽到升學與發展方向'],
  ['service_rules','🛠️','代工規則','球皮／球板更換、黏貼與裁切服務'],
] as const;
const STATUS:Record<string,string>={planning:'規劃中',open:'進行中',closed:'已截止',completed:'已完成'};
function dayDiff(date:string){const [y,m,d]=date.split('-').map(Number);const now=new Date();const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());return Math.ceil((Date.UTC(y,m-1,d)-today)/86400000);}

export default async function PublicTeamPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const supabase=await createClient();
  const {data:teamRows}=await supabase.rpc('get_public_team',{target_slug:slug});
  const team=(teamRows?.[0] as PublicTeam|undefined);if(!team)notFound();
  const mods=team.public_modules||{};
  let competitions:Competition[]=[];
  if(mods.competitions||mods.countdown){const {data}=await supabase.rpc('get_public_competitions',{target_slug:slug});competitions=(data||[]) as Competition[];}
  const upcoming=competitions.filter(c=>dayDiff(c.end_date||c.start_date)>=0).slice(0,4);
  const next=upcoming[0];const brand=team.brand_color||'#7c3aed';
  return <main className="publicPortal" style={{'--brand':brand} as React.CSSProperties}>
    <header className="publicHero"><div className="publicBrand">{team.logo_data_url?<img src={team.logo_data_url} alt={`${team.short_name||team.name} Logo`}/>:<div className="logoFallback">🏓</div>}<div><span>{team.school_name||'桌球隊'}</span><h1>{team.short_name||team.name}</h1><p>{team.tagline||team.public_description||'球隊公開資訊入口'}</p></div></div></header>
    <section className="publicBody">
      {team.public_description?<div className="welcomeCard"><b>家長資訊站</b><p>{team.public_description}</p></div>:null}
      {mods.countdown&&next?<section className={`countdownCard ${dayDiff(next.start_date)<=7?'urgent':''}`}><div><span>下一場比賽</span><h2>{next.name}</h2><p>{next.start_date}{next.end_date&&next.end_date!==next.start_date?` ～ ${next.end_date}`:''}{next.location?` · ${next.location}`:''}</p></div><strong>{dayDiff(next.start_date)>0?`${dayDiff(next.start_date)} 天`:dayDiff(next.start_date)===0?'今天':'進行中'}</strong></section>:null}
      {mods.competitions?<section><div className="publicSectionTitle"><h2>🏆 近期比賽</h2><span>{upcoming.length} 場</span></div>{upcoming.length?<div className="competitionPublicList">{upcoming.map(c=><article key={c.id}><div><b>{c.name}</b><small>{c.start_date}{c.end_date&&c.end_date!==c.start_date?` ～ ${c.end_date}`:''}</small>{c.location?<small>📍 {c.location}</small>:null}</div><span>{STATUS[c.status]||c.status}</span></article>)}</div>:<div className="emptyPublic">目前沒有即將到來的公開比賽。</div>}</section>:null}
      <section><div className="publicSectionTitle"><h2>球隊資訊</h2></div><div className="moduleGrid">{MODULES.filter(([key])=>mods[key]!==false).map(([key,icon,title,desc])=><Link href={`/p/${slug}/info/${key}`} className="moduleTile" key={key}><span>{icon}</span><div><b>{title}</b><small>{desc}</small></div><i>›</i></Link>)}</div></section>
      <footer><b>{team.short_name||team.name}</b><span>公開頁僅提供球隊選擇公開的資訊；內部學生與財務資料不會顯示於此。</span></footer>
    </section>
    <style>{`.publicPortal{min-height:100vh;background:linear-gradient(180deg,#f7f5ff,#f6fbfb);color:#172235}.publicHero{background:linear-gradient(135deg,var(--brand),#ec4899 54%,#16b8aa);padding:38px 20px 56px;color:#fff}.publicBrand{max-width:850px;margin:auto;display:flex;align-items:center;gap:18px}.publicBrand img,.logoFallback{width:86px;height:86px;border-radius:25px;background:#fff;object-fit:contain;display:grid;place-items:center;font-size:38px;box-shadow:0 10px 30px #0002}.publicBrand span{font-size:13px;font-weight:800;opacity:.9}.publicBrand h1{font-size:34px;margin:4px 0}.publicBrand p{margin:0;opacity:.92}.publicBody{max-width:850px;margin:-30px auto 0;padding:0 16px 80px;display:grid;gap:20px}.welcomeCard,.countdownCard,.competitionPublicList,.moduleTile,.emptyPublic{background:#fff;border:1px solid #e5e2ef;box-shadow:0 8px 24px #6d5da00e}.welcomeCard{padding:20px;border-radius:22px}.welcomeCard p{margin:7px 0 0;color:#69758a;line-height:1.7}.countdownCard{border-radius:23px;padding:20px;display:flex;justify-content:space-between;gap:18px;align-items:center;border-left:6px solid var(--brand)}.countdownCard.urgent{background:#fff1f2;border-color:#ef4444}.countdownCard span{font-size:12px;color:#728095;font-weight:800}.countdownCard h2{margin:5px 0;font-size:22px}.countdownCard p{margin:0;color:#6c7789}.countdownCard>strong{font-size:30px;color:var(--brand);white-space:nowrap}.urgent>strong{color:#dc2626}.publicSectionTitle{display:flex;align-items:center;justify-content:space-between;margin:4px 2px 10px}.publicSectionTitle h2{font-size:20px;margin:0}.publicSectionTitle span{font-size:12px;color:#7a8494}.competitionPublicList{border-radius:20px;overflow:hidden}.competitionPublicList article{padding:15px 17px;display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #eef0f3}.competitionPublicList article:last-child{border-bottom:0}.competitionPublicList b,.competitionPublicList small{display:block}.competitionPublicList small{color:#7a8494;margin-top:4px}.competitionPublicList article>span{background:#f1ecff;color:var(--brand);font-size:11px;font-weight:900;border-radius:999px;padding:7px 9px;height:max-content}.moduleGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.moduleTile{text-decoration:none;color:inherit;border-radius:20px;padding:16px;display:grid;grid-template-columns:45px 1fr auto;align-items:center;gap:11px}.moduleTile>span{font-size:25px}.moduleTile div{display:grid;gap:4px}.moduleTile small{color:#778295;line-height:1.4}.moduleTile i{font-style:normal;font-size:24px;color:#a0a7b2}.emptyPublic{padding:18px;border-radius:18px;color:#7c8797}footer{display:grid;gap:4px;text-align:center;color:#8b93a0;font-size:12px;padding:22px}footer b{color:#677184}@media(max-width:640px){.publicHero{padding-top:26px}.publicBrand img,.logoFallback{width:70px;height:70px;border-radius:21px}.publicBrand h1{font-size:26px}.moduleGrid{grid-template-columns:1fr}.countdownCard>strong{font-size:24px}.publicBody{margin-top:-25px}}`}</style>
  </main>;
}
