import Link from 'next/link';

const STAGES = [
  {no:'01',title:'國小｜建立基本能力與比賽經驗',age:'約 6–12 歲',focus:['基本動作與協調','發球／接發球習慣','固定訓練出席','第一次縣市／全國賽經驗'],coach:'先看動作品質、學習速度、抗壓與訓練態度，不急著用短期名次定義孩子。',parent:'先建立規律作息、交通與訓練支持；注意學業與運動的平衡。'},
  {no:'02',title:'國中｜開始分流：競技深化或長期培養',age:'約 12–15 歲',focus:['技術完整度','體能與腳步','固定戰術框架','選拔／升學賽事'],coach:'觀察孩子是否能承受更高訓練量、是否有清楚打法，以及自主訓練能力。',parent:'升學不是只有「體育班／非體育班」二選一，應一起評估學校訓練環境、教練、學業與生活。'},
  {no:'03',title:'高中｜競技成績與升學選擇變得更明確',age:'約 15–18 歲',focus:['專項體能','高強度對抗','大賽穩定度','升學與生涯盤點'],coach:'協助建立比賽週期、影片分析、心理調節與自主規劃，而不是只加訓練量。',parent:'把大學、教練工作、體育相關科系與一般科系都放進討論，保留多條出口。'},
  {no:'04',title:'大專｜高水平競技＋專業能力',age:'約 18–22+ 歲',focus:['大專賽事','球隊／代表隊','教練與裁判資格','運動科學／教育／管理能力'],coach:'鼓勵選手開始累積第二專長，例如教學、數據分析、體能、裁判、賽事管理。',parent:'大專階段除了成績，也要看能否累積證照、實習、人脈與工作技能。'},
  {no:'05',title:'成人競技｜國家隊、企業、職業與俱樂部',age:'成人',focus:['國內排名與代表隊','企業／俱樂部','國際賽事','海外聯賽'],coach:'只有極少數選手會以頂尖職業競技作為主要收入，因此要同步建立可延伸的專業能力。',parent:'把「打球」理解為一個產業，不只等於職業選手。'},
] as const;

const PATHS = [
  {icon:'🏓',title:'競技選手',desc:'持續參加國內外賽事、排名賽、國家隊／培訓隊、企業或俱樂部。',skills:'技術、體能、心理、賽事管理、自我恢復'},
  {icon:'🧑‍🏫',title:'桌球教練',desc:'學校球隊、俱樂部、私人教練、培訓中心、國家／代表隊教練。',skills:'教學設計、溝通、兒童發展、運動科學、證照'},
  {icon:'🧑‍⚖️',title:'裁判／競賽工作',desc:'從國內裁判、賽事執法，到國際裁判與競賽行政。',skills:'規則、臨場判斷、語言、賽事流程'},
  {icon:'📊',title:'運動科學／數據分析',desc:'體能、動作分析、影像分析、數據、恢復與訓練監控。',skills:'體育科學、統計、科技工具、分析表達'},
  {icon:'🎓',title:'體育教育／學校工作',desc:'體育教師、學校教練、運動社團與校隊行政。',skills:'教育專業、教學、班級經營、行政協調'},
  {icon:'🛠️',title:'器材／球館／桌球產業',desc:'器材銷售、黏拍服務、球館經營、品牌、賽事企劃、內容與媒體。',skills:'器材知識、服務、行銷、管理、商業能力'},
] as const;

const CHECKPOINTS = [
  ['技術','正反手是否穩定？是否有清楚的得分模式？'],
  ['比賽','面對不同對手、落後比分與關鍵分時是否能調整？'],
  ['體能','能否承受目前訓練量？是否反覆因疲勞失去動作品質？'],
  ['心理','失誤後恢復速度、競爭動機與長期投入意願如何？'],
  ['學業／生活','睡眠、作業、家庭交通與訓練時間是否能長期維持？'],
  ['自主性','會不會自己熱身、整理器材、記錄問題、主動練習？'],
] as const;

