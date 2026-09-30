import Link from 'next/link';
import GuidePriceEditor from '@/components/GuidePriceEditor';
import { createClient } from '@/lib/supabase/server';

const STRUCTURES = [
  {
    key:'fivewood', name:'五夾純木', tag:'控制與手感', price:[1200,3000],
    desc:'五層天然木材組成，沒有人工纖維。回饋通常自然、持球感清楚，適合建立完整發力與摩擦感。',
    fit:'初學、控制型、正在建立完整動作的選手',
    models:['Butterfly Petr Korbel','Nittaku Acoustic','STIGA Allround Classic'],
    cases:[
      {country:'日本',name:'純木訓練思路',blade:'Petr Korbel／Acoustic 類五夾純木',style:'五夾純木常被當作建立摩擦、弧圈與手感的基礎方向；此處以典型款式示範，不硬把現役球星綁定到未經官方確認的器材。',source:'https://www.butterfly-global.com/en/products/blade/',sourceLabel:'Butterfly 球板目錄'}
    ],
    layers:['wood','wood','core','wood','wood']
  },
  {
    key:'sevenwood', name:'七夾純木', tag:'扎實＋直接', price:[1600,3500],
    desc:'七層純木提供更高支撐與直接感，通常比五夾更適合近台快攻、主動撞擊與快速銜接。',
    fit:'快攻、近台、喜歡扎實球感的選手',
    models:['STIGA Clipper Wood','Butterfly SK7 Classic','Nittaku Barwell'],
    cases:[
      {country:'中國',name:'劉國樑',blade:'STIGA Clipper Wood',style:'經典直拍近台快攻案例。STIGA 將 Clipper Wood 與劉國樑球員時期連結；打法特色是前三板節奏快、近台主動搶攻與快速施壓。',source:'https://www.stigasports.com/en/product/clipper-wood',sourceLabel:'STIGA｜Clipper Wood'}
    ],
    layers:['wood','wood','wood','core','wood','wood','wood']
  },
  {
    key:'inner', name:'內置纖維', tag:'持球＋底勁', price:[2800,6500],
    desc:'纖維靠近芯材。小力量時較接近木板感，大力量時纖維支撐才更明顯，常被用來兼顧持球與上限。',
    fit:'弧圈、全面型、想兼顧手感與支撐的選手',
    models:['Harimoto Tomokazu Innerforce ALC','Innerforce Layer ALC','Harimoto Tomokazu Innerforce Super ALC'],
    cases:[
      {country:'日本',name:'張本智和',blade:'Harimoto Tomokazu Innerforce ALC／Super ALC',style:'Butterfly 將張本智和系列描述為支援近台防守與攻擊性打法；他的特色是細膩小球、快速正反手銜接與近台兩面進攻。',source:'https://www.butterfly-global.com/catalog/2025tc/37/',sourceLabel:'Butterfly 2025 Catalog'}
    ],
    layers:['wood','wood','fiber','core','fiber','wood','wood']
  },
  {
    key:'outer', name:'外置纖維', tag:'速度＋甜區', price:[3000,7000],
    desc:'纖維靠近表層木，較早介入擊球，甜區、速度與出球直接感通常更明顯。',
    fit:'競賽、快速銜接、已有穩定基本動作的選手',
    models:['Butterfly Fan Zhendong ALC','Butterfly Viscaria','Lin Yun-Ju Super ZLC'],
    cases:[
      {country:'中國',name:'樊振東',blade:'Fan Zhendong ALC',style:'Butterfly 的球員／器材頁面指出這支 ALC 的速度、手感與弧線符合他的比賽需求；打法可用「高品質兩面進攻、快速銜接、反手擰拉後持續加壓」來理解。',source:'https://www.butterfly-global.com/en/product/fan-zhendong/goods.html',sourceLabel:'Butterfly｜Fan Zhendong'},
      {country:'台灣',name:'林昀儒',blade:'Lin Yun-Ju Super ZLC',style:'Butterfly 明確將林昀儒與 Super ZLC 連結，並提到他的高品質擰拉與快速反拉；很適合作為外置高反彈纖維＋細膩手感的案例。',source:'https://www.butterfly-global.com/en/product/lin_yun-ju/',sourceLabel:'Butterfly｜Lin Yun-Ju'}
    ],
    layers:['wood','fiber','wood','core','wood','fiber','wood']
  },
  {
    key:'special', name:'高階纖維／特殊科技', tag:'高反彈＋大甜區', price:[4000,8500],
    desc:'Super ALC、Super ZLC 等高階纖維強調更大的高反彈區與速度上限；這類器材通常更需要完整動作與精準控制。',
    fit:'有明確打法需求、穩定性成熟的進階／競賽選手',
    models:['Lin Yun-Ju Super ZLC','Harimoto Tomokazu Innerforce Super ALC','Butterfly Super ALC 系列'],
    cases:[
      {country:'台灣',name:'林昀儒',blade:'Lin Yun-Ju Super ZLC',style:'以擰拉、快撕／反拉與快速節奏見長，官方資料也直接把這支球板與他的高品質擰拉、快速反擊連結。',source:'https://www.butterfly-global.com/en/products/detail/37131.html',sourceLabel:'Butterfly｜Lin Yun-Ju Super ZLC'},
      {country:'日本',name:'張本智和／張本美和',blade:'Harimoto Tomokazu Innerforce Super ALC',style:'Butterfly 現行產品頁列出張本智和與張本美和為使用者；可作為高階內置纖維追求抓球感與威力並存的案例。',source:'https://www.butterfly-global.com/en/products/detail/37331.html',sourceLabel:'Butterfly｜Innerforce Super ALC'}
    ],
    layers:['wood','wood','fiber','core','fiber','wood','wood']
  },
] as const;

