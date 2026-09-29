import Link from 'next/link';

const STRUCTURES = [
  { name:'五夾純木', tag:'控制與手感', desc:'常見的入門到進階結構，持球感清楚、回饋自然。', fit:'初學、控制型、需要建立完整發力感的選手' },
  { name:'七夾純木', tag:'更直接', desc:'整體支撐與速度通常高於五夾，近台快攻與主動出球感較明顯。', fit:'快攻、近台、喜歡扎實手感的選手' },
  { name:'內置纖維', tag:'柔和＋底勁', desc:'纖維層靠近芯材，小力量時較接近木板感，大力量時提供支撐。', fit:'弧圈、全面型、想兼顧手感與上限的選手' },
  { name:'外置纖維', tag:'速度＋甜區', desc:'纖維靠近表層，甜區與反彈通常更直接，節奏快。', fit:'進攻、快速銜接、已有穩定基本動作的競賽選手' },
];

const PARAMETERS = [
  ['速度','球離板速度與主動發力後的上限。越快不代表比賽表現一定更好。'],
  ['控制','短球、落點、被動球與容錯。兒童與初學者尤其重要。'],
  ['甜區','擊球偏離中心時仍保持穩定回饋的範圍，纖維板通常較大。'],
  ['持球感','球停留在板上的主觀感受，會影響摩擦、弧圈與小球手感。'],
  ['震動回饋','擊球後手掌接收到的振動與清晰度；有人喜歡明顯，也有人偏好乾淨。'],
  ['重量／平衡','整拍重量與重心位置會直接影響揮拍速度、手腕負擔與兒童使用舒適度。'],
];

const BRANDS = ['Butterfly','Stiga','Yasaka','Nittaku','DHS','Victas','Donic','Tibhar','XIOM','Andro'];

function Layer({label,tone}:{label:string;tone:'wood'|'fiber'|'core'}){
  return <div className={`bladeLayer ${tone}`}><span>{label}</span></div>;
}

