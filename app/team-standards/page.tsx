import Link from 'next/link';

const TEAM_RULES = [
  {title:'總則',items:['本規定旨在確保桌球隊的運營規範化，增強隊伍凝聚力，促進隊員全面發展，並提高整體競技水平。','適用於所有桌球隊隊員、教練及相關工作人員。']},
  {title:'品行與紀律',items:['尊重隊友、教練、裁判及對手，不得有侮辱性言語或行為，並保持良好體育道德。','訓練與比賽中遵守規則、誠實守信，不得作弊。','按時參加訓練與比賽；如需請假，應提前通知教練並獲得批准。']},
  {title:'團隊合作',items:['積極參與隊伍活動，互相支持與幫助，個人利益不得凌駕於團隊利益之上。','尊重教練指導與安排，積極參與訓練計畫；比賽中依戰術安排執行，不得擅自行動。']},
  {title:'訓練與比賽',items:['保持積極進取態度，以正面態度面對挑戰與挫折。','遵守訓練與比賽時間，按時到場並於開始前完成運動裝備與器材準備。']},
  {title:'設備與設施',items:['愛護訓練及比賽設備，使用後依規定歸位；如有損壞應立即報告教練。']},
  {title:'自我提升',items:['積極參加隊內或隊外技術培訓，持續提升球技與心理素質。']},
];

const COMPETITION_RULES = [
  {title:'手機使用',items:['外出比賽期間，不得在比賽或非休息時間使用手機。','手機僅可於休息時間用於合理用途，如聯絡或學習，禁止用於娛樂玩耍。']},
  {title:'交流規範',items:['比賽期間不得與其他學校進行非正式玩樂活動。','休息時間可合理交流，但不得影響比賽秩序及團隊形象。']},
  {title:'團隊支援與加油',items:['應積極參與加油助威，尤其同校隊員比賽時。','若有多支隊伍參賽，應優先為同組或同隊成員加油。','違反團隊合作原則或脫隊者，將視情節予以處理。']},
  {title:'環境清潔',items:['保持比賽場地及休息區清潔，並負責清理自身及團隊使用場所。']},
  {title:'報備與團體行動',items:['無論外出至何地，均應事先向帶隊老師或領隊報備。','未經許可不得擅自行動；外出比賽以團體行動為原則，不得脫離隊伍從事個人行動。']},
  {title:'出賽單',items:['出賽單原則上由教練填寫。','經教練同意可由學生填寫，但仍須經教練確認。']},
  {title:'違規處理',items:['違反外出比賽規定者，將依情節輕重給予警告、懲罰或其他相應措施。']},
];

const PAYMENT_RULES = [
  {title:'退費紀錄',items:['所有退費須在電子檔案詳細記錄，包括退費註記、金額、對象、日期及項目。','退費時應拍攝學生手持退費袋照片，作為完成證明，並妥善保存。']},
  {title:'收費方式',items:['學生應親自將費用交予教練；若使用信封袋收費，信封袋需一併繳回。','轉帳或現金（無收費袋）需在電子記事本記錄繳費人、金額、時間及項目。']},
  {title:'收費袋管理',items:['使用收費袋繳費時，教練須在紙本及電子檔案中記錄，註記收費袋已收費，並及時通知家長。']},
  {title:'紀錄保存',items:['收費袋及相關紙本紀錄至少保存一學期。','涉及收費與退費的電子檔案及電子記事本紀錄至少保存一學期。']},
  {title:'保密與核對',items:['學生收費與退費紀錄應妥善保管，避免個資洩露。','教練應每月核對收費與退費紀錄，確保準確與完整，並依規定提交報告。','規範要求定期內部審計或由外部審計機構檢查。']},
];

function RuleGroup({title,items}:{title:string;items:string[]}){
  return <article className="ruleGroup"><h3>{title}</h3><ol>{items.map((item,index)=><li key={index}>{item}</li>)}</ol></article>;
}

