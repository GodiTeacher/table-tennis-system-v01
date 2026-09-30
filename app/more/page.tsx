import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const MODULES = [
  { title: '設定', desc: '選擇介面主題、查看學校／隊伍、管理帳號申請、帳號設定與登出。', status: '已可使用', href: '/settings' },
  { title: '自訂訓練項目', desc: '在系統預設技能之外，建立隊伍自己的訓練項目並設定適用 A～F 程度。', status: '已可使用', href: '/training-items' },
  { title: '球皮資料庫／庫存', desc: '維護球皮品牌、型號、厚度、顏色、庫存、成本與售價，供比賽換皮快速選用。', status: 'V2 已可使用', href: '/rubber-catalog' },
  { title: '球皮庫存異動', desc: '記錄入庫、出庫、盤點與比賽領用；比賽已黏貼後自動扣庫存並保留學生歷史用皮。', status: 'V2 已可使用', href: '/rubber-inventory' },
  { title: '球皮介紹', desc: '球皮類型、剖面、速度／旋轉／控制／硬度、不同程度選擇方向與世界前 10 選手器材。', status: '已可使用', href: '/rubber-guide' },
  { title: '球板介紹', desc: '五夾、七夾、內置／外置纖維、握柄、整拍重量、球星案例與世界前 10 器材。', status: '已可使用', href: '/blade-guide' },
  { title: '球皮／球板代工規則', desc: '代訂免費黏貼／裁切、自購代工費用、護邊與注意事項，並可複製家長公告。', status: '已可使用', href: '/service-rules' },
  { title: '桌球職涯介紹', desc: '從國小校隊、競賽、升學到選手、教練、裁判、運動科學與桌球產業的發展路線。', status: 'V1 已可使用', href: '/career-guide' },
  { title: '球隊規範', desc: '集中管理隊員基本規範、外出比賽、收費退費及後續其他球隊管理規章。', status: 'V1 已可使用', href: '/team-standards' },
  { title: '比賽資訊＋接送', desc: '賽事日期、參賽名單、家長／教練接送、座位與每位學生車資。', status: 'V2 已可使用', href: '/competitions' },
  { title: '比賽球皮管理', desc: '直接綁定參賽名單，快速配置正反手球皮並彙整需求、庫存、訂貨與付款進度。', status: 'V2 已可使用', href: '/competition-rubbers' },
];

const ROLE_TEXT: Record<string, string> = { owner: '擁有者', admin: '管理員', coach: '一般成員' };

export default async function MorePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  let team: { id: string; school_name: string | null; sport_name: string | null; name: string } | null = null;
  let memberRole = '';
  if (userId) {
    const { data: teamId } = await supabase.rpc('current_team_id');
    if (teamId) {
      const [{ data: teamData }, { data: membership }] = await Promise.all([
        supabase.from('teams').select('id,school_name,sport_name,name').eq('id', teamId).single(),
        supabase.from('team_members').select('member_role').eq('team_id', teamId).eq('user_id', userId).single(),
      ]);
      team = teamData ?? null;
      memberRole = membership?.member_role ?? '';
    }
  }

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>更多功能</h1>
        <p>整合器材、比賽、隊務與設定；同一球隊工作區的教練共享球隊資料，不同工作區彼此隔離。</p>
        <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生管理</Link><Link href="/history">歷史訓練</Link><Link href="/competitions">比賽管理</Link><Link href="/settings">設定</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>目前學校與隊伍</h2></div>{memberRole ? <strong>{ROLE_TEXT[memberRole] ?? memberRole}</strong> : null}</div>
        {team ? <div className="notice"><b>{team.school_name || '未設定學校'}</b>｜{team.sport_name || '未設定運動'}｜{team.name}<br/><span className="muted">你目前所有學生、訓練、評量、比賽與接送資料都屬於這個隊伍工作區。</span></div> : <div className="notice">目前尚未加入任何學校／隊伍。</div>}
        <div className="topNav" style={{marginTop:12}}><Link href="/settings">⚙️ 開啟設定</Link></div>
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
        <div className="notice"><b>目前進度：</b>核心訓練、學生、能力評量、比賽接送、球皮資料庫／庫存、球皮與球板教學、世界前 10 器材、代工規則、桌球職涯 V1 與球隊規範 V1 都已有可用版本。</div>
      </section>
    </main>
  );
}
