const MEN = [
  {rank:1,name:'王楚欽 WANG Chuqin',country:'中國',blade:'DHS Hurricane King',fh:'Hurricane III National Blue Sponge',bh:'Hurricane 8',style:'左手橫拍進攻型；近台速度快、前三板主動、兩面銜接強。',ok:true},
  {rank:2,name:'Félix Lebrun',country:'法國',blade:'TIBHAR Félix Lebrun Hyper Carbon',fh:'Hybrid K3 Pro',bh:'Hybrid K3 Pro',style:'直拍進攻型；反手直拍橫打、快速搶攻與近台節奏突出。',ok:true},
  {rank:3,name:'松島輝空 MATSUSHIMA Sora',country:'日本',blade:'Butterfly Fan Zhendong ALC',fh:'Dignics 09C',bh:'ZYRE-03',style:'橫拍進攻型；正反手銜接快，近台主動上手能力強。',ok:true},
  {rank:4,name:'張本智和 HARIMOTO Tomokazu',country:'日本',blade:'Harimoto Tomokazu Innerforce Super ALC',fh:'Dignics 05',bh:'ZYRE-03',style:'橫拍進攻型；近台兩面進攻、快速反撕反拉與節奏壓迫。',ok:true},
  {rank:5,name:'Truls Möregårdh',country:'瑞典',blade:'STIGA Cybershape Carbon',fh:'Helix Platinum HX',bh:'Helix Platinum HX',style:'橫拍進攻型；變化多、節奏感強，擅長創意處理與正手進攻。',ok:true},
  {rank:6,name:'林昀儒 LIN Yun-Ju',country:'台灣',blade:'Butterfly Lin Yun-Ju Super ZLC',fh:'ZYRE-03',bh:'Dignics 05',style:'左手橫拍進攻型；反手擰拉、快速反拉、小球手感細膩。',ok:true},
  {rank:7,name:'Hugo Calderano',country:'巴西',blade:'Hugo Calderano SAL',fh:'Trinity Hugo Calderano Charge',bh:'Trinity Hugo Calderano Dynamic',style:'橫拍進攻型；力量與速度兼具，中近台連續進攻能力強。',ok:true},
  {rank:8,name:'林詩棟 LIN Shidong',country:'中國',blade:'尚未確認可靠公開資料',fh:'NEO Hurricane 3',bh:'Dignics 09C',style:'橫拍進攻型；反手主動性強，近台快節奏與連續銜接突出。',ok:false},
  {rank:9,name:'Alexis Lebrun',country:'法國',blade:'TIBHAR Alexis Lebrun Krypto Carbon',fh:'Hybrid K3 Pro',bh:'Hybrid K3 Pro',style:'橫拍進攻型；反手質量高、正反手轉換快，主動搶攻明確。',ok:true},
  {rank:10,name:'邱黨 QIU Dang',country:'德國',blade:'尚未確認可靠公開資料',fh:'Dignics 09C',bh:'Dignics 09C',style:'直拍進攻型；直拍橫打成熟，反手連續與正手銜接均衡。',ok:false},
] as const;

const WOMEN = [
  {rank:1,name:'王曼昱 WANG Manyu',country:'中國',blade:'尚未確認可靠公開資料',fh:'尚未確認',bh:'尚未確認',style:'橫拍進攻型；身材條件與覆蓋面大，正反手連續進攻強。',ok:false},
  {rank:2,name:'孫穎莎 SUN Yingsha',country:'中國',blade:'DHS Hurricane Sun FL',fh:'Hurricane III National Blue Sponge',bh:'Hurricane III National Blue Sponge',style:'橫拍進攻型；近台速度、前三板與正反手轉換非常突出。',ok:true},
  {rank:3,name:'張本美和 HARIMOTO Miwa',country:'日本',blade:'Harimoto Tomokazu Innerforce Super ALC',fh:'ZYRE-03',bh:'Dignics 05',style:'橫拍進攻型；近台速度快、反手穩定，兩面連續進攻成熟。',ok:true},
  {rank:4,name:'蒯曼 KUAI Man',country:'中國',blade:'尚未確認可靠公開資料',fh:'尚未確認',bh:'尚未確認',style:'橫拍進攻型；近台快速兩面進攻，節奏與銜接能力強。',ok:false},
  {rank:5,name:'王藝迪 WANG Yidi',country:'中國',blade:'尚未確認可靠公開資料',fh:'尚未確認',bh:'尚未確認',style:'橫拍進攻型；力量型兩面進攻，反手對抗與中近台連續性佳。',ok:false},
  {rank:6,name:'早田希娜 HAYATA Hina',country:'日本',blade:'Nittaku Hina Hayata H2',fh:'Hurricane III National Blue Sponge',bh:'Hurricane III National Blue Sponge',style:'左手橫拍進攻型；正手威力大，發接發與兩面主動進攻均衡。',ok:true},
  {rank:7,name:'陳幸同 CHEN Xingtong',country:'中國',blade:'DHS Hurricane Long 5',fh:'Hurricane III National Blue Sponge',bh:'Dignics 05',style:'橫拍進攻型；基本功扎實，反手穩定，連續相持能力突出。',ok:true},
  {rank:8,name:'朱雨玲 ZHU Yuling',country:'澳門',blade:'Butterfly Viscaria',fh:'Tenergy 05 Hard',bh:'Dignics 09C',style:'橫拍進攻型；控制與相持能力強，節奏穩定、落點細膩。',ok:true},
  {rank:9,name:'Sabine Winter',country:'德國',blade:'Andro Novacell OFF/S',fh:'NUZN 55',bh:'Rasanter R53',style:'橫拍進攻型；正反手均衡，歐洲力量型與速度型打法結合。',ok:true},
  {rank:10,name:'陳熠 CHEN Yi',country:'中國',blade:'尚未確認可靠公開資料',fh:'尚未確認',bh:'尚未確認',style:'橫拍進攻型；近台兩面進攻與快速銜接為主要方向。',ok:false},
] as const;

