import Link from 'next/link';
import { login, signup } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="shell narrowShell">
      <section className="card authCard">
        <div className="sectionTitle"><div><span>COACH</span><h2>教練登入</h2></div></div>
        <p className="muted">登入後可管理學生名單、到課紀錄與訓練課表。</p>
        {params.error ? <div className="notice errorNotice">{params.error}</div> : null}
        {params.message ? <div className="notice">{params.message}</div> : null}
        <form className="stackForm">
          <label>電子信箱<input name="email" type="email" required autoComplete="email" /></label>
          <label>密碼<input name="password" type="password" required minLength={6} autoComplete="current-password" /></label>
          <div className="buttonRow">
            <button formAction={login} className="primaryButton">登入</button>
            <button formAction={signup} className="secondaryButton">建立教練帳號</button>
          </div>
        </form>
        <p className="muted smallText"><Link href="/">← 回訓練規劃</Link></p>
      </section>
    </main>
  );
}
