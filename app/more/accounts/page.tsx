import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { approveJoinRequest, approveNewTeamRequest, rejectAccessRequest } from './actions';

const PERMS = [
  ['students','學生管理'],['training','訓練規劃／紀錄'],['assessment','能力評量'],['competitions','比賽管理'],['transport','接送／車資'],
] as const;

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ approved?: string; created?: string; rejected?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const [{ data: joinRequests }, { data: newTeamRequests }, { data: members }, { data: profile }] = await Promise.all([
    supabase.rpc('list_team_join_requests'),
    supabase.rpc('list_new_team_requests'),
    supabase.rpc('list_current_team_members'),
    supabase.from('profiles').select('platform_admin').eq('id', userId).single(),
  ]);

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">ACCOUNT ACCESS</div><h1>學校／隊伍帳號管理</h1>
        <p>每個「學校 × 隊伍」都有自己的管理員。其他使用者申請加入後，由隊伍管理員決定角色與可使用模組。</p>
        <div className="topNav"><Link href="/more">返回更多</Link><Link href="/students">學生管理</Link><Link href="/today">今日訓練</Link></div>
      </section>

      {query.approved ? <div className="notice successNotice"><b>已核准加入：</b>權限已套用。</div> : null}
      {query.created ? <div className="notice successNotice"><b>新隊伍已建立：</b>申請者已成為該隊伍擁有者。</div> : null}
      {query.rejected ? <div className="notice"><b>已拒絕申請。</b></div> : null}
      {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>申請加入目前隊伍</h2></div><strong>{joinRequests?.length ?? 0} 人</strong></div>
        {!joinRequests?.length ? <p className="muted">目前沒有待審核的加入申請。</p> : <div className="requestList">{joinRequests.map((r:any)=><article className="requestCard" key={r.id}>
          <div><b>{r.display_name || '未命名帳號'}</b><small>{r.email}</small>{r.message ? <p>{r.message}</p> : null}</div>
          <form action={approveJoinRequest} className="permissionForm">
            <input type="hidden" name="request_id" value={r.id}/>
            <label>角色<select name="member_role" defaultValue="coach"><option value="coach">一般成員</option><option value="admin">隊伍管理員</option></select></label>
            <div className="permissionGrid">{PERMS.map(([key,label])=><label key={key}><input type="checkbox" name={`perm_${key}`} defaultChecked/> {label}</label>)}</div>
            <div className="actionRow"><button className="primaryButton">核准並套用權限</button><button className="secondaryButton" formAction={rejectAccessRequest}>拒絕</button></div>
          </form>
        </article>)}</div>}
      </section>

      {profile?.platform_admin ? <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>申請建立新學校／隊伍</h2></div><strong>{newTeamRequests?.length ?? 0} 筆</strong></div>
        {!newTeamRequests?.length ? <p className="muted">目前沒有建立新隊伍申請。</p> : <div className="requestList">{newTeamRequests.map((r:any)=><article className="requestCard" key={r.id}>
          <div><b>{r.school_name}｜{r.sport_name}｜{r.team_name}</b><small>{r.display_name} · {r.email}</small>{r.message ? <p>{r.message}</p> : null}</div>
          <form action={approveNewTeamRequest} className="actionRow"><input type="hidden" name="request_id" value={r.id}/><button className="primaryButton">建立並設為隊伍擁有者</button><button className="secondaryButton" formAction={rejectAccessRequest}>拒絕</button></form>
        </article>)}</div>}
      </section> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>目前隊伍成員</h2></div><strong>{members?.length ?? 0} 人</strong></div>
        <div className="accountList">{(members ?? []).map((m:any)=><div className="accountRow" key={m.id}><div><b>{m.display_name || '未命名帳號'}</b><small>{m.email}</small></div><span className="roleBadge">{m.member_role === 'owner' ? '擁有者' : m.member_role === 'admin' ? '管理員' : '一般成員'}</span></div>)}</div>
      </section>

      <style>{`.requestList,.accountList{display:flex;flex-direction:column;gap:12px}.requestCard,.accountRow{border:1px solid #e2e7ee;border-radius:14px;padding:14px;background:#fff}.requestCard small,.accountRow small{display:block;color:#738093;margin-top:4px}.requestCard p{color:#596779}.permissionForm{margin-top:12px}.permissionForm select{margin-left:8px;padding:8px;border:1px solid #dce2ea;border-radius:10px}.permissionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.permissionGrid label{border:1px solid #e2e7ee;border-radius:10px;padding:9px}.actionRow{display:flex;gap:8px;flex-wrap:wrap}.accountRow{display:flex;justify-content:space-between;align-items:center}.roleBadge{background:#edf1f5;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}@media(max-width:620px){.permissionGrid{grid-template-columns:1fr 1fr}.accountRow{align-items:flex-start;flex-direction:column;gap:8px}}`}</style>
    </main>
  );
}