export default function CareerGuidePage(){
  return <main className="shell careerGuide">
    <section className="hero compactHero"><div className="eyebrow">TABLE TENNIS CAREER</div><h1>桌球職涯介紹</h1><p>桌球不是只有「當職業選手」一條路。從國小開始，可以一路延伸到升學、競技、教練、裁判、運動科學、教育、球館與器材產業。</p><div className="topNav"><Link href="/more">返回更多</Link><Link href="/blade-guide">球板介紹</Link><Link href="/rubber-guide">球皮介紹</Link></div></section>

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>從國小到成人的發展路線</h2></div><strong>不是單一路徑</strong></div>
      <div className="careerTimeline">{STAGES.map(stage=><article key={stage.no}><div className="careerDot">{stage.no}</div><div className="careerStage"><div className="careerStageHead"><h3>{stage.title}</h3><span>{stage.age}</span></div><div className="careerFocus">{stage.focus.map(item=><span key={item}>{item}</span>)}</div><div className="careerNotes"><p><b>教練看什麼：</b>{stage.coach}</p><p><b>家長要知道：</b>{stage.parent}</p></div></div></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>桌球可以發展成哪些工作？</h2></div><strong>{PATHS.length} 個方向</strong></div>
      <div className="careerPathGrid">{PATHS.map(path=><article key={path.title}><div className="careerIcon">{path.icon}</div><h3>{path.title}</h3><p>{path.desc}</p><small><b>需要累積：</b>{path.skills}</small></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>台灣常見競技／升學節點</h2></div></div>
      <div className="careerRoute"><div><b>國小</b><span>校內／縣市賽</span><span>總統盃國小組等全國賽</span></div><i>→</i><div><b>國中／高中</b><span>校隊／體育班或一般班</span><span>自由盃、中學賽事等</span></div><i>→</i><div><b>大專</b><span>大專球隊／競賽</span><span>科系＋第二專長</span></div><i>→</i><div><b>成人</b><span>全國錦標賽／排名賽</span><span>代表隊／企業／俱樂部</span></div></div>
      <div className="notice"><b>重要：</b>實際招生、升學資格、體育績優與比賽制度每年可能調整。這一頁先提供「路線圖」，遇到實際升學年度時再查當年度簡章與協會公告。</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>教練幫學生做生涯判斷時，可以看什麼？</h2></div></div>
      <div className="checkpointGrid">{CHECKPOINTS.map(([name,desc])=><div key={name}><b>{name}</b><p>{desc}</p></div>)}</div>
      <div className="careerDecision"><div><strong>不是：</strong><span>現在排名高 → 一定要走職業</span></div><div><strong>而是：</strong><span>能力＋意願＋家庭條件＋學業＋身體發展＋長期機會一起看</span></div></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>如果未來不當選手，桌球經驗還有價值嗎？</h2></div></div>
      <div className="transferGrid"><div><b>教學能力</b><p>把動作拆解、觀察錯誤、設計訓練。</p></div><div><b>競爭與心理</b><p>面對壓力、輸贏、失誤與長期目標。</p></div><div><b>團隊合作</b><p>和教練、隊友、家長、學校溝通。</p></div><div><b>自我管理</b><p>時間、器材、身體與訓練紀錄。</p></div></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>06</span><h2>教練／裁判證照也是一條路</h2></div></div>
      <p className="muted">中華民國桌球協會持續辦理 C、B、A 級教練與裁判講習、檢定及增能研習。對大專以上或準備投入教學、球館、學校球隊的人來說，這是很實際的專業累積。</p><div className="topNav"><a href="https://www.cttta.org.tw/news.asp?type=4" target="_blank" rel="noreferrer">桌球協會教練／裁判公告</a></div>
    </section>

    <style>{`.careerTimeline{display:grid;gap:14px}.careerTimeline>article{display:grid;grid-template-columns:54px 1fr;gap:14px;position:relative}.careerTimeline>article:not(:last-child):before{content:'';position:absolute;left:26px;top:48px;bottom:-18px;width:2px;background:#d9e5e1}.careerDot{width:52px;height:52px;border-radius:18px;background:linear-gradient(135deg,var(--theme-primary,#2f7e79),var(--theme-accent,#f3b64b));color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;z-index:1}.careerStage{border:1px solid #e0e6ec;border-radius:18px;padding:15px;background:#fff}.careerStageHead{display:flex;justify-content:space-between;gap:12px;align-items:center}.careerStageHead h3{margin:0}.careerStageHead span{font-size:12px;font-weight:900;color:var(--theme-primary,#2f7e79);background:var(--theme-soft,#eef5f3);padding:6px 9px;border-radius:999px}.careerFocus{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.careerFocus span{font-size:12px;padding:6px 8px;border-radius:999px;background:#f4f7f8;color:#536274;font-weight:800}.careerNotes{display:grid;grid-template-columns:1fr 1fr;gap:10px}.careerNotes p{margin:0;padding:11px;border-radius:12px;background:#f8fafb;color:#5f6c7e;line-height:1.6}.careerPathGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.careerPathGrid article{padding:16px;border:1px solid #e0e6ec;border-radius:17px;background:#fff}.careerIcon{font-size:30px}.careerPathGrid h3{margin:8px 0}.careerPathGrid p,.careerPathGrid small{color:#667386;line-height:1.6}.careerPathGrid small{display:block}.careerRoute{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;gap:9px;align-items:center;margin-bottom:14px}.careerRoute>div{min-height:130px;padding:14px;border-radius:16px;background:linear-gradient(145deg,var(--theme-soft,#edf5f2),#fff);border:1px solid #dde7e3}.careerRoute b,.careerRoute span{display:block}.careerRoute b{font-size:17px;margin-bottom:8px}.careerRoute span{font-size:12px;color:#607084;line-height:1.6}.careerRoute i{font-style:normal;font-size:24px;color:var(--theme-primary,#2f7e79)}.checkpointGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.checkpointGrid>div{padding:14px;border:1px solid #e0e6ec;border-radius:15px}.checkpointGrid p{margin:7px 0 0;color:#657386;line-height:1.6}.careerDecision{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.careerDecision>div{padding:14px;border-radius:15px;background:#f8faf9}.careerDecision strong,.careerDecision span{display:block}.careerDecision strong{margin-bottom:5px}.transferGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.transferGrid>div{padding:14px;border-radius:16px;background:var(--theme-soft,#f3f6f8)}.transferGrid p{margin:7px 0 0;color:#5f6f80;line-height:1.55}@media(max-width:900px){.careerPathGrid,.checkpointGrid{grid-template-columns:repeat(2,1fr)}.careerRoute{grid-template-columns:1fr}.careerRoute i{transform:rotate(90deg);justify-self:center}.transferGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.careerTimeline>article{grid-template-columns:42px 1fr;gap:9px}.careerDot{width:42px;height:42px;border-radius:14px}.careerTimeline>article:not(:last-child):before{left:20px;top:40px}.careerStageHead,.careerNotes{grid-template-columns:1fr;display:grid}.careerPathGrid,.checkpointGrid,.careerDecision,.transferGrid{grid-template-columns:1fr}}`}</style>
  </main>;
}
