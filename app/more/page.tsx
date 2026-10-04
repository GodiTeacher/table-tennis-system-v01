import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTeamEntitlements } from '@/lib/subscription-server';
import PlanSummaryCard from '@/components/PlanSummaryCard';

const GROUPS = [
  {
    title: '球隊管理', subtitle: '設定、訓練與球隊日常', icon: '⚙', items: [
      { icon: '⚙', title: '系統設定', desc: '主題、團隊品牌、帳號與登出', href: '/settings' },
      { icon: '⌁', title: '訓練項目', desc: '自訂隊伍訓練內容與程度', href: '/training-items' },
      { icon: '★', title: '點數紀錄', desc: '加扣點、原因與學生總分', href: '/points', pro:true },
      { icon: '✓', title: '球隊規範', desc: '隊員、收費、請假、器材與接送規則', href: '/team-standards' },
    ],
  },
  {
    title: '營運管理', subtitle: '出勤、冷氣、薪酬與月結', icon: '▦', items: [
      { icon: '●', title: '學生出勤', desc: '固定週模板、每日例外與時段人數', href: '/attendance-settings' },
      { icon: '❄', title: '冷氣費用', desc: '電表、冷氣時段與月費群組分攤', href: '/aircon', pro:true },
      { icon: '◎', title: '教練薪酬', desc: '出勤、收支、固定月薪與加權分配', href: '/payroll', pro:true },
      { icon: '▤', title: '營運月結', desc: '整合檢查與 LINE／圖片月報', href: '/operations-close', pro:true },
    ],
  },
  {
    title: '器材管理', subtitle: '球皮、庫存與代工', icon: '◈', items: [
      { icon: '◉', title: '球皮資料庫', desc: '品牌、型號、厚度、庫存與售價', href: '/rubber-catalog', pro:true },
      { icon: '↕', title: '庫存異動', desc: '入庫、出庫、盤點與比賽領用', href: '/rubber-inventory', pro:true },
      { icon: '✂', title: '代工規則', desc: '黏貼、裁切、護邊與收費公告', href: '/service-rules' },
      { icon: '◍', title: '比賽球皮', desc: '參賽名單換皮、庫存與訂貨', href: '/competition-rubbers', pro:true },
    ],
  },
  {
    title: '比賽工具', subtitle: '賽程、名單、接送與倒數', icon: '🏆', items: [
      { icon: '🏆', title: '比賽管理', desc: '賽事、參賽名單、接送與車資', href: '/competitions', pro:true },
      { icon: '◷', title: '比賽倒數', desc: '比賽日期與休假日倒數', href: '/competition-countdown' },
    ],
  },
  {
    title: '桌球知識', subtitle: '器材介紹與生涯資訊', icon: 'i', items: [
      { icon: '◉', title: '球皮介紹', desc: '類型、參數、價格與選手器材', href: '/rubber-guide' },
      { icon: '▱', title: '球板介紹', desc: '纖維結構、握柄、重量與案例', href: '/blade-guide' },
      { icon: '↗', title: '桌球職涯', desc: '升學、選手、教練與產業路線', href: '/career-guide' },
    ],
  },
];

const ROLE_TEXT: Record<string, string> = { owner: '擁有者', admin: '管理員', coach: '一般成員' };

type TeamInfo={id:string;school_name:string|null;sport_name:string|null;name:string;short_name:string|null;logo_data_url:string|null;brand_color:string|null};

