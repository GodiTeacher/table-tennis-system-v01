import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { approveJoinRequest, approveNewTeamRequest, rejectAccessRequest } from './actions';

const PERMISSION_GROUPS=[
  {title:'學生與日常',icon:'●',desc:'學生名單、出勤與點數',items:[['student_profiles','學生資料'],['attendance','學生出勤'],['points','點數紀錄']]},
  {title:'訓練與評量',icon:'◎',desc:'規劃、紀錄與能力成長',items:[['training_plans','訓練規劃'],['training_history','訓練紀錄'],['assessment','能力評量']]},
  {title:'比賽與接送',icon:'🏆',desc:'賽事、車資與比賽換皮',items:[['competitions_manage','比賽管理'],['transport','接送／車資'],['competition_rubbers','比賽球皮']]},
  {title:'器材管理',icon:'◈',desc:'球皮資料、庫存與代工',items:[['equipment_catalog','球皮資料庫'],['equipment_inventory','庫存異動'],['service_rules','代工規則']]},
  {title:'營運財務',icon:'▦',desc:'較敏感的球隊營運資料',items:[['aircon','冷氣費用'],['payroll','教練薪酬'],['operations_close','營運月結']]},
  {title:'管理設定',icon:'⚙',desc:'隊伍品牌與設定',items:[['team_settings','團隊設定']]},
] as const;

export default async function AccountsPage({searchParams}:{searchParams:Promise<{approved?:string;created?:string;rejected?:string;error?:string}>}){
  const query=await searchParams;const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;if(!userId)redirect('/login');
  const [{data:joinRequests},{data:newTeamRequests},{data:members},{data:profile}]=await Promise.all([
    supabase.rpc('list_team_join_requests'),supabase.rpc('list_new_team_requests'),supabase.rpc('list_current_team_members'),supabase.from('profiles').select('platform_admin').eq('id',userId).single(),
  ]);
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">ACCOUNT ACCESS</div><h1>學校／隊伍帳號管理</h1><p>加入隊伍時可依功能區塊分配權限。營運財務、器材、比賽等資料可以分開開放，不需要一次全部給予。</p><div className="topNav"><Link href="/settings">返回設定</Link><Link href="/students">學生管理</Link><Link href="/today">今日訓練</Link></div></section>
    {query.approved?<div className="notice successNotice"><b>✓ 已核准加入：</b>細部權限已套用。</div>:null}{query.created?<div className="notice successNotice"><b>✓ 新隊伍已建立。</b></div>:null}{query.rejected?<div className="notice">已拒絕申請。</div>:null}{query.error?<div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>申請加入目前隊伍</h2></div><strong>{joinRequests?.length??0} 人</strong></div>
      {!joinRequests?.length?<p className="muted">目前沒有待審核的加入申請。</p>:<div className="requestList">{joinRequests.map((r:any)=><article className="requestCard" key={r.id}>
        <div className="requestIdentity"><b>{r.display_name||'未命名帳號'}</b><small>{r.email}</small>{r.message?<p>{r.message}</p>:null}</div>
        <form action={approveJoinRequest} className="permissionForm"><input type="hidden" name="request_id" value={r.id}/>
          <div className="roleRow"><label>角色<select name="member_role" defaultValue="coach"><option value="coach">一般成員</option><option value="admin">隊伍管理員</option></select></label><span>管理員仍建議依實際工作勾選需要的模組。</span></div>
          <div className="permissionGroups">{PERMISSION_GROUPS.map(group=><fieldset className="permissionGroup" key={group.title}><legend><span>{group.icon}</span><div><b>{group.title}</b><small>{group.desc}</small></div></legend><div className="permissionItems">{group.items.map(([key,label])=><label key={key}><input type="checkbox" name={`perm_${key}`} defaultChecked/>{label}</label>)}</div></fieldset>)}</div>
          <div className="actionRow"><button className="primaryButton">核准並套用權限</button><button className="secondaryButton" formAction={rejectAccessRequest}>拒絕</button></div>
        </form>
      </article>)}</div>}
    </section>

    {profile?.platform_admin?<section className="card"><div className="sectionTitle"><div><span>02</span><h2>申請建立新學校／隊伍</h2></div><strong>{newTeamRequests?.length??0} 筆</strong></div>{!newTeamRequests?.length?<p className="muted">目前沒有建立新隊伍申請。</p>:<div className="requestList">{newTeamRequests.map((r:any)=><article className="requestCard" key={r.id}><div><b>{r.school_name}｜{r.sport_name}｜{r.team_name}</b><small>{r.display_name} · {r.email}</small>{r.message?<p>{r.message}</p>:null}</div><form action={approveNewTeamRequest} className="actionRow"><input type="hidden" name="request_id" value={r.id}/><button className="primaryButton">建立並設為隊伍擁有者</button><button className="secondaryButton" formAction={rejectAccessRequest}>拒絕</button></form></article>)}</div>}</section>:null}

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>目前隊伍成員</h2></div><strong>{members?.length??0} 人</strong></div><div className="accountList">{(members??[]).map((m:any)=><div className="accountRow" key={m.id}><div><b>{m.display_name||'未命名帳號'}</b><small>{m.email}</small></div><span className="roleBadge">{m.member_role==='owner'?'擁有者':m.member_role==='admin'?'管理員':'一般成員'}</span></div>)}</div></section>

    <style>{`.requestList,.accountList{display:flex;flex-direction:column;gap:12px}.requestCard,.accountRow{border:1px solid #e2e7ee;border-radius:18px;padding:15px;background:#fff}.requestCard small,.accountRow small{display:block;color:#738093;margin-top:4px}.requestCard p{color:#596779}.permissionForm{margin-top:14px}.roleRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:var(--theme-soft,#f5f3ff)}.roleRow select{margin-left:8px;padding:8px;border:1px solid #dce2ea;border-radius:10px}.roleRow span{font-size:12px;color:#748093}.permissionGroups{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}.permissionGroup{margin:0;padding:12px;border:1px solid #e3e7ec;border-radius:16px;background:#fbfcfe}.permissionGroup legend{padding:0 5px;display:flex;gap:8px;align-items:center}.permissionGroup legend>span{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:var(--theme-soft,#f5f3ff);color:var(--theme-primary,#6d35c5)}.permissionGroup legend div{display:flex;flex-direction:column}.permissionGroup legend b{font-size:14px}.permissionGroup legend small{font-size:10px;color:#87919f;margin:1px 0 0}.permissionItems{display:grid;gap:7px;margin-top:8px}.permissionItems label{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:11px;background:#fff;border:1px solid #edf0f3;font-size:13px}.actionRow{display:flex;gap:8px;flex-wrap:wrap}.accountRow{display:flex;justify-content:space-between;align-items:center}.roleBadge{background:#edf1f5;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}@media(max-width:720px){.permissionGroups{grid-template-columns:1fr}.roleRow{align-items:flex-start;flex-direction:column}.accountRow{align-items:flex-start;flex-direction:column;gap:8px}}`}</style>
  </main>;
}
