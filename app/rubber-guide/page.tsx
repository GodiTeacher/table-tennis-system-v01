import Link from 'next/link';
import GuidePriceEditor from '@/components/GuidePriceEditor';
import { createClient } from '@/lib/supabase/server';

const RUBBER_TYPES = [
  {
    name: '平面膠皮',
    cn: '反膠',
    tag: '最常見',
    icon: '◉',
    structure: '表面平滑，顆粒朝內',
    desc: '旋轉強、速度範圍大、功能最全面，是目前最主流的比賽配置。',
    good: '弧圈、快攻、全面型',
    note: '從初學到高階都能使用，實際差異主要來自膠面、海綿硬度、厚度與整體速度。'
  },
  {
    name: '短顆粒',
    cn: '常稱正膠；部分型號也屬生膠短顆',
    tag: '速度直接',
    icon: '•••',
    structure: '短粗顆粒朝外',
    desc: '出球速度快、不太吃旋轉、球路較直，適合主動撞擊與快速節奏。',
    good: '近台快攻、彈擊、快撥',
    note: '摩擦製造旋轉能力通常低於平面膠皮，選擇時要看顆粒形狀與海綿配置。'
  },
  {
    name: '中顆粒',
    cn: '常被俗稱生膠，但不完全等同',
    tag: '速度＋干擾',
    icon: '⁙',
    structure: '顆粒長度介於短顆與長顆之間',
    desc: '兼具速度、干擾與下沉感，球質變化比短顆明顯，但仍保有一定主動進攻能力。',
    good: '反手變化、近中台擾亂節奏',
    note: '「生膠」在口語上常被混用，不建議直接把生膠視為單一固定結構；應以實際顆粒長度與型號為準。'
  },
  {
    name: '長顆粒',
    cn: '長膠',
    tag: '變化特殊',
    icon: '⋮⋮',
    structure: '細長顆粒朝外',
    desc: '容易借轉、卸力，回球飄與下沉較明顯，常用來改變旋轉與節奏。',
    good: '削球、防守、倒板、近台擋磕',
    note: '需要專門訓練，不能只用一般速度／旋轉數值判斷是否適合。'
  },
  {
    name: '防弧膠皮',
    cn: '防弧／防弧圈',
    tag: '低摩擦',
    icon: '⊘',
    structure: '外觀看似平面，但表面摩擦較低',
    desc: '抗旋轉能力強，主動製造旋轉的能力較低，常用於防守與變化節奏。',
    good: '防守、擋球、變化節奏',
    note: '與一般平面膠皮的手感差異很大，適合有明確戰術目的時使用。'
  },
];

const PARAMETERS = [
  ['速度', '海綿彈性、膠面結構與整體出球效率共同影響。平面膠皮與短顆通常速度範圍較大；長顆、防弧則更看借力與卸力特性。'],
  ['旋轉／抗旋轉', '平面膠皮主要看主動製造旋轉；顆粒與防弧則還要看「吃不吃轉、借不借轉、回球如何變化」，不能只看單一旋轉分數。'],
  ['控制', '包含落點、容錯、擋球與小力量手感。特殊顆粒的「好控」不代表打法容易，需要搭配對應技術。'],
  ['硬度', '偏硬通常支撐與上限較高，偏軟較容易打透；不同品牌標示不可直接互比，特殊顆粒也需看是否帶海綿。'],
  ['厚度', '海綿越厚通常力量上限越高；長顆可見 OX 無海綿配置，短顆、中顆則會因海綿厚度明顯改變速度與球質。'],
  ['重量', '平面膠皮常是整拍重量主要來源；兒童與小手選手要特別注意兩面球皮加總後的重量。'],
];

const RUBBER_PRICES = [
  {key:'beginner_inverted',label:'入門平面膠皮（反膠）',min:600,max:1200,note:'以控制、重量與基本動作建立為主'},
  {key:'mid_inverted',label:'中階平面膠皮（反膠）',min:1000,max:1900,note:'培育階段常見，開始兼顧旋轉與速度'},
  {key:'premium_inverted',label:'高階平面膠皮（反膠）',min:1800,max:3200,note:'高階／進口系列，實際售價浮動較大'},
  {key:'short_pips',label:'短顆粒',min:700,max:1800,note:'依顆粒形狀、海綿與品牌差異很大'},
  {key:'middle_pips',label:'中顆粒',min:700,max:1800,note:'市場分類名稱較不一致，建議依實際型號確認'},
  {key:'long_pips',label:'長顆粒（長膠）',min:600,max:1600,note:'OX 無海綿與有海綿版本價格不同'},
  {key:'anti_spin',label:'防弧膠皮',min:900,max:2200,note:'低摩擦特殊膠面，品牌與海綿配置差異大'},
] as const;

