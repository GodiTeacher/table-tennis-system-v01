import Link from 'next/link';

const RUBBER_TYPES = [
  { name: '反膠', tag: '最常見', icon: '◉', desc: '表面平滑、摩擦力高，容易製造旋轉，也是主流比賽配置。', good: '弧圈、快攻、全面型', note: '初學到高階都可使用，差異主要在海綿硬度與速度。' },
  { name: '短顆粒', tag: '速度直接', icon: '•••', desc: '顆粒朝外，出球快、旋轉受影響較小，擊球節奏直接。', good: '近台快攻、反手彈擊', note: '需要更主動撞擊，摩擦製造旋轉能力通常低於反膠。' },
  { name: '長顆粒', tag: '變化特殊', icon: '⋮⋮', desc: '顆粒較長，容易產生旋轉反轉與節奏變化。', good: '削球、防守、變化型', note: '需要專門訓練，不適合只看速度／旋轉數值挑選。' },
  { name: '生膠', tag: '低弧線', icon: '⁝', desc: '介於反膠與短顆之間，出球下沉、節奏快，手感較特殊。', good: '近台反手、快攻變化', note: '適合已有穩定基本動作、想追求特殊球質的選手。' },
];

const PARAMETERS = [
  ['速度', '海綿彈性與套膠整體出球效率；越快，借力與主動發力後的球速通常越高。'],
  ['旋轉', '膠面抓球能力與海綿吃球時間共同影響；高旋轉不等於每位選手都更好打。'],
  ['控制', '容錯、落點掌握與小力量手感。初學者通常比追求極限速度更需要控制。'],
  ['硬度', '偏硬通常支撐與上限高，偏軟較容易打透；同一硬度在不同品牌標示不可直接互比。'],
  ['厚度', '海綿越厚通常速度與力量上限越高；較薄則更容易控制、也常見於特殊顆粒配置。'],
  ['重量', '兩面高密度套膠會明顯增加整拍重量，兒童與小手選手尤其要注意。'],
];

const BRANDS = ['Butterfly','XIOM','Yasaka','Nittaku','DHS','Donic','Tibhar','Andro','Victas','Stiga'];

