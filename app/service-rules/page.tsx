import Link from 'next/link';
import ServiceRulesShare from '@/components/ServiceRulesShare';

const SELF_SERVICE_FEES = [
  ['更換球皮', '一面', '$100'],
  ['再次黏貼', '一次', '$50'],
  ['更換球板', '一次', '$200'],
  ['更換護邊', '一次', '$50'],
];

const NOTES = [
  '請事先與教練確認時間，勿臨時拿來更換，以免影響訓練課程。',
  '僅提供黏貼、裁切、換板、換護邊等服務；器材挑選建議如有需要可另外與教練討論。',
  '自行購買器材，請先確認規格正確且品質無瑕疵；若因器材本身問題導致無法施工，恕不負責。',
  '教練代訂之球皮，如後續發生脫膠，可免費協助重新黏貼，不另收黏貼耗材費；球皮、球板及護邊屬消耗品，自然磨損或損壞不在此服務範圍內。',
  '每月訓練費不包含球皮、球板、護邊等器材與更換費用。',
  '若有特殊需求，例如特殊膠水、特殊裁切方式等，請先與教練討論，可能另行收費。',
];

export default function ServiceRulesPage(){
  return <main className="shell">
    <section className="hero compactHero">
      <div className="eyebrow">EQUIPMENT SERVICE</div>
      <h1>球皮／球板代工規則</h1>
      <p>統一整理球皮、球板、護邊的代訂、更換、黏貼、裁切與收費方式，方便教練與家長查詢。</p>
      <div className="topNav"><Link href="/more">← 返回更多</Link><Link href="/rubber-catalog">球皮資料庫</Link><Link href="/competition-rubbers">比賽球皮管理</Link></div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>教練協助訂購球皮／球板</h2></div><strong>黏貼、裁切免費</strong></div>
      <div className="notice successNotice"><b>教練代訂優惠</b><br/>由教練協助訂購球皮或球板，可免費協助球皮黏貼與裁切。</div>
      <div className="serviceRuleGrid">
        <article><b>球皮黏貼／裁切</b><strong>免費</strong><span>教練代訂器材適用</span></article>
        <article><b>加購護邊</b><strong>$30</strong><span>依需求加購</span></article>
        <article><b>後續脫膠重新黏貼</b><strong>免費</strong><span>教練代訂球皮，不另收黏貼耗材費</span></article>
      </div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>自行購買器材｜代工費用</h2></div></div>
      <p className="muted">自行購買球皮或球板，如需要教練協助更換、黏貼或裁切，依下列費用收取。</p>
      <div className="feeGrid">
        {SELF_SERVICE_FEES.map(([name,unit,price])=><article key={name}><span>{name}</span><small>{unit}</small><strong>{price}</strong></article>)}
      </div>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>03</span><h2>注意事項</h2></div></div>
      <ol className="serviceNotes">{NOTES.map((note,index)=><li key={note}><span>{index+1}</span><p>{note}</p></li>)}</ol>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>04</span><h2>家長公告</h2></div></div>
      <p className="muted">需要在家長群組公告時，可直接複製整理好的簡短版本。</p>
      <ServiceRulesShare />
    </section>

    <style>{`.serviceRuleGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.serviceRuleGrid article,.feeGrid article{border:1px solid var(--theme-border,#e1e6ec);border-radius:16px;padding:16px;background:#fff}.serviceRuleGrid article{display:flex;flex-direction:column;gap:7px}.serviceRuleGrid article strong{font-size:24px;color:var(--theme-primary,#273444)}.serviceRuleGrid article span,.feeGrid small{color:#738093}.feeGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.feeGrid article{display:flex;flex-direction:column;gap:5px}.feeGrid span{font-weight:800}.feeGrid strong{font-size:26px;color:#c93d3d;margin-top:4px}.serviceNotes{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}.serviceNotes li{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;padding:12px;border-bottom:1px dashed #dce2ea}.serviceNotes li:last-child{border-bottom:0}.serviceNotes li>span{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--theme-primary,#273444);color:#fff;font-weight:900}.serviceNotes p{margin:3px 0 0;line-height:1.7}@media(max-width:760px){.serviceRuleGrid{grid-template-columns:1fr}.feeGrid{grid-template-columns:1fr 1fr}}`}</style>
  </main>;
}
