import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

const MODULES = [
  { title: '帳號申請管理', desc: '查看待審核帳號，核准後加入目前球隊工作區。', status: '已可使用', href: '/more/accounts' },
  { title: '球皮介紹', desc: '整理球皮類型、特性、適合打法與選購建議。', status: '規劃中' },
  { title: '球板介紹', desc: '整理球板結構、速度控制、打法適配與選擇建議。', status: '規劃中' },
  { title: '球皮／球板代工規則', desc: '統一代購、黏貼、裁切、護邊與收費規則。', status: '規劃中' },
  { title: '桌球職涯介紹', desc: '從校隊、競賽、升學到未來發展的桌球學習路徑。', status: '規劃中' },
  { title: '隊規', desc: '集中管理球隊規範、訓練要求與家長須知。', status: '規劃中' },
  { title: '比賽資訊＋接送', desc: '賽事日期、參賽名單、家長／教練接送、座位與每位學生車資。', status: 'V2 建置中', href: '/competitions' },
  { title: '比賽球皮管理', desc: '統計換皮需求、球皮型號、金額、付款對象與繳費狀態。', status: '下一階段' },
];

export default function MorePage() {
  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>更多功能</h1>
        <p>整合器材、比賽、隊務與帳號功能；同一球隊工作區的教練共享球隊資料，不同工作區彼此隔離。</p>
        <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生管理</Link><Link href="/history">歷史訓練</Link><Link href="/competitions">比賽管理</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>帳號</h2></div></div>
        <div className="notice"><b>工作區：</b>核准後加入同一球隊工作區的教練，會共同看到該球隊的學生、訓練、能力評量與比賽資料。</div>
        <div className="topNav" style={{marginTop:12}}><Link href="/more/accounts">帳號申請管理</Link></div>
        <div style={{marginTop:12}}><LogoutButton /></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>功能 Roadmap</h2></div><strong>{MODULES.length} 個模組</strong></div>
        <div className="moreModuleGrid">
          {MODULES.map((module) => {
            const content = <><div className="moreModuleTop"><b>{module.title}</b><span>{module.status}</span></div><p>{module.desc}</p></>;
            return module.href ? <Link className="moreModuleCard" href={module.href} key={module.title}>{content}</Link> : <article className="moreModuleCard" key={module.title}>{content}</article>;
          })}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>開發順序</h2></div></div>
        <div className="notice"><b>目前進度：</b>帳號核准與工作區隔離已完成，比賽資訊與接送已進入日期／分車／學生車資階段。下一步會進入比賽球皮管理。</div>
      </section>
    </main>
  );
}