export default function RubberGuidePage(){
  return <main className="shell equipmentGuide">
    <section className="hero compactHero">
      <div className="eyebrow">RUBBER GUIDE</div><h1>球皮介紹</h1>
      <p>先懂類型、速度、旋轉、控制與硬度，再依學生程度與打法選球皮；品牌只是最後一層選擇。</p>
      <div className="topNav"><Link href="/more">返回更多</Link><Link href="/blade-guide">球板介紹</Link><Link href="/rubber-catalog">球皮資料庫／庫存</Link><Link href="/service-rules">代工規則</Link></div>
    </section>

    <section className="card guideHeroCard">
      <div className="sectionTitle"><div><span>01</span><h2>一張球皮由什麼組成？</h2></div></div>
      <div className="diagramSplit">
        <div className="rubberDiagram" aria-label="球皮剖面示意">
          <div className="rubberTop"><b>膠面 TOPSHEET</b><span>接觸球、摩擦與顆粒結構</span></div>
          <div className="rubberSponge"><b>海綿 SPONGE</b><span>硬度、厚度與彈性</span></div>
          <div className="bladeBase"><b>球板 BLADE</b><span>整體手感與支撐</span></div>
          <i className="ballDot">●</i>
        </div>
        <div className="guideText"><h3>選球皮不要只看「快不快」</h3><p>相同一張球皮，放在不同球板、不同重量、不同動作完整度的學生手上，結果可能完全不同。教練通常要一起看「球板＋球皮＋學生技術」。</p><div className="notice"><b>兒童選手：</b>先讓動作做得完整、重量拿得住，再追求高硬度與高速度。</div></div>
      </div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>常見球皮類型</h2></div><strong>{RUBBER_TYPES.length} 類</strong></div>
      <div className="guideGrid">{RUBBER_TYPES.map(type=><article className="guideTypeCard" key={type.name}><div className="typeIcon">{type.icon}</div><div><div className="typeTitle"><b>{type.name}</b><span>{type.tag}</span></div><p>{type.desc}</p><small><b>常見打法：</b>{type.good}</small><small>{type.note}</small></div></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>球皮參數怎麼看？</h2></div></div>
      <div className="parameterGrid">{PARAMETERS.map(([name,desc],index)=><div className="parameterCard" key={name}><div className="parameterMeter"><span style={{width:`${48+index*7}%`}} /></div><b>{name}</b><p>{desc}</p></div>)}</div>
      <p className="muted smallText">上方長條是教學示意，不代表特定產品的實測數據；不同品牌自己的速度／硬度標示不能直接當成同一尺度比較。</p>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>教練快速選擇方向</h2></div></div>
      <div className="recommendGrid">
        <div><strong>剛入門</strong><b>控制、重量、容錯優先</b><p>中低速度反膠、不要過重；先讓正反手基本動作穩定。</p></div>
        <div><strong>培育階段</strong><b>開始依打法分流</b><p>觀察主動發力、摩擦、借力能力，再決定軟硬與速度。</p></div>
        <div><strong>競賽選手</strong><b>球板＋球皮一起配</b><p>依前三板、近台／中台、正反手任務與整拍重量調整。</p></div>
        <div><strong>特殊顆粒</strong><b>先決定戰術目的</b><p>長顆、短顆、生膠不是單純「比較好控」，需要搭配固定打法訓練。</p></div>
      </div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>常見桌球品牌</h2></div></div>
      <p className="muted">以下只作為品牌索引，不代表推薦排序；實際特性要看具體型號。</p>
      <div className="brandChips">{BRANDS.map(brand=><span key={brand}>{brand}</span>)}</div>
      <div className="notice" style={{marginTop:14}}><b>下一步：</b>在「球皮資料庫／庫存」建立實際使用型號，未來可再把品牌介紹、型號特色與學生歷史用皮串在一起。</div>
    </section>

    <style>{`.equipmentGuide h3{margin:0 0 8px}.diagramSplit{display:grid;grid-template-columns:minmax(280px,.85fr) 1.15fr;gap:22px;align-items:center}.rubberDiagram{position:relative;border-radius:22px;padding:40px 28px;background:linear-gradient(145deg,#eff8f4,#fff);border:1px solid #d9e7e2;overflow:hidden}.rubberDiagram>div{padding:18px 20px;color:white;box-shadow:0 6px 18px rgba(20,30,40,.12)}.rubberDiagram b,.rubberDiagram span{display:block}.rubberDiagram span{font-size:12px;opacity:.85;margin-top:4px}.rubberTop{background:linear-gradient(90deg,#c92732,#e24b4d);border-radius:16px 16px 4px 4px}.rubberSponge{background:#f2a965}.bladeBase{background:linear-gradient(90deg,#c7955f,#ecd1a8);color:#563b22!important;border-radius:4px 4px 16px 16px}.ballDot{position:absolute;right:25px;top:18px;width:42px;height:42px;border-radius:50%;background:#fff;color:#fff;box-shadow:0 5px 15px rgba(0,0,0,.15)}.guideText p,.guideTypeCard p,.parameterCard p,.recommendGrid p{color:#667386;line-height:1.65}.guideGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.guideTypeCard{display:flex;gap:14px;border:1px solid #e1e6ec;border-radius:17px;padding:15px;background:#fff}.typeIcon{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#d83a3a,#1b1d21);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;flex:none}.typeTitle{display:flex;gap:8px;align-items:center}.typeTitle b{font-size:17px}.typeTitle span{font-size:11px;font-weight:800;border-radius:999px;padding:5px 8px;background:#eef3f1;color:#41665b}.guideTypeCard small{display:block;color:#657386;margin-top:7px;line-height:1.55}.parameterGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.parameterCard{border:1px solid #e1e6ec;border-radius:16px;padding:14px}.parameterMeter{height:7px;background:#edf1f4;border-radius:999px;margin-bottom:12px;overflow:hidden}.parameterMeter span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#0b6b56,#df4848)}.recommendGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.recommendGrid>div{padding:16px;border-radius:17px;background:#f8faf9;border:1px solid #e1e8e5}.recommendGrid strong{display:inline-block;border-radius:999px;background:#e8f4ef;color:#0b5f4b;padding:6px 9px;font-size:12px}.recommendGrid b{display:block;margin-top:10px}.brandChips{display:flex;gap:8px;flex-wrap:wrap}.brandChips span{padding:9px 12px;border-radius:999px;border:1px solid #dfe4ea;background:#fff;font-weight:800;color:#384556}@media(max-width:760px){.diagramSplit,.guideGrid,.parameterGrid,.recommendGrid{grid-template-columns:1fr}.rubberDiagram{padding:34px 18px}}`}</style>
  </main>;
}
