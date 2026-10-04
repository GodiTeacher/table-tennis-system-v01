import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setTeamPlan } from './actions';

type TeamRow={
  team_id:string;team_name:string;school_name:string|null;owner_name:string;owner_email:string;
  active_students:number;plan_code:'free'|'pro';plan_name:string;subscription_status:string;
  current_period_end:string|null;created_at:string;
};

export default async function PlatformAdminPage({searchParams}:{searchParams:Promise<{q?:string;error?:string;success?:string}>}){
  const params=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub) redirect('/login');
  const {data:isAdmin,error:adminError}=await supabase.rpc('is_platform_admin');
  if(adminError||!isAdmin) redirect('/more');

  const {data,error}=await supabase.rpc('platform_list_teams');
  const rows=((data??[]) as TeamRow[]);
  const q=(params.q??'').trim().toLocaleLowerCase('zh-Hant');
  const filtered=q?rows.filter(r=>`${r.team_name} ${r.school_name??''} ${r.owner_name} ${r.owner_email}`.toLocaleLowerCase('zh-Hant').includes(q)):rows;
  const proCount=rows.filter(r=>r.plan_code==='pro').length;

  return <main className="shell platformAdminShell">
    <section className="hero compactHero"><div className="eyebrow">PLATFORM ADMIN</div><h1>方案管理</h1><p>平台管理員可以分派 Free / Pro，供內部團隊、測試帳號、合作教練或人工授權使用。</p><div className="topNav"><Link href="/more">← 返回更多</Link><Link href="/plans">查看方案</Link></div></section>
    {params.success?<div className="notice">{params.success}</div>:null}
    {(params.error||error)?<div className="notice errorNotice">{params.error??error?.message}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>OVERVIEW</span><h2>平台方案概況</h2></div><strong>{rows.length} 支球隊</strong></div>
      <div className="adminStats"><div><b>{rows.length}</b><span>全部球隊</span></div><div><b>{proCount}</b><span>Pro</span></div><div><b>{rows.length-proCount}</b><span>Free</span></div></div>
      <form method="get" className="adminSearch"><input name="q" defaultValue={params.q??''} placeholder="搜尋球隊、學校、管理者或 Email"/><button className="secondaryButton">搜尋</button>{q?<Link className="secondaryButton" href="/platform-admin">清除</Link>:null}</form>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>TEAMS</span><h2>球隊方案</h2></div><strong>{filtered.length} 筆</strong></div>
      {!filtered.length?<p className="muted">沒有符合條件的球隊。</p>:<div className="teamPlanList">{filtered.map(team=><article className="teamPlanCard" key={team.team_id}>
        <div className="teamPlanHead"><div><b>{team.school_name?`${team.school_name}｜`:''}{team.team_name}</b><small>{team.owner_name||'未設定管理者'}{team.owner_email?` · ${team.owner_email}`:''}</small></div><span className={`planBadge ${team.plan_code}`}>{team.plan_code==='pro'?'PRO 菁英版':'FREE 免費版'}</span></div>
        <div className="teamMeta"><span>學生 {team.active_students} 人</span><span>狀態 {team.subscription_status}</span><span>{team.current_period_end?`到期 ${new Date(team.current_period_end).toLocaleDateString('zh-TW')}`:'無到期日'}</span></div>
        <form action={setTeamPlan} className="planForm"><input type="hidden" name="team_id" value={team.team_id}/><label>方案<select name="plan_code" defaultValue={team.plan_code}><option value="free">Free 免費版</option><option value="pro">Pro 菁英版</option></select></label><label>Pro 到期日（可留白）<input type="date" name="period_end" defaultValue={team.current_period_end?team.current_period_end.slice(0,10):''}/></label><label className="reasonField">授權備註<input name="reason" placeholder="例如：內部團隊／測試／合作教練／人工贈送" maxLength={100}/></label><button className="primaryButton">儲存方案</button></form>
      </article>)}</div>}
    </section>
    <style>{`
      .platformAdminShell{max-width:920px}.adminStats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.adminStats div{padding:15px;border:1px solid #e5e9ef;border-radius:15px;background:#fafbfc;display:flex;flex-direction:column;gap:3px}.adminStats b{font-size:24px}.adminStats span{font-size:11px;color:#7d8796}.adminSearch{display:flex;gap:8px;margin-top:14px}.adminSearch input{flex:1;min-width:0;border:1px solid #dce2ea;border-radius:12px;padding:11px 12px;font:inherit}.teamPlanList{display:grid;gap:12px}.teamPlanCard{border:1px solid #e2e7ed;border-radius:18px;padding:15px;background:#fff}.teamPlanHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.teamPlanHead div{display:flex;flex-direction:column;gap:3px;min-width:0}.teamPlanHead b{font-size:15px}.teamPlanHead small{color:#7b8695;font-size:11px;overflow-wrap:anywhere}.planBadge{padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap}.planBadge.pro{background:#ede9fe;color:#6d28d9}.planBadge.free{background:#eef2f6;color:#586678}.teamMeta{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.teamMeta span{font-size:10px;padding:5px 8px;border-radius:999px;background:#f5f7f9;color:#657285}.planForm{display:grid;grid-template-columns:150px 180px minmax(180px,1fr) auto;gap:9px;align-items:end;padding-top:11px;border-top:1px solid #eef1f4}.planForm label{font-size:11px;font-weight:800;color:#677386}.planForm input,.planForm select{width:100%;margin-top:5px;padding:9px 10px;border:1px solid #dce2ea;border-radius:10px;background:#fff;font:inherit}@media(max-width:760px){.planForm{grid-template-columns:1fr 1fr}.reasonField{grid-column:1/-1}.planForm button{grid-column:1/-1}.adminSearch{flex-wrap:wrap}.adminSearch input{flex-basis:100%}}@media(max-width:520px){.adminStats{grid-template-columns:1fr}.teamPlanHead{align-items:center}.planForm{grid-template-columns:1fr}.reasonField,.planForm button{grid-column:auto}}
    `}</style>
  </main>;
}
