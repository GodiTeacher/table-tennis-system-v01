import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type PublicTeam={name:string;short_name:string|null;logo_data_url:string|null;brand_color:string|null;tagline:string|null;public_modules:Record<string,boolean>|null};
type Section={title:string;items:string[]};
const CONTENT:Record<string,{title:string;eyebrow:string;intro:string;sections:Section[]}>= {
  standards:{title:'球隊規範',eyebrow:'TEAM STANDARDS',intro:'家長版重點整理；實際執行仍以教練最新公告與校方規定為準。',sections:[
    {title:'訓練與紀律',items:['尊重教練、隊友、裁判與對手，訓練及比賽遵守規則。','按時參加訓練；請假請儘早通知教練，方便安排桌次與訓練內容。','球隊採月費制，學生個人請假原則上不另行補課；重大傷病或特殊原因可另行討論退費或調整。']},
    {title:'比賽與接送',items:['外出比賽接送由教練統一協調安排，不由學生或家長指定車輛。','自行接送、提早離場或其他需求請事先告知教練。','比賽期間依教練指示集合、移動與報備。']},
    {title:'器材與場地',items:['個人球拍與用品請妥善保管，損壞或脫膠主動告知教練。','公用球桌、球網、擋板與訓練器材使用後依規定歸位。','訓練結束後完成撿球、環境整理與個人物品確認。']},
    {title:'家長配合',items:['留意球隊群組通知，包括訓練異動、比賽、器材與收費資訊。','若有課業、接送或其他固定需求，可提前與教練討論。']},
  ]},
  rubber_guide:{title:'球皮介紹',eyebrow:'RUBBER GUIDE',intro:'先看打法、控制、旋轉與重量，再決定球皮，不建議只追求高速度。',sections:[
    {title:'常見類型',items:['反膠：主流配置，適合弧圈、快攻與全面型打法。','短顆：出球直接、節奏快，常見於近台快攻。','長顆：變化與防守特色明顯，需要專門訓練。','生膠：球質下沉、節奏快，適合已具穩定基本動作的選手。']},
    {title:'兒童選擇原則',items:['先確保整拍重量拿得住、動作做得完整，再追求高硬度與高速度。','同一張球皮放在不同球板、不同選手身上，結果可能差很多。']},
  ]},
  blade_guide:{title:'球板介紹',eyebrow:'BLADE GUIDE',intro:'球板影響整體手感、速度、甜區與支撐，選擇時要一起看學生動作完整度與整拍重量。',sections:[
    {title:'常見結構',items:['五夾純木：手感清楚、控制自然，常見於入門與培育階段。','七夾純木：支撐與速度通常更高，適合主動進攻。','內置纖維：纖維靠近芯材，保留較多木質手感。','外置纖維：纖維靠近表層，出球較直接、甜區與支撐感明顯。']},
    {title:'選擇順序',items:['先看學生動作完整度，再看整拍重量、球板結構與速度，最後搭配正反手球皮。','兒童選手不要只看職業選手器材型號。']},
  ]},
  career_guide:{title:'桌球職涯',eyebrow:'TABLE TENNIS PATH',intro:'桌球不只有比賽成績，也包含校隊、升學、教練、裁判與運動相關發展。',sections:[
    {title:'學生階段',items:['建立基本動作、比賽經驗與穩定訓練習慣。','依能力與興趣逐步參與校內、縣市與全國性賽事。']},
    {title:'升學與延伸',items:['可依個人競技成績、學業與目標評估體育班、校隊或一般升學路線。','未來也可延伸至教練、裁判、運動管理、器材與相關產業。']},
  ]},
  service_rules:{title:'球皮／球板代工規則',eyebrow:'EQUIPMENT SERVICE',intro:'需要更換球皮、球板或護邊時，請先與教練確認規格與施工時間。',sections:[
    {title:'教練協助訂購',items:['由教練協助訂購的球皮／球板，可免費協助球皮黏貼與裁切。','如後續發生脫膠，可免費協助重新黏貼；球皮、球板與護邊屬消耗品。']},
    {title:'自行購買器材',items:['如需教練協助更換、黏貼或裁切，依球隊當期公告費用收取。','自行購買器材請先確認規格與品質是否適合施工。']},
  ]},
};

export default async function PublicInfoPage({params}:{params:Promise<{slug:string;module:string}>}){
  const {slug,module}=await params;const config=CONTENT[module];if(!config)notFound();
  const supabase=await createClient();const {data:rows}=await supabase.rpc('get_public_team',{target_slug:slug});const team=(rows?.[0] as PublicTeam|undefined);if(!team||team.public_modules?.[module]===false)notFound();
  const brand=team.brand_color||'#7c3aed';
  return <main className="publicInfo" style={{'--brand':brand} as React.CSSProperties}>
    <header><div className="brandLine">{team.logo_data_url?<img src={team.logo_data_url} alt="Logo"/>:<span>🏓</span>}<b>{team.short_name||team.name}</b></div><div className="eyebrow">{config.eyebrow}</div><h1>{config.title}</h1><p>{config.intro}</p><Link href={`/p/${slug}`}>← 返回家長首頁</Link></header>
    <section className="infoBody">{config.sections.map((s,i)=><article key={s.title}><div className="number">{String(i+1).padStart(2,'0')}</div><div><h2>{s.title}</h2><ul>{s.items.map(x=><li key={x}>{x}</li>)}</ul></div></article>)}</section>
    <style>{`.publicInfo{min-height:100vh;background:linear-gradient(180deg,#faf7ff,#f6fbfb);color:#172235;padding-bottom:70px}.publicInfo header{background:linear-gradient(135deg,var(--brand),#ec4899 54%,#16b8aa);color:#fff;padding:34px max(20px,calc((100vw - 850px)/2)) 50px}.brandLine{display:flex;align-items:center;gap:10px;margin-bottom:22px}.brandLine img,.brandLine>span{width:42px;height:42px;border-radius:13px;background:#fff;object-fit:contain;display:grid;place-items:center}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.12em;opacity:.9}.publicInfo h1{font-size:34px;margin:6px 0 8px}.publicInfo header p{max-width:650px;line-height:1.7;opacity:.92}.publicInfo header a{display:inline-block;margin-top:10px;color:#fff;font-weight:800}.infoBody{max-width:850px;margin:-24px auto 0;padding:0 16px;display:grid;gap:12px}.infoBody article{background:#fff;border:1px solid #e6e2ef;border-radius:22px;padding:18px;display:grid;grid-template-columns:42px 1fr;gap:14px;box-shadow:0 8px 24px #6d5da00e}.number{width:38px;height:38px;border-radius:13px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:900}.infoBody h2{font-size:19px;margin:5px 0 10px}.infoBody ul{margin:0;padding-left:20px;color:#647184;line-height:1.8}@media(max-width:600px){.publicInfo h1{font-size:28px}.infoBody article{grid-template-columns:36px 1fr;padding:15px}.number{width:34px;height:34px}}`}</style>
  </main>;
}