const BRANDS = ['Butterfly','XIOM','Yasaka','Nittaku','DHS','Donic','Tibhar','Andro','Victas','Stiga'];

export default async function RubberGuidePage({searchParams}:{searchParams:Promise<{message?:string;error?:string}>}){
  const params=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  const {data:teamId}=await supabase.rpc('current_team_id');
  let canEdit=false;
  let rows:Array<{item_key:string;min_price:number;max_price:number}>=[];
  if(teamId&&userId){
    const [{data:priceRows},{data:member}]=await Promise.all([
      supabase.from('equipment_guide_prices').select('item_key,min_price,max_price').eq('team_id',teamId).eq('guide_kind','rubber'),
      supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).single(),
    ]);
    rows=(priceRows??[]) as typeof rows;
    const permissions=(member?.permissions??{}) as Record<string,unknown>;
    canEdit=member?.member_role==='owner'||member?.member_role==='admin'||permissions.equipment===true;
  }
  const priceMap=new Map(rows.map(row=>[row.item_key,row]));

  return <main className="shell equipmentGuide rubberGuideV2">
    <section className="hero compactHero">
      <div className="eyebrow">RUBBER GUIDE</div><h1>球皮介紹</h1>
      <p>以台灣常用名稱為主，並同步標示中國常見名稱，先分清楚膠面結構，再看速度、旋轉、控制與實際打法。</p>
      <div className="topNav"><Link href="/more">返回更多</Link><Link href="/blade-guide">球板介紹</Link><Link href="/rubber-catalog">球皮資料庫／庫存</Link><Link href="/service-rules">代工規則</Link></div>
    </section>
    {params.message?<div className="notice successNotice">{params.message}</div>:null}{params.error?<div className="notice errorNotice">{params.error}</div>:null}

    <section className="card guideHeroCard">
      <div className="sectionTitle"><div><span>01</span><h2>一張球皮由什麼組成？</h2></div></div>
      <div className="diagramSplit">
        <div className="rubberDiagram" aria-label="球皮剖面示意"><div className="rubberTop"><b>膠面 TOPSHEET</b><span>表面摩擦與顆粒結構</span></div><div className="rubberSponge"><b>海綿 SPONGE</b><span>硬度、厚度與彈性</span></div><div className="bladeBase"><b>球板 BLADE</b><span>整體手感與支撐</span></div><i className="ballDot">●</i></div>
        <div className="guideText"><h3>先看結構，再看名稱</h3><p>桌球球皮的名稱在台灣、中國以及不同教練之間常有口語差異。這一版統一用「平面膠皮、短顆粒、中顆粒、長顆粒、防弧膠皮」五大類來介紹，再補上常見別稱，避免把「生膠」誤認成單一固定結構。</p><div className="notice"><b>兒童選手：</b>先讓動作做得完整、重量拿得住，再追求高硬度、高速度或特殊顆粒效果。</div></div>
      </div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>常見球皮類型</h2></div><strong>{RUBBER_TYPES.length} 類</strong></div>
      <div className="guideGrid">{RUBBER_TYPES.map(type=><article className="guideTypeCard" key={type.name}><div className="typeIcon">{type.icon}</div><div><div className="typeTitle"><b>{type.name}</b><span>{type.tag}</span></div><div className="alias">中國／常見名稱：{type.cn}</div><p><b>外觀／結構：</b>{type.structure}</p><p><b>主要特性：</b>{type.desc}</p><small><b>常見打法：</b>{type.good}</small><small>{type.note}</small></div></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>球皮參數怎麼看？</h2></div></div><div className="parameterGrid">{PARAMETERS.map(([name,desc],index)=><div className="parameterCard" key={name}><div className="parameterMeter"><span style={{width:`${48+index*7}%`}} /></div><b>{name}</b><p>{desc}</p></div>)}</div><p className="muted smallText">上方長條只作為教學視覺示意，不代表特定產品實測數據；尤其平面膠皮、顆粒、防弧的性能不能用同一套單一數值直接比較。</p></section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>教練快速選擇方向</h2></div></div><div className="recommendGrid"><div><strong>剛入門</strong><b>控制、重量、容錯優先</b><p>通常先以中低速度平面膠皮建立正反手基本動作，不急著追求特殊球質。</p></div><div><strong>培育階段</strong><b>開始依打法分流</b><p>先觀察主動發力、摩擦、撞擊與借力能力，再決定是否需要短顆或中顆。</p></div><div><strong>競賽選手</strong><b>球板＋球皮一起配</b><p>依前三板、近台／中台、正反手任務與整拍重量調整，名稱不是唯一判斷依據。</p></div><div><strong>特殊球皮</strong><b>先決定戰術目的</b><p>短顆、中顆、長顆、防弧各自的出球邏輯不同，需要搭配固定技術與戰術訓練。</p></div></div></section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>球皮參考價格</h2></div><strong>教練可修改</strong></div><p className="muted">以下先給台灣市場的寬鬆參考區間；特殊顆粒與防弧會因海綿厚度、是否 OX、品牌與型號而有明顯差異。有器材權限的教練可直接更新成球隊實際採購區間。</p><div className="guidePriceList">{RUBBER_PRICES.map(item=>{const custom=priceMap.get(item.key);return <GuidePriceEditor key={item.key} guideKind="rubber" itemKey={item.key} label={item.label} minPrice={custom?.min_price??item.min} maxPrice={custom?.max_price??item.max} returnTo="/rubber-guide" canEdit={canEdit} customized={Boolean(custom)} note={item.note}/>})}</div></section>

    <section className="card"><div className="sectionTitle"><div><span>06</span><h2>常見桌球品牌</h2></div></div><p className="muted">以下只作為品牌索引，不代表推薦排序；實際選擇仍要回到「膠面類型＋型號＋海綿＋學生打法」。</p><div className="brandChips">{BRANDS.map(brand=><span key={brand}>{brand}</span>)}</div><div className="notice" style={{marginTop:14}}><b>名稱提醒：</b>未來球皮資料庫也建議記錄實際「類型」欄位，避免只靠商品名稱中的「正膠／生膠／長膠」判斷結構。</div></section>

    <style>{`.rubberGuideV2 h3{margin:0 0 8px}.diagramSplit{display:grid;grid-template-columns:minmax(280px,.85fr) 1.15fr;gap:22px;align-items:center}.rubberDiagram{position:relative;border-radius:22px;padding:40px 28px;background:linear-gradient(145deg,#eff8f4,#fff);border:1px solid #d9e7e2;overflow:hidden}.rubberDiagram>div{padding:18px 20px;color:white;box-shadow:0 6px 18px rgba(20,30,40,.12)}.rubberDiagram b,.rubberDiagram span{display:block}.rubberDiagram span{font-size:12px;opacity:.85;margin-top:4px}.rubberTop{background:linear-gradient(90deg,#c92732,#e24b4d);border-radius:16px 16px 4px 4px}.rubberSponge{background:#f2a965}.bladeBase{background:linear-gradient(90deg,#c7955f,#ecd1a8);color:#563b22!important;border-radius:4px 4px 16px 16px}.ballDot{position:absolute;right:25px;top:18px;width:42px;height:42px;border-radius:50%;background:#fff;color:#fff;box-shadow:0 5px 15px rgba(0,0,0,.15)}.guideText p,.guideTypeCard p,.parameterCard p,.recommendGrid p{color:#667386;line-height:1.65}.guideGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.guideTypeCard{display:flex;gap:14px;border:1px solid #e1e6ec;border-radius:17px;padding:15px;background:#fff}.guideTypeCard:last-child{grid-column:1/-1}.typeIcon{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#d83a3a,#1b1d21);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;flex:none}.typeTitle{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.typeTitle b{font-size:17px}.typeTitle span{font-size:11px;font-weight:800;border-radius:999px;padding:5px 8px;background:#eef3f1;color:#41665b}.alias{font-size:12px;font-weight:800;color:#7c3aed;margin-top:5px}.guideTypeCard p{margin:7px 0 0}.guideTypeCard small{display:block;color:#657386;margin-top:7px;line-height:1.55}.parameterGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.parameterCard{border:1px solid #e1e6ec;border-radius:16px;padding:14px}.parameterMeter{height:7px;background:#edf1f4;border-radius:999px;margin-bottom:12px;overflow:hidden}.parameterMeter span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#0b6b56,#df4848)}.recommendGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.recommendGrid>div{display:grid;gap:6px;padding:16px;border:1px solid #e3e7ed;border-radius:16px;background:#fbfcfd}.recommendGrid strong{font-size:12px;color:#7c3aed}.recommendGrid b{font-size:16px}.recommendGrid p{margin:0}.guidePriceList{display:grid;gap:9px;margin-top:14px}.brandChips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.brandChips span{padding:8px 11px;border-radius:999px;background:#f1f4f6;border:1px solid #e1e6ec;font-size:12px;font-weight:800}.smallText{font-size:12px;margin-top:10px}@media(max-width:780px){.diagramSplit,.guideGrid,.parameterGrid,.recommendGrid{grid-template-columns:1fr}.guideTypeCard:last-child{grid-column:auto}}@media(max-width:520px){.guideTypeCard{padding:13px}.typeIcon{width:46px;height:46px;border-radius:13px}.rubberDiagram{padding:34px 18px}}`}</style>
  </main>;
}
