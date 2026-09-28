import Link from 'next/link';

const MODULES = [
  { title: '球皮介紹', desc: '整理球皮類型、特性、適合打法與選購建議。', status: '規劃中' },
  { title: '球板介紹', desc: '整理球板結構、速度控制、打法適配與選擇建議。', status: '規劃中' },
  { title: '球皮／球板代工規則', desc: '統一代購、黏貼、裁切、護邊與收費規則。', status: '規劃中' },
  { title: '桌球職涯介紹', desc: '從校隊、競賽、升學到未來發展的桌球學習路徑。', status: '規劃中' },
  { title: '隊規', desc: '集中管理球隊規範、訓練要求與家長須知。', status: '規劃中' },
  { title: '比賽資訊＋接送', desc: '賽事日期、參賽名單、家長／教練接送、座位與費用分攤。', status: '已開始建置', href: '/competitions' },
  { title: '比賽球皮管理', desc: '統計換皮需求、球皮型號、金額、付款對象與繳費狀態。', status: '下一階段' },
];

export default function MorePage() {
  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>更多功能</h1>
        <p>這裡會逐步整合器材、比賽、隊務與球員發展工具，讓整套系統維持像 App 一樣清楚、不把所有功能塞在同一頁。</p>
        <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生管理</Link><Link href="/history">歷史訓練</Link><Link href="/competitions">比賽管理</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>功能 Roadmap</h2></div><strong>{MODULES.length} 個模組</strong></div>
        <div className="moreModuleGrid">
          {MODULES.map((module) => {
            const content = <><div className="moreModuleTop"><b>{module.title}</b><span>{module.status}</span></div><p>{module.desc}</p></>;
            return module.href ? <Link className="moreModuleCard" href={module.href} key={module.title}>{content}</Link> : <article className="moreModuleCard" key={module.title}>{content}</article>;
          })}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>開發順序</h2></div></div>
        <div className="notice"><b>目前進度：</b>核心訓練閉環已可運作，現在開始建置「比賽資訊＋接送」。接著會補學生分車、座位檢查、交通費分攤，再進入比賽球皮管理。</div>
      </section>
    </main>
  );
}
