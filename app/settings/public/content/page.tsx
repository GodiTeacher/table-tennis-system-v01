import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import {createPublicAnnouncement,deletePublicAnnouncement,updateCompetitionPublicInfo,updatePublicAnnouncement} from './actions';

type Search={message?:string;error?:string};
export default async function PublicContentPage({searchParams}:{searchParams:Promise<Search>}){
  const q=await searchParams;const supabase=await createClient();const {data:u}=await supabase.auth.getUser();if(!u.user)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');if(!teamId)redirect('/settings');
  const [{data:member},{data:team},{data:announcements},{data:competitions}]=await Promise.all([
    supabase.from('team_members').select('member_role').eq('team_id',teamId).eq('user_id',u.user.id).single(),
    supabase.from('teams').select('public_slug,public_enabled').eq('id',teamId).single(),
    supabase.from('team_public_announcements').select('id,title,body,pinned,active,priority,attachment_url,published_from,published_until,created_at').eq('team_id',teamId).order('pinned',{ascending:false}).order('created_at',{ascending:false}),
    supabase.from('competitions').select('id,name,start_date,end_date,status,public_show_roster,public_meeting_time,public_meeting_place,public_clothing,public_notes').eq('team_id',teamId).order('start_date',{ascending:false}).limit(20)
  ]);
  if(!member||!['owner','admin'].includes(member.member_role))redirect('/settings/public');
  const publicUrl=team?.public_slug?`/p/${team.public_slug}`:'';
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">PARENT PORTAL · PHASE 3</div><h1>家長公開內容</h1><p>公告、比賽集合資訊與參賽名單都集中在這裡管理；只有你主動開放的資料才會出現在家長頁。</p><div className="topNav"><Link href="/settings/public">公開設定</Link>{team?.public_enabled&&publicUrl?<Link href={publicUrl} target="_blank">預覽家長頁</Link>:null}</div></section>
    {q.message?<div className="notice successNotice">✓ {q.message}</div>:null}{q.error?<div className="notice errorNotice">{q.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>新增家長公告</h2></div></div>
      <form action={createPublicAnnouncement} className="announcementCreate">
        <label>標題<input name="title" required placeholder="例如：縣長盃集合提醒"/></label>
        <label>重要程度<select name="priority" defaultValue="normal"><option value="normal">一般</option><option value="reminder">提醒</option><option value="important">重要</option></select></label>
        <label className="wide">內容<textarea name="body" rows={4} required placeholder="公告內容…"/></label>
        <label>開始公開<input type="date" name="published_from"/></label><label>公開至<input type="date" name="published_until"/></label>
        <label className="wide">圖片／附件連結<input name="attachment_url" type="url" placeholder="https://…（可留空）"/><small>先使用圖片或雲端檔案的公開連結，避免增加網站上傳負擔。</small></label>
        <label className="check"><input type="checkbox" name="pinned"/> 置頂公告</label><button className="primaryButton wide">＋ 新增公告</button>
      </form>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>公告管理</h2></div><strong>{announcements?.length??0} 則</strong></div>
      {!announcements?.length?<p className="muted">目前尚未建立家長公告。</p>:<div className="announcementAdminList">{announcements.map(a=><article key={a.id}>
        <form action={updatePublicAnnouncement} className="announcementEdit"><input type="hidden" name="announcement_id" value={a.id}/>
          <label>標題<input name="title" defaultValue={a.title} required/></label>
          <label>重要程度<select name="priority" defaultValue={a.priority||'normal'}><option value="normal">一般</option><option value="reminder">提醒</option><option value="important">重要</option></select></label>
          <label className="wide">內容<textarea name="body" rows={3} defaultValue={a.body} required/></label>
          <label>開始公開<input type="date" name="published_from" defaultValue={a.published_from??''}/></label><label>公開至<input type="date" name="published_until" defaultValue={a.published_until??''}/></label>
          <label className="wide">圖片／附件連結<input name="attachment_url" type="url" defaultValue={a.attachment_url??''} placeholder="https://…"/></label>
          <div className="checks"><label><input type="checkbox" name="pinned" defaultChecked={a.pinned}/> 置頂</label><label><input type="checkbox" name="active" defaultChecked={a.active}/> 啟用</label></div>
          <button className="secondaryButton">儲存公告</button>
        </form>
        <form action={deletePublicAnnouncement} className="deleteRow"><input type="hidden" name="announcement_id" value={a.id}/><ConfirmSubmitButton className="secondaryButton dangerText" confirmText={`確定要刪除「${a.title}」嗎？`}>刪除</ConfirmSubmitButton></form>
      </article>)}</div>}
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>比賽家長公開資訊</h2></div><strong>逐場設定</strong></div>
      <div className="notice"><b>建議：</b>集合時間、集合地點、穿著與注意事項可以公開；參賽名單仍維持逐場決定，預設不公開。</div>
      <div className="competitionPublicList">{(competitions??[]).map(c=><form action={updateCompetitionPublicInfo} key={c.id} className="competitionPublicCard">
        <input type="hidden" name="competition_id" value={c.id}/>
        <div className="compHeading"><div><b>{c.name}</b><span>{c.start_date}{c.end_date&&c.end_date!==c.start_date?` ～ ${c.end_date}`:''}</span></div><label className="rosterToggle"><input type="checkbox" name="public_show_roster" defaultChecked={c.public_show_roster}/><span>公開參賽名單</span></label></div>
        <div className="compFields"><label>集合時間<input name="public_meeting_time" defaultValue={c.public_meeting_time??''} placeholder="例如 07:20"/></label><label>集合地點<input name="public_meeting_place" defaultValue={c.public_meeting_place??''} placeholder="例如 活動中心門口"/></label><label>穿著<input name="public_clothing" defaultValue={c.public_clothing??''} placeholder="例如 球隊外套＋比賽服"/></label><label>家長注意事項<textarea name="public_notes" rows={2} defaultValue={c.public_notes??''} placeholder="例如：請自備水壺、球拍與健保卡。"/></label></div>
        <button className="secondaryButton saveComp">儲存這場公開資訊</button>
      </form>)}</div>
    </section>

    <style>{`
      .announcementCreate,.announcementEdit{display:grid;grid-template-columns:1fr 1fr;gap:11px}.announcementCreate label,.announcementEdit label,.compFields label{font-size:12px;font-weight:800;color:#667386}.announcementCreate input,.announcementCreate textarea,.announcementCreate select,.announcementEdit input,.announcementEdit textarea,.announcementEdit select,.compFields input,.compFields textarea{width:100%;margin-top:5px;border:1px solid #dce2e9;border-radius:11px;padding:11px 12px;font:inherit;background:#fff}.announcementCreate .wide,.announcementEdit .wide{grid-column:1/-1}.announcementCreate .check{display:flex;align-items:center;gap:6px}.announcementCreate .check input{width:auto;margin:0}.announcementCreate small{display:block;margin-top:4px;color:#8a94a3;font-weight:500}.announcementAdminList,.competitionPublicList{display:grid;gap:12px}.announcementAdminList article,.competitionPublicCard{border:1px solid #e1e6ec;border-radius:18px;padding:14px;background:#fff}.checks{display:flex;gap:14px;align-items:center}.checks label{display:flex;align-items:center;gap:5px}.checks input{width:auto;margin:0}.deleteRow{display:flex;justify-content:flex-end;margin-top:8px}.dangerText{color:#a33}.compHeading{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.compHeading b,.compHeading span{display:block}.compHeading span{font-size:11px;color:#7e8999;margin-top:3px}.rosterToggle{display:flex;gap:7px;align-items:center;font-size:12px;font-weight:900;white-space:nowrap}.rosterToggle input{width:18px;height:18px}.compFields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.compFields label:last-child{grid-column:1/-1}.saveComp{margin-top:11px;margin-left:auto;display:block}@media(max-width:680px){.announcementCreate,.announcementEdit,.compFields{grid-template-columns:1fr}.announcementCreate .wide,.announcementEdit .wide,.compFields label:last-child{grid-column:auto}.compHeading{align-items:flex-start;flex-direction:column}.saveComp{width:100%}}
    `}</style>
  </main>;
}