function RankingTable({title,rows}:{title:string;rows:readonly typeof MEN[number][] | readonly typeof WOMEN[number][]}){
  return <div className="worldEquipmentBlock">
    <h3>{title}</h3>
    <div className="worldEquipmentTableWrap"><table className="worldEquipmentTable"><thead><tr><th>排名</th><th>選手</th><th>球板</th><th>正手球皮</th><th>反手球皮</th><th>打法重點</th></tr></thead><tbody>{rows.map(row=><tr key={`${title}-${row.rank}`}>
      <td><b>#{row.rank}</b></td><td><strong>{row.name}</strong><small>{row.country}</small></td><td>{row.blade}{!row.ok&&row.blade.includes('尚未確認')?<em>待補</em>:null}</td><td>{row.fh}</td><td>{row.bh}</td><td>{row.style}</td>
    </tr>)}</tbody></table></div>
  </div>;
}

export default function WorldTop10Equipment({sectionNumber='08'}:{sectionNumber?:string}){
  return <section className="shell" style={{paddingTop:0}}><section className="card worldEquipmentSection">
    <div className="sectionTitle"><div><span>{sectionNumber}</span><h2>世界排名前 10 選手器材</h2></div><strong>2026 Week 40</strong></div>
    <div className="notice"><b>排名基準：</b>2026/09/29 公布的 ITTF Week 40 單打排名。器材來自公開品牌資料與 Tabletennis Reference；職業選手器材可能因贊助、版本、客製化或時間而改變。查不到可靠公開資料時會明確標示「尚未確認」，不以推測補齊。</div>
    <RankingTable title="男子世界前 10" rows={MEN}/><RankingTable title="女子世界前 10" rows={WOMEN}/>
    <div className="worldEquipmentSources"><a href="https://www.ittf.com/ittf-table-tennis-world-ranking/" target="_blank" rel="noreferrer">ITTF 世界排名</a><a href="https://tabletennis-reference.com/player/world_ranking" target="_blank" rel="noreferrer">器材／排名交叉查詢</a></div>
    <style>{`.worldEquipmentSection{margin-top:16px}.worldEquipmentBlock{margin-top:20px}.worldEquipmentBlock h3{margin:0 0 10px}.worldEquipmentTableWrap{overflow:auto;border:1px solid #e0e6ec;border-radius:16px}.worldEquipmentTable{width:100%;min-width:1120px;border-collapse:collapse;background:#fff}.worldEquipmentTable th,.worldEquipmentTable td{padding:12px 11px;border-bottom:1px solid #edf0f3;text-align:left;vertical-align:top;font-size:13px;line-height:1.5}.worldEquipmentTable th{background:#f5f8f7;color:#506073;font-size:12px;position:sticky;top:0}.worldEquipmentTable td:first-child{width:58px}.worldEquipmentTable td:nth-child(2){min-width:170px}.worldEquipmentTable td:nth-child(3),.worldEquipmentTable td:nth-child(4),.worldEquipmentTable td:nth-child(5){min-width:170px}.worldEquipmentTable td:nth-child(6){min-width:250px}.worldEquipmentTable small{display:block;color:#7b8797;margin-top:3px}.worldEquipmentTable em{display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;background:#fff1d9;color:#8a5a14;font-size:10px;font-style:normal;font-weight:900}.worldEquipmentSources{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.worldEquipmentSources a{padding:8px 11px;border:1px solid #dce3e9;border-radius:999px;text-decoration:none;color:inherit;background:#fff;font-weight:800;font-size:12px}@media(max-width:760px){.worldEquipmentSection{margin-top:10px}.worldEquipmentTableWrap{border-radius:12px}}`}</style>
  </section></section>;
}
