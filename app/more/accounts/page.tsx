import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { approveAccount } from './actions';

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ approved?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const [{ data: pending, error: pendingError }, { data: members, error: membersError }] = await Promise.all([
    supabase.rpc('list_pending_accounts'),
    supabase.rpc('list_current_team_members'),
  ]);

  if (pendingError || membersError) redirect('/more');

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">ACCOUNT ACCESS</div>
        <h1>帳號申請管理</h1>
        <p>核准後，該帳號會加入目前球隊工作區，並可共同使用學生管理、訓練紀錄、能力評量與比賽資料。</p>
        <div className="topNav"><Link href="/more">返回更多</Link><Link href="/students">學生管理</Link><Link href="/today">今日訓練</Link></div>
      </section>

      {query.approved ? <div className="notice successNotice"><b>已核准：</b>帳號已加入目前球隊工作區。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>待審核帳號</h2></div><strong>{pending?.length ?? 0} 人</strong></div>
        {!pending?.length ? <p className="muted">目前沒有待審核帳號。</p> : (
          <div className="accountList">
            {pending.map((account: any) => <div className="accountRow" key={account.id}>
              <div><b>{account.display_name || '未命名帳號'}</b><small>{account.email || account.id}</small></div>
              <form action={approveAccount}><input type="hidden" name="user_id" value={account.id}/><button className="primaryButton">核准加入球隊</button></form>
            </div>)}
          </div>
        )}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>目前工作區成員</h2></div><strong>{members?.length ?? 0} 人</strong></div>
        <div className="accountList">
          {(members ?? []).map((member: any) => <div className="accountRow" key={member.id}>
            <div><b>{member.display_name || '未命名帳號'}</b><small>{member.email || member.id}</small></div>
            <span className="roleBadge">{member.member_role === 'owner' ? '擁有者' : member.member_role === 'admin' ? '管理員' : '教練'}</span>
          </div>)}
        </div>
      </section>

      <style>{`
        .accountList{display:flex;flex-direction:column;gap:10px}.accountRow{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e2e7ee;border-radius:14px;padding:13px;background:#fff}.accountRow b,.accountRow small{display:block}.accountRow small{color:#738093;margin-top:3px}.roleBadge{background:#edf1f5;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}@media(max-width:560px){.accountRow{align-items:flex-start;flex-direction:column}.accountRow form,.accountRow button{width:100%}}
      `}</style>
    </main>
  );
}
