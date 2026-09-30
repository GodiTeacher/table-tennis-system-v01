import Link from 'next/link';

type Group={title:string;items:string[]};
const TEAM_RULES:Group[]=[
  {title:'總則',items:['確保桌球隊運作規範化、提升凝聚力與競技水準，並促進隊員全面發展。','適用於所有桌球隊隊員、教練及相關工作人員。']},
  {title:'品行與紀律',items:['尊重隊友、教練、裁判及對手，不得有侮辱性言語或行為。','訓練與比賽遵守規則、誠實守信。','按時參加訓練與比賽；如需請假應依球隊請假規範通知教練。']},
  {title:'團隊合作',items:['積極參與隊伍活動並互相支持，個人利益不得凌駕於團隊利益之上。','尊重教練指導與安排，比賽中依戰術執行，不得擅自行動。']},
  {title:'訓練與比賽',items:['保持積極進取態度，以正面態度面對挑戰與挫折。','遵守時間並於開始前完成裝備與器材準備。']},
  {title:'設備與設施',items:['愛護訓練與比賽設備，使用後依規定歸位；損壞應立即回報。']},
  {title:'自我提升',items:['持續參加技術訓練並提升球技與心理素質。']},
];
const COMPETITION_RULES:Group[]=[
  {title:'手機使用',items:['不得在比賽或非休息時間使用手機。','休息時間僅限合理用途，如聯絡或學習，不作娛樂玩耍。']},
  {title:'交流與團隊',items:['比賽期間不得與其他學校進行影響秩序的非正式玩樂。','應積極替同校隊員加油，並以團隊行動為原則。']},
  {title:'清潔與報備',items:['保持比賽場地及休息區清潔。','離開團隊活動範圍前須向帶隊老師或領隊報備，未經許可不得擅自行動。']},
  {title:'出賽單與違規',items:['出賽單原則由教練填寫；經同意可由學生協助，但須經教練確認。','違反規定依情節給予警告、懲罰或其他處理。']},
];
const PAYMENT_RULES:Group[]=[
  {title:'退費紀錄',items:['所有退費須記錄退費註記、金額、對象、日期及項目。','退費完成時依既有規範保留必要證明。']},
  {title:'收費方式',items:['學生依公告方式將費用交予教練；使用收費袋時信封袋一併繳回。','轉帳或無收費袋現金需留下繳費人、金額、時間及項目紀錄。']},
  {title:'保存與核對',items:['收費袋與相關紙本、電子紀錄至少保存一學期。','妥善保管學生個資，並定期核對收退費資料。']},
];
const LEAVE_RULES:Group[]=[
  {title:'月費制原則',items:['球隊採月費制，費用是保留固定訓練名額與整體訓練安排，學生個人請假原則上不另行補課。','請假仍請儘早通知教練，方便安排桌次、人數與訓練內容。']},
  {title:'特殊原因',items:['如因重大傷病、長期無法參訓或其他特殊原因，可由家長與教練另行討論退費或費用調整。','如涉及退費，須依「收費與退費規範」留下完整紀錄。']},
];
const EQUIPMENT_RULES:Group[]=[
  {title:'個人器材',items:['學生應妥善保管球拍、球套及個人物品；脫膠或損壞應主動告知教練。','球皮、球板與護邊費用依當期公告及代工規則辦理。']},
  {title:'公用器材',items:['球、球網、擋板、球桌及訓練器材使用後歸位，不得以非正常方式使用。','發現損壞或安全疑慮應立即停止使用並回報。']},
  {title:'更換與代購',items:['更換球皮、球板或其他器材前先與教練確認規格與施工時間。','詳細費用以 App「球皮／球板代工規則」為準。']},
];
const TRANSPORT_RULES:Group[]=[
  {title:'接送安排',items:['外出比賽的去程、回程與乘車位置由教練統一協調安排，不由學生或家長自行指定車輛。','家長若有自行接送、提早離場或其他需求，應事先告知教練，由教練納入整體安排。']},
  {title:'乘車與安全',items:['集合、上下車與換車均依教練指示，不得自行改搭其他車輛。','乘車期間遵守交通安全與車內秩序，不影響駕駛。']},
  {title:'車資紀錄',items:['如有車資分攤，依實際接送紀錄計算並登記應付、已付與未付狀態。','接送異動時同步更新紀錄。']},
];
const PARENT_RULES:Group[]=[
  {title:'聯繫與通知',items:['留意球隊群組與教練通知，包括訓練異動、比賽、收費、器材及接送資訊。','學生請假、接送異動或特殊狀況請儘早告知教練。']},
  {title:'訓練配合',items:['尊重教練的分組、訓練內容與比賽安排；有疑問可於適當時間討論。','學生有課業或其他固定需求，可事先與教練協調。']},
  {title:'費用與器材',items:['依公告方式繳費；退費或金額問題可直接與教練確認。','器材購買、更換與代工屬額外項目。']},
];
const REWARD_RULES:Group[]=[
  {title:'點數制度',items:['依訓練態度、準時到課、技術進步、比賽表現、協助隊友、環境整理等表現給予加點。','需要提醒或違反球隊規範時，也可依情節扣點並留下原因。','點數兌換內容與門檻依當期公告執行。']},
  {title:'處理原則',items:['重複違規可進行紀錄、家長溝通或提高處理層級。','涉及安全、霸凌、嚴重不尊重或擅自離隊等重大事件，依校規與球隊管理需要處理。']},
];
const VENUE_RULES:Group[]=[
  {title:'訓練前',items:['個人物品依指定位置擺放，保持走道與球桌周邊安全。','器材由教練或指定學生依需要設置。']},
  {title:'訓練中',items:['不得在非訓練區域追逐、亂丟球拍或以器材玩耍。','共用場地時尊重其他班級、社團或使用者。']},
  {title:'訓練後與清潔',items:['完成撿球、桌面與地面整理，器材依指定位置歸位。','垃圾、飲料與個人物品自行帶走。']},
];
const AIRCON_RULES:Group[]=[
  {title:'使用與紀錄',items:['冷氣依實際訓練需求與校方規範開啟。','每月依電表起訖度數結算，並記錄每度單價、固定費與應繳學校金額。']},
  {title:'時段與年級',items:['逐步記錄冷氣使用日期、時段、年級、度數與學生人數。','未來將與每日到課資料串接，用於計算各年級及每位學生應分攤的冷氣費。']},
];