export default function BladeGuidePage(){
  return <main className="shell equipmentGuide">
    <section className="hero compactHero">
      <div className="eyebrow">BLADE GUIDE</div><h1>球板介紹</h1>
      <p>球板決定整拍的基礎手感、速度、甜區與支撐；同一面球皮放到不同球板上，表現可能差很多。</p>
      <div className="topNav"><Link href="/more">返回更多</Link><Link href="/rubber-guide">球皮介紹</Link><Link href="/service-rules">代工規則</Link><Link href="/rubber-catalog">球皮資料庫</Link></div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>球板結構怎麼看？</h2></div></div>
      <div className="diagramSplit">
        <div className="bladeDiagram" aria-label="球板結構示意">
          <div className="bladeShape">
            <Layer label="表層木" tone="wood"/><Layer label="纖維" tone="fiber"/><Layer label="中間木層" tone="wood"/><Layer label="芯材" tone="core"/><Layer label="中間木層" tone="wood"/><Layer label="纖維" tone="fiber"/><Layer label="表層木" tone="wood"/>
          </div>
          <div className="bladeHandle"><span>握柄</span></div>
        </div>
        <div><h3>不是「碳板一定比較好」</h3><p className="muted">純木、內置纖維、外置纖維各有優缺點。學生如果還沒建立完整揮拍與摩擦能力，太快的板反而會縮短持球時間、降低容錯。</p><div className="notice"><b>教練選擇順序：</b>學生動作完整度 → 整拍重量 → 球板速度與手感 → 正反手球皮。</div></div>
      </div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>常見球板結構</h2></div><strong>{STRUCTURES.length} 類</strong></div>
      <div className="structureGrid">{STRUCTURES.map((item,index)=><article className="structureCard" key={item.name}><div className={`miniBlade b${index}`}><span /></div><div><div className="structureTitle"><b>{item.name}</b><span>{item.tag}</span></div><p>{item.desc}</p><small><b>常見適合：</b>{item.fit}</small></div></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>球板參數怎麼理解？</h2></div></div>
      <div className="parameterGrid">{PARAMETERS.map(([name,desc],index)=><div className="parameterCard" key={name}><div className="meter"><span style={{width:`${52+index*6}%`}} /></div><b>{name}</b><p>{desc}</p></div>)}</div>
      <p className="muted smallText">長條僅作為介面示意，不代表任何特定球板的量測結果。不同品牌的 OFF、ALL、速度分級也不是完全相同尺度。</p>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>不同階段怎麼挑？</h2></div></div>
      <div className="choiceTable">
        <div className="choiceHead"><span>階段</span><span>優先考量</span><span>常見方向</span></div>
        <div><b>剛入門</b><span>控制、重量、握柄大小</span><span>五夾純木／較慢全面型</span></div>
        <div><b>培育階段</b><span>手感、主動發力、正反手銜接</span><span>五夾／七夾／溫和內置</span></div>
        <div><b>競賽階段</b><span>打法、站位、前三板與中台能力</span><span>內置或外置纖維依需求配置</span></div>
        <div><b>特殊打法</b><span>顆粒面任務、控制與反手穩定</span><span>先看特殊面需求，再決定板速與硬度</span></div>
      </div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>握柄與整拍重量</h2></div></div>
      <div className="handleGrid"><div><b>FL 喇叭柄</b><p>最常見，尾端較寬，容易固定握感。</p></div><div><b>ST 直柄</b><p>上下寬度較一致，方便微調握拍與正反手轉換。</p></div><div><b>AN 葫蘆柄</b><p>中段略收，貼合感特殊，是否適合很看個人手型。</p></div></div>
      <div className="notice"><b>兒童特別注意：</b>不要只看球板標示重量。兩面球皮貼上後的「整拍重量」與頭重感，才是實際揮拍負擔。</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>06</span><h2>常見桌球品牌</h2></div></div>
      <p className="muted">品牌名稱作為索引，不代表推薦排序；同一品牌不同系列可能完全不同。</p><div className="brandChips">{BRANDS.map(brand=><span key={brand}>{brand}</span>)}</div>
    </section>

    <style>{`.equipmentGuide h3{margin:0 0 8px}.diagramSplit{display:grid;grid-template-columns:minmax(300px,.9fr) 1.1fr;gap:24px;align-items:center}.bladeDiagram{display:flex;justify-content:center;align-items:flex-end;min-height:300px;padding:24px;background:linear-gradient(145deg,#eef7f3,#fff4f2);border:1px solid #dbe6e2;border-radius:22px}.bladeShape{width:225px;height:225px;border-radius:50%;overflow:hidden;border:8px solid #9d7048;box-shadow:0 12px 28px rgba(0,0,0,.14);display:flex;flex-direction:column;justify-content:center;background:#d8ae7a}.bladeLayer{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#50351e}.bladeLayer.wood{height:26px;background:#e6c28f}.bladeLayer.fiber{height:10px;background:#252a2d;color:#fff}.bladeLayer.core{height:50px;background:#c9965e}.bladeHandle{width:62px;height:118px;margin-left:-144px;margin-bottom:-86px;border-radius:0 0 22px 22px;background:linear-gradient(90deg,#ba7842,#e2b17d,#a86436);border:5px solid #8d5c36;display:flex;align-items:center;justify-content:center;color:#5b341c;font-weight:900;z-index:2}.structureGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.structureCard{display:flex;gap:14px;padding:15px;border:1px solid #e1e6ec;border-radius:17px;background:#fff}.miniBlade{width:62px;height:72px;border-radius:50% 50% 45% 45%;background:#d8ad78;position:relative;flex:none;border:4px solid #a9794d}.miniBlade:after{content:'';position:absolute;width:17px;height:38px;left:18px;bottom:-30px;border-radius:0 0 8px 8px;background:#a66c3f}.miniBlade span{position:absolute;left:5px;right:5px;top:30px;height:4px;background:#333}.miniBlade.b0 span{display:none}.miniBlade.b1 span{height:8px;background:#986034}.miniBlade.b2 span{top:26px;box-shadow:0 10px 0 #333}.miniBlade.b3 span{top:10px;box-shadow:0 40px 0 #333}.structureTitle{display:flex;align-items:center;gap:8px}.structureTitle span{font-size:11px;font-weight:800;border-radius:999px;padding:5px 8px;background:#edf4f1;color:#356657}.structureCard p,.parameterCard p,.handleGrid p{color:#667386;line-height:1.6}.structureCard small{display:block;color:#657386;line-height:1.55}.parameterGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.parameterCard{padding:14px;border:1px solid #e1e6ec;border-radius:16px}.meter{height:7px;border-radius:999px;background:#edf1f4;overflow:hidden;margin-bottom:12px}.meter span{display:block;height:100%;background:linear-gradient(90deg,#c99b63,#0b5f4b);border-radius:999px}.choiceTable{border:1px solid #e1e6ec;border-radius:16px;overflow:hidden}.choiceTable>div{display:grid;grid-template-columns:.7fr 1.2fr 1.3fr;gap:10px;padding:12px 14px;border-top:1px solid #edf0f3;align-items:center}.choiceTable>div:first-child{border-top:0}.choiceHead{background:#f4f7f6;font-size:12px;font-weight:900;color:#637285}.handleGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.handleGrid>div{padding:14px;border:1px solid #e1e6ec;border-radius:16px}.brandChips{display:flex;gap:8px;flex-wrap:wrap}.brandChips span{padding:9px 12px;border-radius:999px;border:1px solid #dfe4ea;background:#fff;font-weight:800;color:#384556}@media(max-width:760px){.diagramSplit,.structureGrid,.parameterGrid,.handleGrid{grid-template-columns:1fr}.choiceTable>div{grid-template-columns:1fr}.choiceHead{display:none!important}.bladeDiagram{min-height:270px}.bladeShape{width:190px;height:190px}.bladeHandle{margin-left:-120px}}`}</style>
  </main>;
}
