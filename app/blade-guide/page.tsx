import Link from 'next/link';
import GuidePriceEditor from '@/components/GuidePriceEditor';
import { createClient } from '@/lib/supabase/server';

const STRUCTURES = [
  {
    key:'fivewood', name:'五夾純木', tag:'控制與手感', price:[1200,3000],
    desc:'五層木材組成，沒有人工纖維。持球感與回饋通常較自然，適合建立完整發力與摩擦感。',
    fit:'初學、控制型、正在建立完整動作的選手',
    models:['STIGA Allround Classic','Butterfly Petr Korbel','Nittaku Acoustic'],
    star:'Truls Möregårdh（成長案例）', starBlade:'STIGA Allround Classic',
    style:'STIGA 表示 Truls 早期就是用 Allround Classic 學習技術；他現在的打法以創意、節奏變化與強力正手聞名。',
    source:'https://www.stigasports.com/en-gb/players-teams-tt/truls-moregardh', sourceLabel:'STIGA｜Truls', layers:['wood','wood','core','wood','wood']
  },
  {
    key:'sevenwood', name:'七夾純木', tag:'扎實＋直接', price:[1600,3500],
    desc:'七層純木提供更高支撐與直接感，通常比五夾更適合近台快攻、主動撞擊與快速銜接。',
    fit:'快攻、近台、喜歡扎實球感的選手',
    models:['STIGA Clipper Wood','Butterfly SK7 Classic','Nittaku Barwell'],
    star:'劉國樑（經典案例）', starBlade:'STIGA Clipper Wood',
    style:'STIGA 官方列出劉國樑球員時期使用 Clipper Wood；他的代表打法是直拍近台快攻，以快速前三板與主動搶攻施壓。',
    source:'https://www.stigasports.com/en/product/clipper-wood', sourceLabel:'STIGA｜Clipper Wood', layers:['wood','wood','wood','core','wood','wood','wood']
  },
  {
    key:'inner', name:'內置纖維', tag:'持球＋底勁', price:[2800,6500],
    desc:'纖維靠近芯材。小力量時較像純木，發大力時纖維才明顯介入，常被用來兼顧持球與上限。',
    fit:'弧圈、全面型、想兼顧手感與支撐的選手',
    models:['Butterfly Ovtcharov Innerforce ALC','Harimoto Tomokazu Innerforce ALC','Innerforce Layer ALC'],
    star:'Dimitrij Ovtcharov', starBlade:'Ovtcharov Innerforce ALC',
    style:'Butterfly 將他描述為右手橫拍進攻型，特色是變化發球與強力正反手；內置 ALC 保留持球感，同時支援大力量擊球。',
    source:'https://www.butterfly-global.com/en/product/ovtcharov-dimitrij/', sourceLabel:'Butterfly｜Ovtcharov', layers:['wood','wood','fiber','core','fiber','wood','wood']
  },
  {
    key:'outer', name:'外置纖維', tag:'速度＋甜區', price:[3000,7000],
    desc:'纖維靠近表層木，較早介入擊球，甜區、速度與出球直接感通常更明顯。',
    fit:'競賽、快速銜接、已有穩定基本動作的選手',
    models:['Butterfly Viscaria','Fan Zhendong ALC','Lin Yun-Ju Super ZLC'],
    star:'Fan Zhendong／Lin Yun-Ju', starBlade:'Fan Zhendong ALC、Lin Yun-Ju Super ZLC',
    style:'Fan Zhendong 系列強調快速節奏、反手擰拉與弧圈進攻；林昀儒則以細膩手感、反手擰拉與快速反拉著稱。',
    source:'https://www.butterfly-global.com/en/product/fan-zhendong/', sourceLabel:'Butterfly｜FZD / LYJ', layers:['wood','fiber','wood','core','wood','fiber','wood']
  },
  {
    key:'special', name:'特殊板形／科技纖維', tag:'甜區與平衡科技', price:[4000,8500],
    desc:'除了夾層，板形與配重科技也會改變甜區、重心與揮拍感；例如 Cybershape 把有效擊球區往上放大。',
    fit:'已有清楚需求、想調整甜區／重心／節奏的進階選手',
    models:['STIGA Cybershape Carbon CWT','Cybershape Carbon CWT Truls Edition','Butterfly Super ALC / Super ZLC 系列'],
    star:'Truls Möregårdh', starBlade:'Cybershape Carbon CWT Truls Edition',
    style:'STIGA 現行資料列出 Truls 使用 Cybershape Carbon；他的特色是創意擊球、節奏切換、Cyberblock 與強力正手。',
    source:'https://www.stigasports.com/en-row/product/cybershape-carbon-cwt-truls-edition', sourceLabel:'STIGA｜Cybershape', layers:['wood','wood','fiber','core','fiber','wood','wood']
  },
] as const;