const CATS=[
  ['team','隊員基本規範','品行、紀律、團隊合作、訓練與器材'],['competition','外出比賽規定','手機、交流、團隊、清潔與報備'],['payment','收費與退費規範','收費、退費、保存與核對'],['leave','請假／費用規範','月費制、不補課、特殊原因退費'],['equipment','器材與球拍管理','個人球拍、公用器材、更換與代工'],['transport','比賽接送規範','由教練統一協調車輛與接送'],['parent','家長配合事項','通知、課業、訓練與費用溝通'],['reward','獎懲與點數制度','加點、扣點、兌換與處理原則'],['venue','訓練場地與清潔','場地安全、共用規範與清潔'],['aircon','冷氣使用與費用','電表、月結、時段、年級與分攤'],
] as const;
function RuleGroup({title,items}:{title:string;items:string[]}){return <article className="ruleGroup"><h3>{title}</h3><ol>{items.map((x,i)=><li key={i}>{x}</li>)}</ol></article>}
function RuleSection({id,no,title,tag,groups,links}:{id:string;no:string;title:string;tag:string;groups:Group[];links?:React.ReactNode}){return <section className="card" id={id}><div className="sectionTitle"><div><span>{no}</span><h2>{title}</h2></div><strong>{tag}</strong></div><div className="ruleGrid">{groups.map(g=><RuleGroup key={g.title} {...g}/>)}</div>{links?<div className="topNav" style={{marginTop:12}}>{links}</div>:null}</section>}

export default function TeamStandardsPage(){return <main className="shell teamStandards">
  <section className="hero compactHero"><div className="eyebrow">TEAM STANDARDS</div><h1>球隊規範</h1><p>把隊員日常、比賽、收退費、器材、接送、點數、清潔與冷氣管理集中在同一個入口。</p><div className="topNav"><Link href="/more">返回更多</Link>{CATS.map(c=><a key={c[0]} href={`#${c[0]}`}>{c[1]}</a>)}</div></section>
  <section className="card"><div className="sectionTitle"><div><span>00</span><h2>規範分類</h2></div><strong>{CATS.length} 大類</strong></div><div className="standardsGrid">{CATS.map((c,i)=><a href={`#${c[0]}`} key={c[0]}><b>{String(i+1).padStart(2,'0')}｜{c[1]}</b><span>{c[2]}</span></a>)}</div><div className="notice" style={{marginTop:14}}><b>編號原則：</b>00 是總分類入口，正式規範從 01 開始依序排列。</div></section>
  <RuleSection id="team" no="01" title="隊員基本規範" tag="正式｜原隊規 v0.1" groups={TEAM_RULES}/>
  <RuleSection id="competition" no="02" title="外出比賽規定" tag="正式｜v0.1" groups={COMPETITION_RULES}/>
  <RuleSection id="payment" no="03" title="收費與退費規範" tag="正式｜v0.1" groups={PAYMENT_RULES}/>
  <RuleSection id="leave" no="04" title="請假／費用規範" tag="V0.1 管理草案" groups={LEAVE_RULES}/>
  <RuleSection id="equipment" no="05" title="器材與球拍管理" tag="V0.1 管理草案" groups={EQUIPMENT_RULES} links={<><Link href="/service-rules">代工規則</Link><Link href="/rubber-catalog">球皮資料庫</Link></>}/>
  <RuleSection id="transport" no="06" title="比賽接送規範" tag="V0.1 管理草案" groups={TRANSPORT_RULES} links={<Link href="/competitions">比賽／接送管理</Link>}/>
  <RuleSection id="parent" no="07" title="家長配合事項" tag="V0.1 管理草案" groups={PARENT_RULES}/>
  <RuleSection id="reward" no="08" title="獎懲與點數制度" tag="已開始執行" groups={REWARD_RULES} links={<Link href="/points">開啟點數紀錄</Link>}/>
  <RuleSection id="venue" no="09" title="訓練場地與清潔" tag="V0.1 管理草案" groups={VENUE_RULES}/>
  <RuleSection id="aircon" no="10" title="冷氣使用與費用" tag="V1 管理工具" groups={AIRCON_RULES} links={<Link href="/aircon">冷氣度數／費用管理</Link>}/>
  <style>{`.teamStandards{scroll-behavior:smooth}.standardsGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.standardsGrid a{padding:15px;border:1px solid #dfe5ea;border-radius:15px;background:#fff;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:6px}.standardsGrid span{color:#687586;line-height:1.5;font-size:13px}.ruleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ruleGroup{border:1px solid #e0e6eb;border-radius:16px;padding:15px;background:#fff}.ruleGroup h3{margin:0 0 10px}.ruleGroup ol{margin:0;padding-left:22px}.ruleGroup li{margin:7px 0;color:#5f6e80;line-height:1.65}@media(max-width:760px){.standardsGrid,.ruleGrid{grid-template-columns:1fr}.teamStandards .hero .topNav{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}.teamStandards .hero .topNav a{flex:0 0 auto}}`}</style>
</main>}
