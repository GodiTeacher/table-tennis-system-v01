import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';
import {createNfcDevice,rotateNfcDeviceSecret,updateNfcDevice} from './actions';

type Device={
  id:string;name:string;device_key:string;enabled:boolean;mode:string;
  scan_window_minutes:number;max_scans_per_window:number;min_repeat_seconds:number;
  firmware_version:string|null;last_seen_at:string|null;created_at:string;
};
type Membership={member_role:string;permissions:Record<string,boolean>};

export default async function DevicesPage({searchParams}:{searchParams:Promise<{message?:string;error?:string;created?:string;device_key?:string;device_secret?:string}>}){
  const params=await searchParams;
  const {supabase,userId,teamId,entitlements}=await getCurrentTeamEntitlements();
  if(!userId)redirect('/login');
  if(!teamId)redirect('/more');
  if(!hasPlanFeature(entitlements,'nfc_wallet'))redirect('/plans?locked=nfc_wallet');

  const [{data:membershipRow},{data:rows}]=await Promise.all([
    supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle(),
    supabase.from('team_devices').select('id,name,device_key,enabled,mode,scan_window_minutes,max_scans_per_window,min_repeat_seconds,firmware_version,last_seen_at,created_at').eq('team_id',teamId).order('created_at',{ascending:false})
  ]);

  const membership=(membershipRow??{member_role:'coach',permissions:{}}) as Membership;
  const admin=['owner','admin'].includes(membership.member_role);
  const canManage=admin||Boolean(membership.permissions?.nfc_manage);
  if(!canManage)redirect('/more');

  const devices=(rows??[]) as Device[];
  const createdDevice=params.created?devices.find(d=>d.id===params.created):null;

  return <main className="shell deviceShell">
    <section className="hero compactHero">
      <div className="eyebrow">NFC DEVICE V1</div>
      <h1>自助簽到裝置</h1>
      <p>每台 Arduino／ESP8266 感應站使用獨立 Device Key 與 Secret，不登入教練帳號。</p>
      <div className="topNav"><Link href="/more">返回更多</Link><Link href="/wallet">NFC 錢包</Link></div>
    </section>

    {params.message?<div className="notice successNotice">✓ {params.message}</div>:null}
    {params.error?<div className="notice errorNotice">{params.error}</div>:null}

    {params.device_key&&params.device_secret?<section className="secretCard">
      <b>請先保存這組裝置憑證</b>
      <small>Secret 不會再次顯示；遺失時只能重新產生。</small>
      <label>Device Key<code>{params.device_key}</code></label>
      <label>Device Secret<code>{params.device_secret}</code></label>
      <p>之後會把這兩個值燒進 ESP8266。裝置只能執行簽到＋查詢，不具有儲值、扣款或退款權限。</p>
    </section>:null}

    <section className="card">
      <div className="sectionTitle"><div><span>01</span><h2>建立自助機</h2></div></div>
      <form action={createNfcDevice} className="deviceCreateForm">
        <label>裝置名稱<input name="name" defaultValue="管嶼入口機 01" maxLength={60} required/></label>
        <label>限制時間（分鐘）<input name="scan_window_minutes" type="number" min="1" max="1440" defaultValue={30} required/></label>
        <label>期間內最多刷卡次數<input name="max_scans_per_window" type="number" min="1" max="100" defaultValue={3} required/></label>
        <button className="primaryButton">＋ 建立裝置</button>
      </form>
    </section>

    <section className="card">
      <div className="sectionTitle"><div><span>02</span><h2>目前裝置</h2></div><strong>{devices.length} 台</strong></div>
      {!devices.length?<p className="muted">目前尚未建立自助簽到裝置。</p>:<div className="deviceList">
        {devices.map(d=>{
          const online=d.last_seen_at&&Date.now()-new Date(d.last_seen_at).getTime()<10*60*1000;
          return <article key={d.id} className={!d.enabled?'disabled':''}>
            <div className="deviceHead">
              <div><b>{d.name}</b><small>{d.device_key}</small></div>
              <span className={d.enabled?(online?'status online':'status idle'):'status off'}>{d.enabled?(online?'● 在線':'○ 待機'):'已停用'}</span>
            </div>
            <div className="deviceMeta">
              <span>模式：簽到＋查餘額／點數</span>
              <span>{d.scan_window_minutes} 分鐘最多 {d.max_scans_per_window} 次</span>
              <span>硬體防連刷 {d.min_repeat_seconds} 秒</span>
              <span>韌體：{d.firmware_version||'尚未回報'}</span>
              <span>最後連線：{d.last_seen_at?new Date(d.last_seen_at).toLocaleString('zh-TW'):'尚未連線'}</span>
            </div>
            <form action={updateNfcDevice} className="deviceEditForm">
              <input type="hidden" name="id" value={d.id}/>
              <label>名稱<input name="name" defaultValue={d.name} maxLength={60}/></label>
              <label>分鐘<input name="scan_window_minutes" type="number" min="1" max="1440" defaultValue={d.scan_window_minutes}/></label>
              <label>次數<input name="max_scans_per_window" type="number" min="1" max="100" defaultValue={d.max_scans_per_window}/></label>
              <label>狀態<select name="enabled" defaultValue={d.enabled?'1':'0'}><option value="1">啟用</option><option value="0">停用</option></select></label>
              <button className="secondaryButton">儲存</button>
            </form>
            <form action={rotateNfcDeviceSecret} className="rotateForm">
              <input type="hidden" name="id" value={d.id}/>
              <button className="dangerButton">重新產生 Device Secret</button>
            </form>
          </article>;
        })}
      </div>}
    </section>

    <style>{'.deviceShell{max-width:860px}.secretCard{display:grid;gap:8px;margin:14px 0;padding:16px;border-radius:18px;background:#fff7dd;border:1px solid #ead28b}.secretCard>b{font-size:15px}.secretCard small,.secretCard p{color:#786c4b;font-size:11px}.secretCard label{font-size:11px;font-weight:900}.secretCard code{display:block;margin-top:4px;padding:9px;border-radius:9px;background:#fff;overflow-wrap:anywhere;font-size:11px}.deviceCreateForm{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:9px;align-items:end}.deviceCreateForm label,.deviceEditForm label{font-size:10px;font-weight:900;color:#667386}.deviceCreateForm input,.deviceEditForm input,.deviceEditForm select{display:block;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #dce2e8;border-radius:10px;background:#fff;font:inherit}.deviceList{display:grid;gap:10px}.deviceList article{padding:13px;border:1px solid #e3e8ed;border-radius:15px}.deviceList article.disabled{opacity:.65;background:#fafafa}.deviceHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.deviceHead b,.deviceHead small{display:block}.deviceHead small{color:#7b8795;font-size:9px;margin-top:2px}.status{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px}.status.online{background:#e8f7ef;color:#247a4e}.status.idle{background:#eef2f6;color:#677586}.status.off{background:#f3eceb;color:#946158}.deviceMeta{display:flex;flex-wrap:wrap;gap:6px 12px;margin:9px 0;color:#6e7b8c;font-size:10px}.deviceEditForm{display:grid;grid-template-columns:2fr .7fr .7fr .8fr auto;gap:7px;align-items:end}.rotateForm{margin-top:8px;text-align:right}.rotateForm button{font-size:10px}@media(max-width:720px){.deviceCreateForm,.deviceEditForm{grid-template-columns:1fr 1fr}.deviceCreateForm label:first-child,.deviceEditForm label:first-child{grid-column:1/-1}.deviceCreateForm button,.deviceEditForm button{grid-column:1/-1;width:100%}}@media(max-width:430px){.deviceCreateForm,.deviceEditForm{grid-template-columns:1fr}.deviceCreateForm label:first-child,.deviceEditForm label:first-child,.deviceCreateForm button,.deviceEditForm button{grid-column:auto}.deviceHead{align-items:flex-start;flex-direction:column}.rotateForm{text-align:left}.rotateForm button{width:100%}}'}</style>
  </main>;
}