const PARAMETERS = [
  ['速度','球離板速度與主動發力後的上限。越快不代表比賽表現一定更好。'],
  ['控制','短球、落點、被動球與容錯。兒童與初學者尤其重要。'],
  ['甜區','擊球偏離中心時仍保持穩定回饋的範圍，纖維板通常較大。'],
  ['持球感','球停留在板上的主觀感受，會影響摩擦、弧圈與小球手感。'],
  ['震動回饋','擊球後手掌接收到的振動與清晰度；有人喜歡明顯，也有人偏好乾淨。'],
  ['重量／平衡','整拍重量與重心位置會直接影響揮拍速度、手腕負擔與兒童使用舒適度。'],
];

const HANDLES = [
  {key:'fl',name:'FL 喇叭柄',tag:'最主流',desc:'尾端較寬、握住後較不易滑脫，市售選擇最多。多數兒童與橫拍選手會先從 FL 開始。'},
  {key:'st',name:'ST 直柄',tag:'轉換自由',desc:'上下寬度較一致，方便在手中微調握法。STIGA 現行資料顯示 Truls Möregårdh 使用 Straight 直柄。'},
  {key:'an',name:'AN 葫蘆柄',tag:'貼合手型',desc:'中段略收、尾端再放大，包覆感強，但選擇較少，是否適合很看個人手型。'},
] as const;

const WEIGHTS = [
  {name:'輕量整拍',range:'約 165–175g',tag:'兒童／力量較小',desc:'揮拍與還原負擔較小，適合低年級或剛轉專業拍的學生。'},
  {name:'標準整拍',range:'約 176–185g',tag:'最常見區間',desc:'兼顧穩定與速度，許多培育與一般競賽選手會落在這一帶。'},
  {name:'偏重整拍',range:'約 186–195g+',tag:'力量與進攻取向',desc:'支撐感可能更強，但對手腕、前臂與還原速度要求也更高。'},
] as const;

function StackDiagram({layers,compact=false}:{layers:readonly string[];compact?:boolean}){
  return <div className={compact ? 'glassStack compact' : 'glassStack'} aria-label="球板切面分層示意">{layers.map((layer,index)=><div key={`${layer}-${index}`} className={`glassLayer ${layer}`} style={{transform:`translate(${index*3}px,${index*2}px)`}}><span>{layer==='fiber'?'纖維':layer==='core'?'芯材':'木層'}</span></div>)}</div>;
}

function HandlePicture({kind}:{kind:'fl'|'st'|'an'}){
  return <div className="handlePicture"><div className="ghostBlade"/><div className={`realHandle ${kind}`}><i/><i/><span>{kind.toUpperCase()}</span></div></div>;
}

function WeightPicture({index}:{index:number}){
  return <div className={`weightPicture w${index}`}><div className="weightBlade"/><div className="weightHandle"/><div className="scaleDial"><span>{index===0?'170':index===1?'182':'192'}</span><small>g</small></div></div>;
}