export default async function MorePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  let team: TeamInfo | null = null;
  let memberRole = '';
  let activeStudentCount:number|undefined;
  let isPlatformAdmin=false;
  if (userId) {
    const [{ data: teamId },{data:platformAdmin}] = await Promise.all([
      supabase.rpc('current_team_id'),
      supabase.rpc('is_platform_admin'),
    ]);
    isPlatformAdmin=Boolean(platformAdmin);
    if (teamId) {
      const [{ data: teamData }, { data: membership }, {count}] = await Promise.all([
        supabase.from('teams').select('id,school_name,sport_name,name,short_name,logo_data_url,brand_color').eq('id', teamId).single(),
        supabase.from('team_members').select('member_role').eq('team_id', teamId).eq('user_id', userId).single(),
        supabase.from('students').select('id',{count:'exact',head:true}).eq('team_id',teamId).eq('active',true),
      ]);
      team = (teamData as TeamInfo | null) ?? null;
      memberRole = membership?.member_role ?? '';
      activeStudentCount=count??0;
    }
  }
  const {entitlements}=await getCurrentTeamEntitlements();
  const isFree=entitlements?.plan_code==='free';

  return <main className="shell moreShell">
    <section className="moreHero">
      <div><span className="moreEyebrow">MORE</span><h1>更多</h1><p>球隊管理、營運、器材、比賽與知識都集中在這裡。</p></div>
      <Link href="/settings" className="roundSettings" aria-label="開啟設定">⚙</Link>
    </section>

    <section className="workspaceCard">
      <div className="workspaceIcon" style={{borderColor:team?.brand_color||'transparent'}}>{team?.logo_data_url?<img src={team.logo_data_url} alt="團隊 Logo"/>:'🏓'}</div>
      <div className="workspaceText">
        <span>目前工作區</span>
        <b>{team ? `${team.school_name||'未設定學校'}｜${team.sport_name||'桌球'}｜${team.short_name||team.name}` : '尚未加入學校／隊伍'}</b>
      </div>
      {memberRole ? <span className="roleBadge">{ROLE_TEXT[memberRole]??memberRole}</span> : null}
    </section>

    <PlanSummaryCard entitlements={entitlements} studentCount={activeStudentCount} compact/>

    {isPlatformAdmin?<section className="platformAdminEntry"><div><span>PLATFORM ADMIN</span><b>平台方案管理</b><small>分派球隊 Free / Pro、測試授權與人工贈送 Pro。</small></div><Link href="/platform-admin">管理方案 ›</Link></section>:null}

    <div className="moreGroups">
      {GROUPS.map(group => <section className="moreGroup" key={group.title}>
        <header className="groupHeader"><div className="groupIcon">{group.icon}</div><div><h2>{group.title}</h2><p>{group.subtitle}</p></div></header>
        <div className="settingsList">
          {group.items.map(item => {
            const locked=Boolean(isFree&&item.pro);
            const href=locked?`/plans?feature=${encodeURIComponent(item.title)}`:item.href;
            return <Link href={href} className={`settingsRow ${locked?'proLocked':''}`} key={item.href}>
              <span className="itemIcon">{item.icon}</span><span className="itemText"><b>{item.title}{item.pro?<em className="proTag">PRO</em>:null}</b><small>{locked?'菁英版功能 · 點此查看升級方案':item.desc}</small></span><span className="chevron" aria-hidden="true">›</span>
            </Link>;
          })}
        </div>
      </section>)}
    </div>

    <style>{`
      .moreShell{max-width:820px}.moreHero{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:14px 4px 18px}.moreEyebrow{font-size:11px;font-weight:900;letter-spacing:.18em;color:var(--theme-accent,#7c3aed)}.moreHero h1{margin:5px 0 3px;font-size:34px;line-height:1}.moreHero p{margin:0;color:#768191;font-size:13px}.roundSettings{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;background:#fff;border:1px solid #e4e8ed;box-shadow:0 7px 20px rgba(24,33,47,.08);text-decoration:none;color:#465266;font-size:18px}.workspaceCard{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:14px 16px;margin-bottom:18px;border-radius:18px;background:linear-gradient(135deg,var(--theme-soft,#f5f3ff),#fff);border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 18%,#e1e6ec)}.workspaceIcon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#fff;font-size:20px;box-shadow:0 5px 14px rgba(24,33,47,.06);overflow:hidden;border:2px solid transparent}.workspaceIcon img{width:100%;height:100%;object-fit:contain}.workspaceText{min-width:0;display:flex;flex-direction:column;gap:2px}.workspaceText span{font-size:11px;color:#7b8696}.workspaceText b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.roleBadge{padding:6px 9px;border-radius:999px;background:#fff;color:#647083;font-size:10px;font-weight:900}.platformAdminEntry{display:flex;justify-content:space-between;gap:14px;align-items:center;margin:0 0 18px;padding:14px 16px;border-radius:18px;background:#171923;color:#fff}.platformAdminEntry div{display:flex;flex-direction:column;gap:2px}.platformAdminEntry span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#c4b5fd}.platformAdminEntry b{font-size:14px}.platformAdminEntry small{font-size:10px;color:#b8bfcb}.platformAdminEntry a{white-space:nowrap;text-decoration:none;color:#fff;font-size:12px;font-weight:900;padding:8px 10px;border-radius:10px;background:#7c3aed}.moreGroups{display:grid;gap:18px}.moreGroup{background:#fff;border:1px solid #e3e7ec;border-radius:22px;overflow:hidden;box-shadow:0 8px 28px rgba(24,33,47,.055)}.groupHeader{display:flex;gap:11px;align-items:center;padding:15px 16px 11px}.groupIcon{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--theme-soft,#f5f3ff);color:var(--theme-accent,#7c3aed);font-weight:900}.groupHeader h2{margin:0;font-size:16px}.groupHeader p{margin:2px 0 0;color:#8a94a3;font-size:11px}.settingsList{border-top:1px solid #eef1f4}.settingsRow{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:11px;align-items:center;padding:12px 15px;text-decoration:none;color:#263244;background:#fff;border-top:1px solid #f0f2f5;transition:.16s ease}.settingsRow:first-child{border-top:0}.settingsRow:visited{color:#263244}.itemIcon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#f5f7f9;color:#687487;font-weight:900}.itemText{min-width:0;display:flex;flex-direction:column;gap:2px}.itemText b{font-size:14px;line-height:1.25}.itemText small{font-size:11px;color:#7d8898;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.proTag{font-style:normal;margin-left:7px;padding:2px 5px;border-radius:999px;background:var(--theme-accent,#7c3aed);color:#fff;font-size:8px;letter-spacing:.06em;vertical-align:1px}.proLocked{background:#fafbfc}.proLocked .itemIcon{filter:grayscale(.45);opacity:.72}.proLocked .chevron:before{content:'🔒';font-size:10px;margin-right:5px}.chevron{font-size:25px;line-height:1;color:#b2bac5}.settingsRow:active{background:#f7f8fa}@media(hover:hover){.settingsRow:hover{background:#f8f9fb}.settingsRow:hover .itemIcon{background:var(--theme-soft,#f5f3ff);color:var(--theme-accent,#7c3aed)}}@media(max-width:560px){.moreShell{padding-left:12px;padding-right:12px}.moreHero{padding-top:10px}.moreHero h1{font-size:30px}.workspaceCard{grid-template-columns:auto minmax(0,1fr)}.roleBadge{grid-column:2;justify-self:start}.platformAdminEntry{align-items:flex-start;flex-direction:column}.moreGroup{border-radius:20px}.settingsRow{padding:12px 13px}.itemText small{font-size:10.5px}}
    `}</style>
  </main>;
}
