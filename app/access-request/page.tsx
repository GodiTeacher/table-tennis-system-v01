import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import { submitAccessRequest } from './actions';

export default async function AccessRequestPage({ searchParams }: { searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect('/login');

  const [{ data: profile }, { data: teams }, { data: requests }] = await Promise.all([
    supabase.from('profiles').select('display_name,role,email').eq('id', userId).single(),
    supabase.rpc('list_team_directory'),
    supabase.rpc('list_my_team_access_requests'),
  ]);

  if (profile?.role && profile.role !== 'pending') redirect('/students');
  const pending = (requests ?? []).find((r: any) => r.status === 'pending');

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TEAM ACCESS</div>
        <h1>申請學校／隊伍權限</h1>
        <p>每個學校的每個隊伍都是獨立工作區。加入既有隊伍後，由該隊伍管理員決定你的使用權限；如果隊伍尚未建立，也可以申請建立新隊伍。</p>
      </section>

      {query.submitted ? <div className="notice successNotice"><b>申請已送出：</b>請等待管理員審核。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>送出失敗：</b>{query.error}</div> : null}

      {pending ? (
        <section className="card">
          <div className="sectionTitle"><div><span>01</span><h2>申請審核中</h2></div></div>
          <div className="notice"><b>{pending.school_name} · {pending.team_name}</b><br/>{pending.sport_name} · {pending.request_type === 'create' ? '建立新隊伍' : '加入既有隊伍'}<br/>送出時間：{new Date(pending.created_at).toLocaleString('zh-TW')}</div>
          <p className="muted">審核完成後重新登入即可開始使用。</p>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="sectionTitle"><div><span>01</span><h2>加入既有隊伍</h2></div><strong>{teams?.length ?? 0} 個</strong></div>
            <form action={submitAccessRequest} className="accessForm">
              <input type="hidden" name="mode" value="join"/>
              <label>選擇學校／隊伍
                <select name="team_id" required defaultValue="">
                  <option value="" disabled>請選擇</option>
                  {(teams ?? []).map((team: any) => <option key={team.id} value={team.id}>{team.school_name || '未設定學校'}｜{team.sport_name}｜{team.team_name}</option>)}
                </select>
              </label>
              <label>備註（選填）<textarea name="message" placeholder="例如：我是該校桌球隊助理教練，負責訓練與比賽接送。"/></label>
              <button className="primaryButton">送出加入申請</button>
            </form>
          </section>

          <section className="card">
            <div className="sectionTitle"><div><span>02</span><h2>建立新學校／隊伍</h2></div></div>
            <div className="notice">如果清單中沒有你的學校與隊伍，可以先申請建立。平台管理員核准後，你會成為該隊伍的第一位「隊伍管理員／擁有者」。</div>
            <form action={submitAccessRequest} className="accessForm">
              <input type="hidden" name="mode" value="create"/>
              <label>學校名稱<input name="school_name" required placeholder="例如：管嶼國小"/></label>
              <label>運動種類<input name="sport_name" required defaultValue="桌球" placeholder="例如：桌球"/></label>
              <label>隊伍名稱<input name="team_name" required placeholder="例如：桌球校隊／培育隊"/></label>
              <label>備註（選填）<textarea name="message" placeholder="簡單說明你的身分與用途"/></label>
              <button className="primaryButton">申請建立隊伍</button>
            </form>
          </section>
        </>
      )}

      <section className="card"><LogoutButton /></section>
      <style>{`.accessForm{display:grid;gap:12px;margin-top:12px}.accessForm label{font-size:13px;font-weight:800;color:#607086}.accessForm input,.accessForm select,.accessForm textarea{width:100%;margin-top:6px;border:1px solid #dce3ea;border-radius:12px;padding:12px;background:#fff;font:inherit}.accessForm textarea{min-height:92px;resize:vertical}`}</style>
    </main>
  );
}