export default async function BladeGuidePage({searchParams}:{searchParams:Promise<{message?:string;error?:string}>}){
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: teamId } = await supabase.rpc('current_team_id');
  let canEdit = false;
  let rows: Array<{item_key:string;min_price:number;max_price:number}> = [];
  if(teamId && userId){
    const [{data:priceRows},{data:member}] = await Promise.all([
      supabase.from('equipment_guide_prices').select('item_key,min_price,max_price').eq('team_id',teamId).eq('guide_kind','blade'),
      supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).single(),
    ]);
    rows=(priceRows ?? []) as typeof rows;
    const permissions = (member?.permissions ?? {}) as Record<string,unknown>;
    canEdit = member?.member_role === 'owner' || member?.member_role === 'admin' || permissions.equipment === true;
  }
  const priceMap = new Map(rows.map(row=>[row.item_key,row]));

  return <main className="shell equipmentGuide bladeGuideV2">
    <section className="hero compactHero"><div className="eyebrow">BLADE GUIDE</div><h1>球板介紹</h1><p>先看「切面結構」而不是球板正面：木層與纖維的位置，才真正影響持球、反彈、甜區與底勁。</p><div className="topNav"><Link href="/more">返回更多</Link><Link href="/rubber-guide">球皮介紹</Link><Link href="/service-rules">代工規則</Link><Link href="/rubber-catalog">球皮資料庫</Link></div></section>
    {params.message ? <div className="notice successNotice">{params.message}</div> : null}{params.error ? <div className="notice errorNotice">{params.error}</div> : null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>球板結構應該看「切面」</h2></div></div><div className="diagramSplit">
      <div className="explodedPanel"><StackDiagram layers={['wood','fiber','wood','core','wood','fiber','wood']}/><div className="cutLabel"><b>像玻璃夾層一樣看</b><span>每一片木材／纖維是沿著球板厚度堆疊，從正面其實不會看到這些條紋。</span></div></div>
      <div><h3>纖維放在哪裡，比「有沒有碳」更重要</h3><p className="muted">內置纖維靠近芯材，通常保留較多木板持球感；外置纖維靠近表層，纖維更早介入，出球與甜區通常更直接。</p><div className="notice"><b>教練選擇順序：</b>學生動作完整度 → 整拍重量 → 球板結構／速度 → 正反手球皮。</div></div>
    </div></section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>球板類型＋典型款式＋球星案例</h2></div><strong>{STRUCTURES.length} 類</strong></div>
      <div className="structureLongList">{STRUCTURES.map(item=>{const custom=priceMap.get(item.key);const min=custom?.min_price ?? item.price[0];const max=custom?.max_price ?? item.price[1];return <article className="structureLongCard" key={item.key}>
        <div className="structureVisual"><StackDiagram compact layers={item.layers}/><span className="priceBadge">NT${min.toLocaleString()}～${max.toLocaleString()}</span></div>
        <div className="structureBody"><div className="structureTitle"><h3>{item.name}</h3><span>{item.tag}</span></div><p>{item.desc}</p><small><b>常見適合：</b>{item.fit}</small>
          <div className="modelBlock"><b>典型款式</b><div>{item.models.map(model=><span key={model}>{model}</span>)}</div></div>
          <div className="starCase"><b>🏓 球星案例｜{item.star}</b><strong>{item.starBlade}</strong><p>{item.style}</p><div className="equipmentSourceLinks"><a href={item.source} target="_blank" rel="noreferrer">資料來源：{item.sourceLabel}</a></div></div>
        </div>
      </article>})}</div>
      <p className="muted smallText" style={{marginTop:12}}>球星器材會因時期、贊助與客製設定改變；此處用官方／公開資料作為「結構與打法案例」，不把它當成固定不變的現役器材清單。</p>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>球板參數怎麼理解？</h2></div></div><div className="parameterGrid">{PARAMETERS.map(([name,desc],index)=><div className="parameterCard" key={name}><div className="meter"><span style={{width:`${52+index*6}%`}} /></div><b>{name}</b><p>{desc}</p></div>)}</div><p className="muted smallText">長條僅作介面示意，不代表任何特定球板的量測結果。不同品牌的 OFF、ALL、速度分級也不是完全相同尺度。</p></section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>握柄怎麼選？</h2></div><strong>FL 最主流</strong></div><div className="handleVisualGrid">{HANDLES.map(handle=><article key={handle.key}><HandlePicture kind={handle.key}/><div><span>{handle.tag}</span><h3>{handle.name}</h3><p>{handle.desc}</p></div></article>)}</div><div className="notice"><b>本隊目前使用：</b>系統現階段沒有紀錄每位學生的握柄型式，因此不直接猜測。若你確認全隊目前都是 FL／ST／AN，我下一步可以把「握柄」正式加進學生器材資料，直接顯示本隊統計。</div></section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>整拍重量要看「貼完兩面球皮後」</h2></div></div><div className="weightGrid">{WEIGHTS.map((item,index)=><article key={item.name}><WeightPicture index={index}/><span>{item.tag}</span><h3>{item.name}</h3><strong>{item.range}</strong><p>{item.desc}</p></article>)}</div><div className="notice"><b>兒童特別注意：</b>不要只追求重＝穩。太重會拖慢揮拍、正反手轉換與還原，長時間也更容易讓前臂疲勞。</div></section>

    <section className="card"><div className="sectionTitle"><div><span>06</span><h2>球板參考價格</h2></div><strong>教練可修改</strong></div><p className="muted">以下先放寬鬆的台灣市場參考區間，實際售價會受品牌、系列、代理與匯率影響。同隊有器材權限的教練可直接更新。</p><div className="guidePriceList">{STRUCTURES.map(item=>{const custom=priceMap.get(item.key);return <GuidePriceEditor key={item.key} guideKind="blade" itemKey={item.key} label={item.name} minPrice={custom?.min_price ?? item.price[0]} maxPrice={custom?.max_price ?? item.price[1]} returnTo="/blade-guide" canEdit={canEdit} customized={Boolean(custom)} note={item.models.slice(0,2).join('、')}/>})}</div></section>

    <style>{`.equipmentGuide h3{margin:0 0 8px}.diagramSplit{display:grid;grid-template-columns:minmax(320px,.95fr) 1.05fr;gap:24px;align-items:center}.explodedPanel{min-height:300px;border-radius:22px;padding:26px;background:linear-gradient(145deg,#eef7f3,#fff4f2);border:1px solid #dbe6e2;display:flex;align-items:center;justify-content:center;gap:28px}.glassStack{width:270px;display:flex;flex-direction:column;gap:8px;transform:rotate(-7deg);filter:drop-shadow(0 15px 16px rgba(77,52,28,.16))}.glassLayer{height:25px;border:1px solid rgba(81,55,31,.2);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#5e4025;box-shadow:0 5px 12px rgba(0,0,0,.08)}.glassLayer.wood{background:linear-gradient(90deg,rgba(238,204,153,.93),rgba(210,156,91,.9))}.glassLayer.core{height:40px;background:linear-gradient(90deg,#d6a267,#bf8047)}.glassLayer.fiber{height:10px;background:linear-gradient(90deg,#202a31,#4b5b65);color:#fff}.glassStack.compact{width:160px;gap:4px;transform:rotate(-4deg)}.glassStack.compact .glassLayer{height:15px}.glassStack.compact .glassLayer.core{height:24px}.glassStack.compact .glassLayer.fiber{height:7px}.glassStack.compact .glassLayer span{display:none}.cutLabel{max-width:170px}.cutLabel b,.cutLabel span{display:block}.cutLabel span{font-size:12px;color:#667386;line-height:1.6;margin-top:7px}.structureLongList{display:flex;flex-direction:column;gap:14px}.structureLongCard{display:grid;grid-template-columns:210px minmax(0,1fr);gap:18px;padding:17px;border:1px solid #e1e6ec;border-radius:19px;background:#fff}.structureVisual{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border-radius:16px;background:linear-gradient(145deg,#f4f8f6,#fff8f3);padding:16px}.structureTitle{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.structureTitle h3{font-size:20px}.structureTitle span,.handleVisualGrid article>div>span,.weightGrid article>span{font-size:11px;font-weight:900;border-radius:999px;padding:5px 8px;background:#eaf4f0;color:#315f52}.structureBody>p,.parameterCard p,.handleVisualGrid p,.weightGrid p{color:#667386;line-height:1.62}.structureBody>small{display:block;color:#647184}.modelBlock{margin-top:13px}.modelBlock>b{display:block;font-size:12px;color:#536174;margin-bottom:7px}.modelBlock>div{display:flex;gap:6px;flex-wrap:wrap}.modelBlock span{padding:7px 9px;border-radius:999px;background:#f1f4f7;font-size:12px;font-weight:800}.starCase{margin-top:13px;padding:13px;border-left:4px solid #0b6b56;border-radius:12px;background:#f4f9f7}.starCase>b,.starCase>strong{display:block}.starCase>strong{margin-top:5px}.starCase p{margin:7px 0 0;color:#5f6c7d;line-height:1.55}.parameterGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.parameterCard{padding:14px;border:1px solid #e1e6ec;border-radius:16px}.meter{height:7px;border-radius:999px;background:#edf1f4;overflow:hidden;margin-bottom:12px}.meter span{display:block;height:100%;background:linear-gradient(90deg,#c99b63,#0b5f4b);border-radius:999px}.handleVisualGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.handleVisualGrid article{border:1px solid #e1e6ec;border-radius:18px;padding:14px;background:#fff}.handlePicture{height:180px;position:relative;display:flex;justify-content:center;align-items:flex-start;background:radial-gradient(circle at 50% 40%,#f8efe4,#eef6f2);border-radius:14px;overflow:hidden;margin-bottom:12px}.ghostBlade{position:absolute;top:15px;width:108px;height:118px;border-radius:50% 50% 45% 45%;background:linear-gradient(135deg,#cf9b63,#edcf9d);border:4px solid #9a673e;box-shadow:0 8px 18px rgba(86,50,24,.18)}.realHandle{position:absolute;top:112px;height:60px;background:linear-gradient(90deg,#9f5d32,#e3ae73 45%,#a96335);border:3px solid #8a502e;box-shadow:0 6px 12px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;color:#5b321c;font-weight:900;font-size:11px}.realHandle.fl{width:47px;clip-path:polygon(18% 0,82% 0,100% 100%,0 100%)}.realHandle.st{width:38px;border-radius:5px}.realHandle.an{width:48px;clip-path:polygon(8% 0,92% 0,72% 48%,96% 100%,4% 100%,28% 48%)}.realHandle i{position:absolute;top:0;bottom:0;width:3px;background:rgba(255,255,255,.28)}.realHandle i:first-child{left:30%}.realHandle i:nth-child(2){right:30%}.weightGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.weightGrid article{border:1px solid #e1e6ec;border-radius:18px;padding:14px;background:#fff}.weightGrid article>strong{display:block;font-size:22px;margin:8px 0}.weightPicture{height:150px;position:relative;border-radius:14px;background:linear-gradient(145deg,#f4f8f7,#fff5ee);overflow:hidden;margin-bottom:12px}.weightBlade{position:absolute;width:86px;height:92px;border-radius:50%;left:30px;top:22px;background:linear-gradient(135deg,#cf3c3c 0 49%,#1c1d20 51% 100%);border:4px solid #9e6c46;transform:rotate(-18deg)}.weightHandle{position:absolute;width:23px;height:61px;left:73px;top:96px;background:linear-gradient(90deg,#9f5d32,#e5b078,#a96335);border-radius:0 0 8px 8px;transform:rotate(-18deg);transform-origin:top}.scaleDial{position:absolute;right:24px;top:44px;width:74px;height:74px;border-radius:50%;background:#fff;border:7px solid #dfe5e8;box-shadow:0 8px 18px rgba(0,0,0,.10);display:flex;align-items:center;justify-content:center;flex-direction:column}.scaleDial span{font-size:22px;font-weight:900}.scaleDial small{color:#6b7789}.w0 .scaleDial{border-color:#97d8bf}.w1 .scaleDial{border-color:#8fb7df}.w2 .scaleDial{border-color:#e5aa93}@media(max-width:820px){.diagramSplit,.structureLongCard{grid-template-columns:1fr}.structureVisual{min-height:190px}.parameterGrid,.handleVisualGrid,.weightGrid{grid-template-columns:1fr 1fr}.explodedPanel{min-height:250px}}@media(max-width:560px){.parameterGrid,.handleVisualGrid,.weightGrid{grid-template-columns:1fr}.explodedPanel{flex-direction:column}.glassStack{width:220px}.cutLabel{max-width:none;text-align:center}.structureLongCard{padding:12px}}`}</style>
  </main>;
}