const PARAMETERS = [
  {name:'速度',left:'較慢／持球久',right:'較快／出球直接',icon:'⚡',desc:'看的是球離板與主動發力後的速度上限。越快不代表越適合，兒童或動作尚未穩定時，太快反而容易失控。'},
  {name:'控制',left:'容錯較低',right:'容錯較高',icon:'🎯',desc:'指短球、落點、被動球與小力量處理的穩定程度。初學者通常比追求極限速度更需要容錯。'},
  {name:'甜區',left:'集中',right:'寬廣',icon:'◎',desc:'擊球沒有正中拍面時，還能保持相近回彈與方向的範圍。纖維板通常比純木更容易做出較大的甜區。'},
  {name:'持球感',left:'乾脆／快離板',right:'咬球／停留感明顯',icon:'🫳',desc:'是主觀的「球在板上停多久」感覺，會影響摩擦、弧圈與小球觸感；不是越久越好。'},
  {name:'震動回饋',left:'柔和／過濾較多',right:'清楚／震感明顯',icon:'〰️',desc:'擊球後手掌接收到的訊息。有人需要清楚回饋來調整動作，也有人偏好乾淨、柔和的觸感。'},
  {name:'重量與平衡',left:'輕／柄重',right:'重／頭重',icon:'⚖️',desc:'整拍重量與重心會直接影響揮拍、還原與手腕負擔。兒童選手尤其應看「貼好兩面球皮後」的整拍，而不是只看裸板。'},
] as const;

