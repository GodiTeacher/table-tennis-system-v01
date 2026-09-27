import Link from 'next/link';

const MODULES = [
  { title: '球皮介紹', desc: '整理球皮類型、特性、適合打法與選購建議。', status: '規劃中' },
  { title: '球板介紹', desc: '整理球板結構、速度控制、打法適配與選擇建議。', status: '規劃中' },
  { title: '球皮／球板代工規則', desc: '統一代購、黏貼、裁切、護邊與收費規則。', status: '規劃中' },
  { title: '桌球職涯介紹', desc: '從校隊、競賽、升學到未來發展的桌球學習路徑。', status: '規劃中' },
  { title: '隊規', desc: '集中管理球隊規範、訓練要求與家長須知。', status: '規劃中' },
  { title: '比賽資訊', desc: '集中整理賽事日期、組別、報名、集合與注意事項。', status: '規劃中' },
  { title: '比賽接送系統', desc: '安排家長與教練接送、座位、費用與分攤紀錄。', status: 'Roadmap 重點' },
  { title: '比賽球皮管理', desc: '統計換皮需求、球皮型號、金額、付款對象與繳費狀態。', status: 'Roadmap 重點' },
];

export default function MorePage() {
  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>更多功能</h1>
        <p>這裡會逐步整合器材、比賽、隊務與球員發展工具，讓整套系統維持像 App 一樣清楚、不把所有功能塞在同一頁。</p>
        <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生管理</Link><Link href="/history">歷史訓練</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>功能 Roadmap</h2></div><strong>{MODULES.length} 個模組</strong></div>
        <div className="moreModuleGrid">
          {MODULES.map((module) => (
            <article className="moreModuleCard" key={module.title}>
              <div className="moreModuleTop"><b>{module.title}</b><span>{module.status}</span></div>
              <p>{module.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>開發順序</h2></div></div>
        <div className="notice"><b>目前優先：</b>先把「訓練 → 評量 → 成長 → 下一次訓練」核心流程做完整，再接比賽接送與比賽球皮管理；器材知識、隊規與職涯內容之後逐步加入。</div>
      </section>
    </main>
  );
}
