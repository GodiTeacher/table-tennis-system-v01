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

const LEAVE_RULES = [
  {title:'請假原則',items:['原則上應於訓練日前一日完成請假通知，讓教練能調整桌次、人數與訓練內容。','臨時身體不適或其他突發狀況，應盡快通知教練。']},
  {title:'補課原則',items:['有提前請假者，可依球隊可安排的時段協調補課。','未提前通知而缺席者，原則上不安排補課；特殊狀況由教練依實際情形處理。','補課屬訓練時數安排，不等同現金退費；若涉及退費，仍依「收費與退費規範」處理。']},
];

const EQUIPMENT_RULES = [
  {title:'個人球拍與球皮',items:['學生應妥善保管自己的球拍、球套與相關器材；如有異常、脫膠或損壞應主動告知教練。','球皮、球板與護邊屬消耗或使用器材，實際更換與代工費用依「球皮／球板代工規則」及當期公告辦理。']},
  {title:'球隊公用器材',items:['球、球網、擋板、球桌及訓練器材使用後應歸位，不得故意摔、踢、丟或以非正常方式使用。','發現器材損壞、缺件或有安全疑慮時，應立即停止使用並回報教練。']},
  {title:'器材更換與代購',items:['需要更換球皮、球板或其他器材時，應先與教練確認規格與施工時間，避免影響正常訓練。','教練代購與自行購買後請教練施工，依不同服務方式計費；詳細內容以 App「代工規則」為準。']},
];

const TRANSPORT_RULES = [
  {title:'接送登記',items:['外出比賽接送原則上應事前確認日期、去程／回程及搭乘安排，避免出發當日臨時變更。','學生應搭乘教練或家長安排的指定車輛；若需更換接送方式，家長或學生須先通知帶隊教練。']},
  {title:'乘車與安全',items:['上、下車及集合均依教練指示進行，不得擅自離隊或自行改搭其他車輛。','乘車期間應遵守交通安全與車內秩序，不影響駕駛。']},
  {title:'車資紀錄',items:['如有每位學生分攤車資，依實際接送紀錄計算並於系統登記應付、已付與未付狀態。','接送或車資有異動時，應同步更新紀錄，避免家長與教練資訊不一致。']},
];

const PARENT_RULES = [
  {title:'聯繫與通知',items:['家長應留意球隊群組或教練通知，包括訓練異動、比賽、收費、器材及接送資訊。','學生請假、接送異動或特殊狀況，請由家長或學生儘早告知教練。']},
  {title:'訓練與學習配合',items:['訓練期間請尊重教練的分組、訓練內容與比賽安排；如有疑問可在適當時間與教練討論。','如學生有作業、課業或其他固定需求，家長可事先與教練確認安排方式。']},
  {title:'費用與器材',items:['收到收費通知後，請依公告方式繳費並保留必要紀錄；若有退費或金額疑問可直接向教練確認。','器材購買、更換與代工屬額外項目，依當期器材報價及代工規則辦理。']},
];

const REWARD_RULES = [
  {title:'獎勵方向',items:['可依訓練態度、準時到課、技術進步、比賽表現、協助隊友、環境整理等表現給予點數或其他獎勵。','點數兌換內容、門檻與活動期間，由教練依當期公告執行。']},
  {title:'提醒與處理',items:['違反球隊規範時，先依情節進行口頭提醒、紀錄或與家長溝通；重複違規可提高處理層級。','涉及安全、霸凌、嚴重不尊重、擅自離隊或其他重大事件時，可依校規及球隊管理需要直接進一步處理。']},
  {title:'原則',items:['獎懲目的以建立責任感、團隊合作與正確訓練習慣為主，不以羞辱或公開比較學生為手段。']},
];

const VENUE_RULES = [
  {title:'訓練前',items:['進入場地後依教練安排放置書包、球拍及個人物品，保持走道與球桌周邊安全。','球桌、球網、擋板及訓練器材由教練或指定學生依需要設置。']},
  {title:'訓練中',items:['不得在非訓練區域追逐、亂丟球拍或以器材玩耍；發現地面濕滑或設備異常應立即回報。','共用場地時應尊重其他班級、社團或使用者，不占用未經允許的區域。']},
  {title:'訓練後與清潔',items:['訓練結束後完成撿球、桌面與地面整理，球網、擋板與器材依指定位置歸位。','垃圾、飲料與個人物品自行帶走；離開前由教練或指定學生確認場地恢復整潔。']},
];

function RuleGroup({title,items}:{title:string;items:string[]}){
  return <article className="ruleGroup"><h3>{title}</h3><ol>{items.map((item,index)=><li key={index}>{item}</li>)}</ol></article>;
}

const CATEGORIES = [
  ['team','隊員基本規範','品行、紀律、團隊合作、訓練、器材與自我提升'],
  ['competition','外出比賽規定','手機、交流、加油、清潔、報備、團體行動與出賽單'],
  ['payment','收費與退費規範','收費、退費、收費袋、電子紀錄、保存與核對'],
  ['leave','請假／補課規範','請假通知、臨時缺席、補課與退費分流'],
  ['equipment','器材與球拍管理','個人球拍、公用器材、更換、代購與施工'],
  ['transport','比賽接送規範','接送登記、乘車安全、變更與車資紀錄'],
  ['parents','家長配合事項','通知、課業與訓練、收費、器材與溝通'],
  ['reward','獎懲與點數制度','訓練態度、進步、點數獎勵與違規處理原則'],
  ['venue','訓練場地與清潔','場地安全、共用規範、器材歸位與清潔'],
] as const;