export default function TeamStandardsPage(){
  return <main className="shell teamStandards">
    <section className="hero compactHero">
      <div className="eyebrow">TEAM STANDARDS</div><h1>球隊規範</h1>
      <p>把隊員日常、外出比賽、收費退費等不同規章集中管理；每一類仍保留各自用途與內容。</p>
      <div className="topNav"><Link href="/more">返回更多</Link><a href="#team">隊員基本規範</a><a href="#competition">外出比賽</a><a href="#payment">收費與退費</a></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>規範分類</h2></div><strong>3 大類</strong></div>
      <div className="standardsGrid">
        <a href="#team"><b>隊員基本規範</b><span>品行、紀律、團隊合作、訓練、器材與自我提升</span></a>
        <a href="#competition"><b>外出比賽規定</b><span>手機、交流、加油、清潔、報備、團體行動與出賽單</span></a>
        <a href="#payment"><b>收費與退費規範</b><span>收費、退費、收費袋、電子紀錄、保存與核對</span></a>
      </div>
      <div className="notice" style={{marginTop:14}}><b>架構原則：</b>「球隊規範」是總入口；未來若新增請假、器材、接送、家長配合事項等，可以直接再加成第 4、5 類，不需要把所有內容擠進同一份隊規。</div>
    </section>

    <section className="card" id="team"><div className="sectionTitle"><div><span>02</span><h2>隊員基本規範</h2></div><strong>原隊規 v0.1</strong></div>
      <p className="muted">適用於所有桌球隊隊員、教練及相關工作人員。</p><div className="ruleGrid">{TEAM_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div>
      <div className="notice"><b>附則：</b>規定自頒布日起生效；如需修改，依原文件由隊伍管理層討論並取得多數隊員同意；最終解釋權歸桌球隊管理層。</div>
    </section>

    <section className="card" id="competition"><div className="sectionTitle"><div><span>03</span><h2>外出比賽規定</h2></div><strong>v0.1｜2024-10-17</strong></div>
      <p className="muted">目的：確保學生外出比賽期間遵守紀律並維護團隊形象。</p><div className="ruleGrid">{COMPETITION_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div>
      <div className="notice"><b>附則：</b>經學校核准後施行；未盡事宜依相關校規處理。</div>
    </section>

    <section className="card" id="payment"><div className="sectionTitle"><div><span>04</span><h2>收費與退費規範</h2></div><strong>v0.1｜2024-09-04</strong></div>
      <p className="muted">目的：保障教練與學生雙方在收費及退費過程中的權益，確保操作透明與公平。</p><div className="ruleGrid">{PAYMENT_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div>
      <div className="notice"><b>附則：</b>規範自公告日起施行；最終解釋權歸桌球隊管理層。</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>後續可再加入</h2></div></div>
      <div className="futureRules"><span>請假／補課規範</span><span>器材與球拍管理</span><span>比賽接送規範</span><span>家長配合事項</span><span>獎懲與點數制度</span><span>訓練場地與清潔</span></div>
      <p className="muted" style={{marginTop:12}}>這些目前沒有從你上傳的三份文件自行補規定；之後有正式版本再逐項導入。</p>
    </section>

    <style>{`.teamStandards{scroll-behavior:smooth}.standardsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.standardsGrid a{padding:17px;border:1px solid #dfe5ea;border-radius:17px;background:#fff;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:7px}.standardsGrid b{font-size:16px}.standardsGrid span{color:#687586;line-height:1.55;font-size:13px}.ruleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ruleGroup{border:1px solid #e0e6eb;border-radius:16px;padding:15px;background:#fff}.ruleGroup h3{margin:0 0 10px;font-size:16px}.ruleGroup ol{margin:0;padding-left:22px}.ruleGroup li{margin:7px 0;color:#5f6e80;line-height:1.65}.futureRules{display:flex;gap:8px;flex-wrap:wrap}.futureRules span{padding:8px 11px;border-radius:999px;background:var(--theme-soft,#f3f6f8);color:var(--theme-primary,#273444);font-weight:800;font-size:12px}@media(max-width:760px){.standardsGrid,.ruleGrid{grid-template-columns:1fr}}`}</style>
  </main>;
}
