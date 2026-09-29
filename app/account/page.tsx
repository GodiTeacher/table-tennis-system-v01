import Link from 'next/link';
import { redirect } from 'next/navigation';
import PasswordInput from '@/components/PasswordInput';
import { createClient } from '@/lib/supabase/server';
import { changePassword, deleteAccount } from './actions';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect('/login');

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('display_name,role').eq('id', user.id).single(),
    supabase.from('team_members').select('team_id,member_role').eq('user_id', user.id),
  ]);
  const isOwner = (memberships ?? []).some((membership) => membership.member_role === 'owner');

  return (
    <main className="shell narrowShell">
      <section className="hero compactHero">
        <div className="eyebrow">ACCOUNT SETTINGS</div>
        <h1>帳號設定</h1>
        <p>管理登入密碼與自己的帳號。</p>
        <div className="topNav"><Link href="/settings">← 返回設定</Link></div>
      </section>

      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {params.message ? <div className="notice successNotice">{params.message}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>帳號資訊</h2></div></div>
        <div className="notice">
          <b>{profile?.display_name || '未設定名稱'}</b><br/>
          <span>{user.email}</span><br/>
          <span className="muted">角色：{profile?.role || '未設定'}</span>
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>更換密碼</h2></div></div>
        <p className="muted">為避免他人拿到已登入裝置後直接改密碼，修改前會再次驗證目前密碼。</p>
        <form action={changePassword} className="stackForm">
          <PasswordInput name="current_password" label="目前密碼" autoComplete="current-password" />
          <PasswordInput name="new_password" label="新密碼" autoComplete="new-password" />
          <PasswordInput name="new_password_confirm" label="再次輸入新密碼" autoComplete="new-password" />
          <button className="primaryButton">更新密碼</button>
        </form>
      </section>

      <section className="card" style={{borderColor:'#efc7c3'}}>
        <div className="sectionTitle"><div><span>03</span><h2>刪除帳號</h2></div></div>
        {isOwner ? (
          <div className="notice errorNotice">你目前是至少一個隊伍的擁有者，為避免隊伍失去管理者，目前不能直接刪除帳號。請先把擁有權交給其他管理員。</div>
        ) : (
          <>
            <p className="muted">刪除後將無法使用此帳號登入。為避免誤刪，請輸入目前密碼，並在確認欄輸入「刪除帳號」。</p>
            <form action={deleteAccount} className="stackForm">
              <PasswordInput name="delete_current_password" label="目前密碼" autoComplete="current-password" />
              <label>刪除確認<input name="delete_confirmation" required placeholder="請輸入：刪除帳號" autoComplete="off" /></label>
              <button className="dangerButton">永久刪除我的帳號</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
