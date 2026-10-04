import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements} from '@/lib/subscription-server';

const rows=[
  ['學生名單','20 位','大量／不限'],
  ['拍照 OCR 匯入','每月 5 次','高額度／不限'],
  ['今日快速點名','✓','✓'],
  ['簡易課表','✓','✓'],
  ['訓練紀錄','最近 2 個月','完整歷史'],
  ['基本家長通知','✓','✓'],
  ['PDF','基本模板','自訂 Logo／欄位／版型'],
  ['進階比賽管理','—','✓'],
  ['財務／教練薪酬','—','✓'],
  ['器材／庫存管理','—','✓'],
  ['進階統計分析','—','✓'],
  ['多人教練協作','—','✓'],
  ['全台桌球地圖','✓','✓'],
];

const LOCKED_LABELS:Record<string,string>={
  finance:'財務／營運管理',
  payroll:'教練薪酬',
  inventory:'器材／庫存管理',
  advanced_competitions:'進階比賽管理',
  advanced_analytics:'進階統計／點數管理',
  custom_pdf:'自訂 PDF',
  multi_coach:'多人教練協作',
};

export default async function PlansPage({searchParams}:{searchParams:Promise<{locked?:string}>}){
  const params=await searchParams;
  const {userId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  const current=entitlements?.plan_code??'free';
  const locked=params.locked?LOCKED_LABELS[params.locked]??'這項功能':null;
  return <main className="shell planPage">
    <section className="hero compactHero"><div className="eyebrow">PLANS</div><h1>方案與功能</h1><p>免費版先把每天最常用的工作做到比紙本與 Excel 更快；需要更大容量與完整營運功能時再升級。</p><div className="topNav"><Link href="/more">返回更多</Link><Link href="/students">學生名單</Link></div></section>
    {locked&&current==='free'?<section className="lockedNotice"><div><span>🔒 PRO</span><h2>{locked}屬於菁英版功能</h2><p>你的資料不會遺失；升級後即可直接使用這項功能。</p></div><Link href="/more">先返回免費功能</Link></section>:null}
    <div className="planCards">
      <section className={`planCard ${current==='free'?'current':''}`}><span className="mini">FREE</span><h2>免費版</h2><p>適合個人教練、小班與剛開始數位化的球隊。</p><b>核心體驗完整</b><ul><li>20 位學生</li><li>訓練紀錄最近 2 個月</li><li>每月 5 次 OCR</li><li>基本 PDF 模板</li></ul>{current==='free'?<strong className="currentMark">目前方案</strong>:null}</section>
      <section className={`planCard pro ${current==='pro'?'current':''}`}><span className="mini">PRO</span><h2>菁英版</h2><p>適合正式校隊、俱樂部與需要完整營運管理的教練。</p><b>完整管理與分析</b><ul><li>更多／不限學生</li><li>完整訓練歷史</li><li>進階比賽、財務、薪酬</li><li>自訂 PDF 與分析</li></ul>{current==='pro'?<strong className="currentMark">目前方案</strong>:<strong className="coming">升級功能開發中</strong>}</section>
    </div>
    <section className="card"><div className="sectionTitle"><div><span>COMPARE</span><h2>功能比較</h2></div></div><div className="planTableWrap"><table className="planTable"><thead><tr><th>功能</th><th>免費版</th><th>菁英版</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div></section>
    <style>{`
      .planPage{max-width:920px}.lockedNotice{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:16px 0;padding:16px 18px;border-radius:18px;background:#fff7ed;border:1px solid #fed7aa}.lockedNotice span{font-size:10px;font-weight:950;letter-spacing:.08em;color:#c2410c}.lockedNotice h2{margin:4px 0 3px;font-size:17px}.lockedNotice p{margin:0;color:#8b5e43;font-size:12px}.lockedNotice a{white-space:nowrap;text-decoration:none;padding:9px 12px;border-radius:11px;background:#fff;color:#9a3412;border:1px solid #fdba74;font-size:11px;font-weight:900}.planCards{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.planCard{position:relative;padding:19px;border:1px solid #e1e6ec;border-radius:22px;background:#fff;box-shadow:0 8px 24px rgba(24,33,47,.05)}.planCard.pro{background:linear-gradient(145deg,var(--theme-soft,#f5f3ff),#fff);border-color:color-mix(in srgb,var(--theme-accent,#7c3aed) 28%,#dfe5ec)}.planCard.current{outline:2px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 44%,transparent)}.planCard .mini{font-size:9px;font-weight:950;letter-spacing:.17em;color:#8994a4}.planCard h2{margin:5px 0 4px;font-size:24px}.planCard p{margin:0 0 13px;color:#758092;font-size:13px}.planCard>b{font-size:13px}.planCard ul{margin:10px 0 0;padding-left:20px;color:#596576;font-size:12px;line-height:1.9}.currentMark,.coming{display:inline-block;margin-top:12px;padding:7px 10px;border-radius:999px;font-size:10px}.currentMark{background:var(--theme-accent,#7c3aed);color:#fff}.coming{background:#eef2f6;color:#667386}.planTableWrap{overflow:auto}.planTable{width:100%;border-collapse:collapse;min-width:580px}.planTable th,.planTable td{text-align:left;padding:11px 12px;border-bottom:1px solid #edf0f3;font-size:12px}.planTable th{color:#6f7b8c;font-size:10px;letter-spacing:.06em}.planTable td:nth-child(2),.planTable td:nth-child(3){font-weight:800}@media(max-width:680px){.lockedNotice{align-items:flex-start;flex-direction:column}.planCards{grid-template-columns:1fr}.planCard{border-radius:18px}}
    `}</style>
  </main>;
}
