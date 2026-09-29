import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';
import { login, signup } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="shell narrowShell">
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
      {params.message ? <div className="notice">{params.message}</div> : null}

      <section className="card authCard">
        <div className="sectionTitle"><div><span>COACH</span><h2>教練登入</h2></div></div>
        <p className="muted">登入後可管理學生名單、到課紀錄與訓練課表。</p>
        <form className="stackForm" action={login}>
          <label>電子信箱<input name="email" type="email" required autoComplete="email" /></label>
          <PasswordInput name="password" label="密碼" autoComplete="current-password" />
          <button className="primaryButton">登入</button>
        </form>
      </section>

      <section className="card authCard" style={{marginTop:16}}>
        <div className="sectionTitle"><div><span>REGISTER</span><h2>申請教練帳號</h2></div></div>
        <p className="muted">註冊後需先完成 Email 驗證，再選擇學校／隊伍申請權限。</p>
        <form className="stackForm" action={signup}>
          <label>電子信箱<input name="email" type="email" required autoComplete="email" /></label>
          <PasswordInput name="password" label="設定密碼" autoComplete="new-password" />
          <PasswordInput name="password_confirm" label="再次輸入密碼" autoComplete="new-password" />
          <button className="secondaryButton">建立教練帳號</button>
        </form>
      </section>

      <p className="muted smallText"><Link href="/">← 回訓練規劃</Link></p>
    </main>
  );
}
