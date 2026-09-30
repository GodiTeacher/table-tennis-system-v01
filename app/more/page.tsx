import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const MODULES = [
  { title: '設定', desc: '選擇介面主題、查看學校／隊伍、管理帳號申請、帳號設定與登出。', status: '已可使用', href: '/settings' },
  { title: '自訂訓練項目', desc: '在系統預設技能之外，建立隊伍自己的訓練項目並設定適用 A～F 程度。', status: '已可使用', href: '/training-items' },
  { title: '球皮資料庫／庫存', desc: '維護球皮品牌、型號、厚度、顏色、庫存、成本與售價，供比賽換皮快速選用。', status: 'V2 已可使用', href: '/rubber-catalog' },
  { title: '球皮庫存異動', desc: '記錄入庫、出庫、盤點與比賽領用；比賽已黏貼後自動扣庫存並保留學生歷史用皮。', status: 'V2 已可使用', href: '/rubber-inventory' },
  { title: '球皮介紹', desc: '球皮類型、剖面、參數、價格範圍與世界前 10 選手器材。', status: '已可使用', href: '/rubber-guide' },
  { title: '球板介紹', desc: '球板切面、內／外置纖維、握柄、整拍重量、球星案例與世界前 10 器材。', status: '已可使用', href: '/blade-guide' },
  { title: '球皮／球板代工規則', desc: '代訂免費黏貼／裁切、自購代工費用、護邊與注意事項，並可複製家長公告。', status: '已可使用', href: '/service-rules' },
  { title: '桌球職涯介紹', desc: '從國小校隊、競賽、升學到選手、教練、裁判、運動科學與桌球產業的發展路線。', status: 'V1 已可使用', href: '/career-guide' },
  { title: '球隊規範', desc: '10 大類集中管理：隊員、比賽、收退費、月費請假、器材、接送、家長、點數、場地與冷氣。', status: 'V1 已可使用', href: '/team-standards' },
  { title: '點數紀錄', desc: '教練自由新增加點／扣點，記錄原因、日期與備註；誤登紀錄可刪除並自動重算總分。', status: 'V1 已可使用', href: '/points' },
  { title: '冷氣度數／費用', desc: '每月登記電表起訖、每度單價與固定費，並記錄時段、年級、度數與學生人數供後續分攤。', status: 'V1 已可使用', href: '/aircon' },
  { title: '比賽倒數', desc: '同時查看未扣假日與扣除週末／自訂休假日後的倒數，距離越近顏色越醒目。', status: 'V1 已可使用', href: '/competition-countdown' },
  { title: '比賽資訊＋接送', desc: '賽事日期、參賽名單、由教練協調接送車輛、座位與每位學生車資。', status: 'V2 已可使用', href: '/competitions' },
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
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">TABLE TENNIS SYSTEM V01</div><h1>更多功能</h1><p>整合器材、比賽、隊務、費用與設定；同一球隊工作區共享資料，不同工作區彼此隔離。</p><div className="topNav"><Link href="/today">今日訓練</Link><Link href="/students">學生管理</Link><Link href="/history">歷史訓練</Link><Link href="/competitions">比賽管理</Link><Link href="/settings">設定</Link></div></section>
    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>目前學校與隊伍</h2></div>{memberRole?<strong>{ROLE_TEXT[memberRole]??memberRole}</strong>:null}</div>{team?<div className="notice"><b>{team.school_name||'未設定學校'}</b>｜{team.sport_name||'未設定運動'}｜{team.name}<br/><span className="muted">學生、訓練、比賽、點數與冷氣費資料都屬於這個隊伍工作區。</span></div>:<div className="notice">目前尚未加入任何學校／隊伍。</div>}<div className="topNav" style={{marginTop:12}}><Link href="/settings">⚙️ 開啟設定</Link></div></section>
    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>功能 Roadmap</h2></div><strong>{MODULES.length} 個模組</strong></div><div className="moreModuleGrid">{MODULES.map(module=><Link className="moreModuleCard" href={module.href} key={module.title}><div className="moreModuleTop"><b>{module.title}</b><span>{module.status}</span></div><p>{module.desc}</p></Link>)}</div></section>
    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>目前進度</h2></div></div><div className="notice">核心訓練、學生、能力評量、比賽接送、比賽倒數、器材、世界前 10、代工規則、桌球職涯、10 大類球隊規範、點數紀錄與冷氣費 V1 均已有可用版本。</div></section>
  </main>;
}