export default function TeamStandardsPage(){
  return <main className="shell teamStandards">
    <section className="hero compactHero">
      <div className="eyebrow">TEAM STANDARDS</div><h1>球隊規範</h1>
      <p>把隊員日常、比賽、收退費、請假補課、器材、接送、家長配合、獎懲與場地管理集中在同一個入口。</p>
      <div className="topNav"><Link href="/more">返回更多</Link>{CATEGORIES.map(([id,title])=><a href={`#${id}`} key={id}>{title}</a>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>規範分類</h2></div><strong>{CATEGORIES.length} 大類</strong></div>
      <div className="standardsGrid">{CATEGORIES.map(([id,title,desc],index)=><a href={`#${id}`} key={id}><b>{String(index+1).padStart(2,'0')}｜{title}</b><span>{desc}</span></a>)}</div>
      <div className="notice" style={{marginTop:14}}><b>架構原則：</b>前三類依既有正式文件整理；第 4～9 類先依目前球隊實際管理方式建立 V0.1 管理草案，之後可逐條修成正式規範。</div>
    </section>

    <section className="card" id="team"><div className="sectionTitle"><div><span>02</span><h2>隊員基本規範</h2></div><strong>正式｜原隊規 v0.1</strong></div><p className="muted">適用於所有桌球隊隊員、教練及相關工作人員。</p><div className="ruleGrid">{TEAM_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div><div className="notice"><b>附則：</b>規定自頒布日起生效；如需修改，依原文件由隊伍管理層討論並取得多數隊員同意；最終解釋權歸桌球隊管理層。</div></section>

    <section className="card" id="competition"><div className="sectionTitle"><div><span>03</span><h2>外出比賽規定</h2></div><strong>正式｜v0.1 2024-10-17</strong></div><p className="muted">目的：確保學生外出比賽期間遵守紀律並維護團隊形象。</p><div className="ruleGrid">{COMPETITION_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div><div className="notice"><b>附則：</b>經學校核准後施行；未盡事宜依相關校規處理。</div></section>

    <section className="card" id="payment"><div className="sectionTitle"><div><span>04</span><h2>收費與退費規範</h2></div><strong>正式｜v0.1 2024-09-04</strong></div><p className="muted">目的：保障教練與學生雙方在收費及退費過程中的權益，確保操作透明與公平。</p><div className="ruleGrid">{PAYMENT_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div><div className="notice"><b>附則：</b>規範自公告日起施行；最終解釋權歸桌球隊管理層。</div></section>

    <section className="card draftRule" id="leave"><div className="sectionTitle"><div><span>05</span><h2>請假／補課規範</h2></div><strong>V0.1 管理草案</strong></div><div className="ruleGrid">{LEAVE_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div></section>
    <section className="card draftRule" id="equipment"><div className="sectionTitle"><div><span>06</span><h2>器材與球拍管理</h2></div><strong>V0.1 管理草案</strong></div><div className="ruleGrid">{EQUIPMENT_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div><div className="topNav" style={{marginTop:12}}><Link href="/service-rules">查看球皮／球板代工規則</Link><Link href="/rubber-catalog">球皮資料庫／庫存</Link></div></section>
    <section className="card draftRule" id="transport"><div className="sectionTitle"><div><span>07</span><h2>比賽接送規範</h2></div><strong>V0.1 管理草案</strong></div><div className="ruleGrid">{TRANSPORT_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div><div className="topNav" style={{marginTop:12}}><Link href="/competitions">前往比賽／接送管理</Link></div></section>
    <section className="card draftRule" id="parents"><div className="sectionTitle"><div><span>08</span><h2>家長配合事項</h2></div><strong>V0.1 管理草案</strong></div><div className="ruleGrid">{PARENT_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div></section>
    <section className="card draftRule" id="reward"><div className="sectionTitle"><div><span>09</span><h2>獎懲與點數制度</h2></div><strong>V0.1 管理草案</strong></div><div className="ruleGrid">{REWARD_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div><div className="notice"><b>點數值先不寫死：</b>實際加點、扣點、兌換門檻與獎品仍以教練當期公告為準，避免制度調整後需要改整份規範。</div></section>
    <section className="card draftRule" id="venue"><div className="sectionTitle"><div><span>10</span><h2>訓練場地與清潔</h2></div><strong>V0.1 管理草案</strong></div><div className="ruleGrid">{VENUE_RULES.map(group=><RuleGroup key={group.title} {...group}/>)}</div></section>

    <section className="card"><div className="sectionTitle"><div><span>11</span><h2>規範維護方式</h2></div></div><div className="notice"><b>建議：</b>正式核定的規範保留版本號與日期；日常管理草案可以先在 App 修正，內容成熟後再轉為正式版本。這樣「球隊規範」可以一直擴充，不需要每新增一條規定就另外做一個頁面。</div></section>

    <style>{`.teamStandards{scroll-behavior:smooth}.standardsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.standardsGrid a{padding:17px;border:1px solid #dfe5ea;border-radius:17px;background:#fff;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:7px}.standardsGrid b{font-size:15px}.standardsGrid span{color:#687586;line-height:1.55;font-size:13px}.ruleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ruleGroup{border:1px solid #e0e6eb;border-radius:16px;padding:15px;background:#fff}.ruleGroup h3{margin:0 0 10px;font-size:16px}.ruleGroup ol{margin:0;padding-left:22px}.ruleGroup li{margin:7px 0;color:#5f6e80;line-height:1.65}.draftRule{border-top:3px solid color-mix(in srgb,var(--theme-accent,#718096) 48%,white)}@media(max-width:900px){.standardsGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.standardsGrid,.ruleGrid{grid-template-columns:1fr}.teamStandards .topNav{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}.teamStandards .topNav a{white-space:nowrap}}`}</style>
  </main>;
}