const HANDLES = [
  {key:'fl',name:'FL 喇叭柄',tag:'最主流',desc:'尾端較寬、握住後較不易滑脫，市售選擇最多。多數兒童與橫拍選手會先從 FL 開始。'},
  {key:'st',name:'ST 直柄',tag:'轉換自由',desc:'上下寬度較一致，方便在手中微調握法，適合喜歡自由調整握拍角度的人。'},
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

function RacketCutaway(){
  return <div className="racketCutaway" aria-label="正常球拍與切面放大示意">
    <div className="racketNormal">
      <div className="racketFace"><div className="cutSquare"><span>切面</span></div></div>
      <div className="racketHandleMain"/>
      <small>正常視角</small>
    </div>
    <div className="zoomArrow"><span>局部放大</span><b>→</b></div>
    <div className="cutawayZoom"><StackDiagram layers={['wood','fiber','wood','core','wood','fiber','wood']}/><small>從側面才看得到木層與纖維位置</small></div>
  </div>;
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

  return <main className="shell equipmentGuide bladeGuideV3">
    <section className="hero compactHero"><div className="eyebrow">BLADE GUIDE</div><h1>球板介紹</h1><p>先看正常球拍，再把拍面局部放大成「切面」；木層與纖維的位置，才真正影響持球、反彈、甜區與底勁。</p><div className="topNav"><Link href="/more">返回更多</Link><Link href="/rubber-guide">球皮介紹</Link><Link href="/service-rules">代工規則</Link><Link href="/rubber-catalog">球皮資料庫</Link></div></section>
    {params.message ? <div className="notice successNotice">{params.message}</div> : null}{params.error ? <div className="notice errorNotice">{params.error}</div> : null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>球板結構：從正常球拍放大看「切面」</h2></div></div>
      <RacketCutaway/>
      <div className="cutawayExplain"><div><h3>正面看起來就是一整片</h3><p>真正不同的木材、碳纖維或複合纖維，都藏在球板厚度裡。教學時先用正常球拍定位，再把拍面局部放大成側面切面，比直接畫一疊木條更好理解。</p></div><div className="notice"><b>判斷重點：</b>內置纖維＝纖維靠近芯材；外置纖維＝纖維靠近表層。纖維距離表面的遠近，會改變出球直接感、持球感與甜區。</div></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>球板類型＋典型款式＋中／台／日球星案例</h2></div><strong>{STRUCTURES.length} 類</strong></div>
      <div className="structureLongList">{STRUCTURES.map(item=>{const custom=priceMap.get(item.key);const min=custom?.min_price ?? item.price[0];const max=custom?.max_price ?? item.price[1];return <article className="structureLongCard" key={item.key}>
        <div className="structureVisual"><StackDiagram compact layers={item.layers}/><span className="priceBadge">NT${min.toLocaleString()}～${max.toLocaleString()}</span></div>
        <div className="structureBody"><div className="structureTitle"><h3>{item.name}</h3><span>{item.tag}</span></div><p>{item.desc}</p><small><b>常見適合：</b>{item.fit}</small>
          <div className="modelBlock"><b>典型款式</b><div>{item.models.map(model=><span key={model}>{model}</span>)}</div></div>
          <div className="starCaseGrid">{item.cases.map(player=><div className="starCase" key={`${item.key}-${player.name}`}><div className="countryPill">{player.country}</div><b>🏓 {player.name}</b><strong>{player.blade}</strong><p>{player.style}</p><div className="equipmentSourceLinks"><a href={player.source} target="_blank" rel="noreferrer">資料來源：{player.sourceLabel}</a></div></div>)}</div>
          <GuidePriceEditor guideKind="blade" itemKey={item.key} label={`${item.name}參考價`} minPrice={min} maxPrice={max} returnTo="/blade-guide" canEdit={canEdit} customized={Boolean(custom)} note="價格會依品牌、型號與通路變動" />
        </div>
      </article>})}</div>
      <p className="muted smallText">球星器材會隨年份、贊助與個人客製改變；此區優先引用品牌官方資料，用來幫教練理解「結構如何對應打法」，不是要求學生照抄職業球員配置。</p>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>球板參數怎麼理解？</h2></div><strong>不是評分表</strong></div>
      <div className="parameterIntro"><b>看成「兩端特性」會比較直觀：</b>下面每張卡都不是進度條，也沒有代表某一支球板的分數；它只是告訴你這個參數的兩個方向，以及教練實際該觀察什麼。</div>
      <div className="parameterExplainGrid">{PARAMETERS.map(item=><article className="parameterExplainCard" key={item.name}><div className="parameterHead"><span>{item.icon}</span><b>{item.name}</b></div><div className="traitAxis"><span>{item.left}</span><b>↔</b><span>{item.right}</span></div><p>{item.desc}</p></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>不同階段怎麼挑？</h2></div></div>
      <div className="choiceTable"><div className="choiceHead"><span>階段</span><span>優先考量</span><span>常見方向</span></div><div><b>剛入門</b><span>控制、重量、握柄大小</span><span>五夾純木／較慢全面型</span></div><div><b>培育階段</b><span>手感、主動發力、正反手銜接</span><span>五夾／七夾／溫和內置</span></div><div><b>競賽階段</b><span>打法、站位、前三板與中台能力</span><span>內置或外置纖維依需求配置</span></div><div><b>特殊打法</b><span>顆粒面任務、控制與反手穩定</span><span>先看特殊面需求，再決定板速與硬度</span></div></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>握柄：直接看外形差異</h2></div></div><div className="handleVisualGrid">{HANDLES.map(handle=><article className="handleVisualCard" key={handle.key}><HandlePicture kind={handle.key}/><div><div className="structureTitle"><h3>{handle.name}</h3><span>{handle.tag}</span></div><p>{handle.desc}</p></div></article>)}</div><div className="notice"><b>目前市場主流：</b>FL 喇叭柄最常見；但球隊實際主要使用哪一種，請以下方「本隊主要握柄」設定為準。</div></section>

    <section className="card"><div className="sectionTitle"><div><span>06</span><h2>整拍重量：看的是貼好兩面之後</h2></div></div><div className="weightGrid">{WEIGHTS.map((item,index)=><article className="weightCard" key={item.name}><WeightPicture index={index}/><strong>{item.range}</strong><b>{item.name}</b><span>{item.tag}</span><p>{item.desc}</p></article>)}</div><div className="notice"><b>實際秤重：</b>球板裸重只是其中一部分。球皮厚度、海綿密度、裁切尺寸與護邊都會改變整拍重量與頭重感。</div></section>

    <style>{`.bladeGuideV3 h3{margin:0}.racketCutaway{display:grid;grid-template-columns:260px 100px minmax(300px,1fr);gap:20px;align-items:center;padding:24px;border:1px solid #dfe7e4;border-radius:22px;background:linear-gradient(145deg,#f1f8f5,#fff7f2)}.racketNormal{display:flex;flex-direction:column;align-items:center}.racketFace{width:180px;height:180px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#d94b4b,#a51f29 72%);border:7px solid #9b673d;box-shadow:0 12px 26px rgba(37,47,58,.16);position:relative}.racketHandleMain{width:46px;height:105px;margin-top:-7px;border-radius:0 0 19px 19px;background:linear-gradient(90deg,#a96739,#e0ad75,#985c31);border:4px solid #87542f}.cutSquare{position:absolute;width:54px;height:54px;right:18px;top:48px;border:3px solid #fff;background:rgba(255,255,255,.1);box-shadow:0 0 0 2px rgba(16,92,73,.55)}.cutSquare span{position:absolute;left:50%;top:-26px;transform:translateX(-50%);white-space:nowrap;color:#fff;background:#0b5f4b;padding:3px 7px;border-radius:8px;font-size:11px;font-weight:900}.racketNormal small,.cutawayZoom small{margin-top:9px;color:#687588;font-weight:800}.zoomArrow{text-align:center;color:#0b5f4b}.zoomArrow span{display:block;font-size:12px;font-weight:900}.zoomArrow b{font-size:42px}.cutawayZoom{display:flex;flex-direction:column;align-items:center;padding:20px;border-radius:18px;background:#fff;border:1px dashed #aac8be}.glassStack{width:min(340px,100%);display:flex;flex-direction:column;gap:7px;align-items:center}.glassStack.compact{width:150px;gap:4px}.glassLayer{width:92%;height:26px;border-radius:6px;border:1px solid rgba(92,67,42,.18);box-shadow:0 6px 12px rgba(36,43,50,.08);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#51361e}.glassStack.compact .glassLayer{height:15px;font-size:9px}.glassLayer.wood{background:linear-gradient(90deg,#efc789,#d8a566)}.glassLayer.core{height:42px;background:#c98e51}.glassLayer.fiber{height:10px;background:linear-gradient(90deg,#20272c,#526168);color:#fff}.glassStack.compact .glassLayer.core{height:24px}.glassStack.compact .glassLayer.fiber{height:7px}.cutawayExplain{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.cutawayExplain p{color:#657386;line-height:1.65}.structureLongList{display:grid;gap:14px}.structureLongCard{display:grid;grid-template-columns:190px 1fr;gap:18px;border:1px solid #e1e6ec;border-radius:20px;padding:17px;background:#fff}.structureVisual{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:16px;border-radius:16px;background:linear-gradient(145deg,#f0f6f3,#fff7f0)}.priceBadge{margin-top:17px;background:#173f4a;color:#fff;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.structureTitle{display:flex;align-items:center;gap:8px}.structureTitle span,.countryPill{font-size:11px;font-weight:900;border-radius:999px;padding:5px 8px;background:#eaf4ef;color:#276250}.structureBody>p,.starCase p,.parameterExplainCard p,.handleVisualCard p,.weightCard p{color:#657386;line-height:1.62}.structureBody small{color:#657386}.modelBlock{margin:13px 0}.modelBlock>b{display:block;margin-bottom:7px}.modelBlock div{display:flex;gap:6px;flex-wrap:wrap}.modelBlock span{background:#f3f6f8;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:800;color:#465365}.starCaseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.starCase{border:1px solid #dae6e2;background:#f8fbfa;border-radius:14px;padding:12px}.starCase>strong{display:block;margin-top:5px;color:#162e44}.countryPill{display:inline-block;margin-bottom:7px}.equipmentSourceLinks a{font-size:12px;color:#17695b;font-weight:800}.parameterIntro{padding:13px 15px;border-radius:14px;background:#edf7f3;color:#425b54;line-height:1.6;margin-bottom:12px}.parameterExplainGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.parameterExplainCard{padding:15px;border:1px solid #e1e6ec;border-radius:17px;background:#fff}.parameterHead{display:flex;gap:9px;align-items:center}.parameterHead>span{font-size:22px}.parameterHead b{font-size:16px}.traitAxis{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:13px 0 8px;padding:9px 10px;border-radius:12px;background:linear-gradient(90deg,#f5eadc,#eef7f3)}.traitAxis span:first-child{text-align:left}.traitAxis span:last-child{text-align:right}.traitAxis span{font-size:12px;font-weight:900;color:#526274}.traitAxis b{color:#0b5f4b;font-size:20px}.choiceTable{border:1px solid #e1e6ec;border-radius:16px;overflow:hidden}.choiceTable>div{display:grid;grid-template-columns:.7fr 1.2fr 1.3fr;gap:10px;padding:12px 14px;border-top:1px solid #edf0f3;align-items:center}.choiceTable>div:first-child{border-top:0}.choiceHead{background:#f4f7f6;font-size:12px;font-weight:900;color:#637285}.handleVisualGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.handleVisualCard{border:1px solid #e1e6ec;border-radius:18px;padding:15px;background:#fff}.handlePicture{height:205px;position:relative;display:flex;justify-content:center;align-items:flex-start;background:linear-gradient(145deg,#edf6f2,#fff4ee);border-radius:15px;overflow:hidden;margin-bottom:12px}.ghostBlade{width:116px;height:116px;border-radius:50%;margin-top:16px;background:radial-gradient(circle at 35% 30%,#df4b50,#9d1e2d);border:5px solid #9b673d;box-shadow:0 8px 18px rgba(0,0,0,.15)}.realHandle{position:absolute;top:119px;width:38px;height:78px;background:linear-gradient(90deg,#9f6539,#e2b17b,#97592e);border:3px solid #88512d;display:flex;align-items:center;justify-content:center}.realHandle span{font-size:10px;font-weight:900;color:#56341e}.realHandle.fl{width:35px;border-radius:6px 6px 14px 14px;clip-path:polygon(20% 0,80% 0,100% 100%,0 100%)}.realHandle.st{border-radius:5px}.realHandle.an{border-radius:8px 8px 14px 14px;clip-path:polygon(15% 0,85% 0,72% 45%,100% 100%,0 100%,28% 45%)}.realHandle i{display:none}.weightGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.weightCard{border:1px solid #e1e6ec;border-radius:18px;padding:15px;background:#fff;text-align:center}.weightCard strong{display:block;font-size:22px;color:#143f52;margin-top:7px}.weightCard b{display:block;margin-top:5px}.weightCard>span{display:inline-block;margin-top:7px;border-radius:999px;padding:5px 8px;background:#edf5f2;color:#356657;font-size:11px;font-weight:900}.weightPicture{height:170px;position:relative;border-radius:15px;background:linear-gradient(145deg,#edf6f2,#fff5ed);overflow:hidden}.weightBlade{position:absolute;width:90px;height:90px;border-radius:50%;left:calc(50% - 70px);top:25px;background:linear-gradient(90deg,#d9383f 50%,#181a1d 50%);border:5px solid #9a673f;transform:rotate(-12deg)}.weightHandle{position:absolute;width:27px;height:62px;left:calc(50% - 17px);top:101px;background:#b77542;border:3px solid #8b5731;border-radius:0 0 10px 10px;transform:rotate(-12deg)}.scaleDial{position:absolute;right:19px;bottom:25px;width:72px;height:72px;border-radius:50%;background:#fff;border:7px solid #dce6e2;box-shadow:0 8px 16px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center}.scaleDial span{font-size:19px;font-weight:900;color:#173f4a}.scaleDial small{font-weight:900;color:#738092;margin-left:2px}@media(max-width:780px){.racketCutaway{grid-template-columns:1fr}.zoomArrow b{display:block;transform:rotate(90deg)}.cutawayExplain,.starCaseGrid,.parameterExplainGrid,.handleVisualGrid,.weightGrid{grid-template-columns:1fr}.structureLongCard{grid-template-columns:1fr}.choiceTable>div{grid-template-columns:1fr}.choiceHead{display:none!important}.structureVisual{min-height:180px}}`}</style>
  </main>;
}
