import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import PublicShareActions from '@/components/PublicShareActions';
import CompetitionPublicImageInput from '@/components/CompetitionPublicImageInput';
import {createPublicAnnouncement,deletePublicAnnouncement,updateCompetitionPublicInfo,updatePublicAnnouncement} from './actions';

type Search={message?:string;error?:string};
export default async function PublicContentPage({searchParams}:{searchParams:Promise<Search>}){
  const q=await searchParams;const supabase=await createClient();const {data:u}=await supabase.auth.getUser();if(!u.user)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');if(!teamId)redirect('/settings');
  const [{data:member},{data:team},{data:announcements},{data:competitions}]=await Promise.all([
    supabase.from('team_members').select('member_role').eq('team_id',teamId).eq('user_id',u.user.id).single(),
    supabase.from('teams').select('public_slug,public_enabled,short_name,name').eq('id',teamId).single(),
    supabase.from('team_public_announcements').select('id,title,body,pinned,active,priority,attachment_url,published_from,published_until,created_at').eq('team_id',teamId).order('pinned',{ascending:false}).order('created_at',{ascending:false}),
    supabase.from('competitions').select('id,name,start_date,end_date,status,location,public_show_roster,public_meeting_time,public_meeting_place,public_clothing,public_notes,public_official_url,public_image_url,public_image_urls').eq('team_id',teamId).order('start_date',{ascending:false}).limit(20)
  ]);
  if(!member||!['owner','admin'].includes(member.member_role))redirect('/settings/public');
  const publicUrl=team?.public_slug?`/p/${team.public_slug}`:'';const teamName=team?.short_name||team?.name||'球隊';
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">PARENT PORTAL · PHASE 4 V1</div><h1>家長公開內容</h1><p>公告、比賽集合資訊、官方連結與分享文字都集中在這裡管理；只有你主動開放的資料才會出現在家長頁。</p><div className="topNav"><Link href="/settings/public">公開設定</Link>{team?.public_enabled&&publicUrl?<Link href={publicUrl} target="_blank">預覽家長頁</Link>:null}</div></section>
    {q.message?<div className="notice successNotice">✓ {q.message}</div>:null}{q.error?<div className="notice errorNotice">{q.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>新增家長公告</h2></div></div>
      <form action={createPublicAnnouncement} className="announcementCreate">
        <label>標題<input name="title" required placeholder="例如：縣長盃集合提醒"/></label>
        <label>重要程度<select name="priority" defaultValue="normal"><option value="normal">一般</option><option value="reminder">提醒</option><option value="important">重要</option></select></label>
        <label className="wide">內容<textarea name="body" rows={4} required placeholder="公告內容…"/></label>
        <label>開始公開<input type="date" name="published_from"/></label><label>公開至<input type="date" name="published_until"/></label>
        <label className="wide">圖片／附件連結<input name="attachment_url" type="url" placeholder="https://…（可留空）"/><small>可放公開圖片、Google Drive、簡章或官方資料連結。</small></label>
        <label className="check"><input type="checkbox" name="pinned"/> 置頂公告</label><button className="primaryButton wide">＋ 新增公告</button>
      </form>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>公告管理與分享</h2></div><strong>{announcements?.length??0} 則</strong></div>
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
        <div className="shareDeleteRow"><PublicShareActions label={a.title} text={`📣 ${teamName}｜${a.title}\n${a.body}${a.attachment_url?`\n附件：${a.attachment_url}`:''}`} url={team?.public_slug?`https://table-tennis-system-v01.cramtabletennis.workers.dev/p/${team.public_slug}/announcements`:undefined}/><form action={deletePublicAnnouncement}><input type="hidden" name="announcement_id" value={a.id}/><ConfirmSubmitButton className="secondaryButton dangerText" confirmText={`確定要刪除「${a.title}」嗎？`}>刪除</ConfirmSubmitButton></form></div>
      </article>)}</div>}
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>比賽家長公開資訊</h2></div><strong>逐場設定</strong></div>
      <div className="notice"><b>圖片：</b>每場比賽現在可上傳多張照片（最多 6 張）。家長頁會先顯示縮圖，點一下就能全螢幕放大查看。</div>
      <div className="competitionPublicList">{(competitions??[]).map(c=>{const currentImages=(c.public_image_urls?.length?c.public_image_urls:(c.public_image_url?[c.public_image_url]:[])) as string[];return <form action={updateCompetitionPublicInfo} key={c.id} className="competitionPublicCard">
        <input type="hidden" name="competition_id" value={c.id}/>
        <div className="compHeading"><div><b>{c.name}</b><span>{c.start_date}{c.end_date&&c.end_date!==c.start_date?` ～ ${c.end_date}`:''}</span></div><label className="rosterToggle"><input type="checkbox" name="public_show_roster" defaultChecked={c.public_show_roster}/><span>公開參賽名單</span></label></div>
        <div className="compFields"><label>集合時間<input name="public_meeting_time" defaultValue={c.public_meeting_time??''} placeholder="例如 07:20"/></label><label>集合地點<input name="public_meeting_place" defaultValue={c.public_meeting_place??''} placeholder="例如 活動中心門口"/></label><label>穿著<input name="public_clothing" defaultValue={c.public_clothing??''} placeholder="例如 球隊外套＋比賽服"/></label><label>大會／官方網址<input name="public_official_url" type="url" defaultValue={c.public_official_url??''} placeholder="https://…"/></label><label className="wide">另外新增一張圖片網址<input name="public_image_url" type="url" placeholder="https://…（可留空；儲存後會加入圖片清單）"/></label><div className="wide"><CompetitionPublicImageInput currentImages={currentImages}/></div><label className="wide">家長注意事項<textarea name="public_notes" rows={2} defaultValue={c.public_notes??''} placeholder="例如：請自備水壺、球拍與健保卡。"/></label></div>
        <div className="compActionRow"><PublicShareActions label={c.name} text={`🏆 ${teamName}｜${c.name}\n📅 ${c.start_date}${c.end_date&&c.end_date!==c.start_date?`～${c.end_date}`:''}${c.location?`\n📍 ${c.location}`:''}${c.public_meeting_time?`\n🕐 集合 ${c.public_meeting_time}`:''}${c.public_meeting_place?`\n📍 集合地點 ${c.public_meeting_place}`:''}${c.public_clothing?`\n👕 ${c.public_clothing}`:''}${c.public_notes?`\n📌 ${c.public_notes}`:''}${c.public_official_url?`\n🌐 ${c.public_official_url}`:''}`} url={team?.public_slug?`https://table-tennis-system-v01.cramtabletennis.workers.dev/p/${team.public_slug}/competitions`:undefined}/><button className="secondaryButton saveComp">儲存這場公開資訊</button></div>
      </form>})}</div>
    </section>

    <style>{`
      .announcementCreate,.announcementEdit{display:grid;grid-template-columns:1fr 1fr;gap:11px}.announcementCreate label,.announcementEdit label,.compFields label{font-size:12px;font-weight:800;color:#667386}.announcementCreate input,.announcementCreate textarea,.announcementCreate select,.announcementEdit input,.announcementEdit textarea,.announcementEdit select,.compFields input,.compFields textarea{width:100%;margin-top:5px;border:1px solid #dce2e9;border-radius:11px;padding:11px 12px;font:inherit;background:#fff}.announcementCreate .wide,.announcementEdit .wide,.compFields .wide{grid-column:1/-1}.announcementCreate .check{display:flex;align-items:center;gap:6px}.announcementCreate .check input{width:auto;margin:0}.announcementCreate small{display:block;margin-top:4px;color:#8a94a3;font-weight:500}.announcementAdminList,.competitionPublicList{display:grid;gap:12px}.announcementAdminList article,.competitionPublicCard{border:1px solid #e1e6ec;border-radius:18px;padding:14px;background:#fff}.checks{display:flex;gap:14px;align-items:center}.checks label{display:flex;align-items:center;gap:5px}.checks input{width:auto;margin:0}.shareDeleteRow,.compActionRow{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:9px}.dangerText{color:#a33}.compHeading{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.compHeading b,.compHeading span{display:block}.compHeading span{font-size:11px;color:#7e8999;margin-top:3px}.rosterToggle{display:flex;gap:7px;align-items:center;font-size:12px;font-weight:900;white-space:nowrap}.rosterToggle input{width:18px;height:18px}.compFields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.saveComp{margin-left:auto;display:block}@media(max-width:680px){.announcementCreate,.announcementEdit,.compFields{grid-template-columns:1fr}.announcementCreate .wide,.announcementEdit .wide,.compFields .wide{grid-column:auto}.compHeading{align-items:flex-start;flex-direction:column}.saveComp{width:100%}.shareDeleteRow,.compActionRow{display:grid;grid-template-columns:1fr;width:100%}}
    `}</style>
  </main>;
}
