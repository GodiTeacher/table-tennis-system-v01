import { createClient } from '@/lib/supabase/server';
import { saveGuidePreference } from '@/app/equipment-guide/actions';

const LABELS:Record<string,string>={fl:'FL 喇叭柄',st:'ST 直柄',an:'AN 葫蘆柄',mixed:'混合使用',unset:'尚未設定'};

export default async function BladeGuideTeamPreference(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId)return null;
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)return null;
  const [{data:pref},{data:member}]=await Promise.all([
    supabase.from('equipment_guide_preferences').select('preference_value').eq('team_id',teamId).eq('preference_key','team_handle_style').maybeSingle(),
    supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).single(),
  ]);
  const permissions=(member?.permissions??{}) as Record<string,unknown>;
  const canEdit=member?.member_role==='owner'||member?.member_role==='admin'||permissions.equipment===true;
  const current=pref?.preference_value??'unset';
  return <section className="shell" style={{paddingTop:0}}><section className="card" style={{marginTop:0}}>
    <div className="sectionTitle"><div><span>07</span><h2>本隊目前主要握柄</h2></div><strong>{LABELS[current]??current}</strong></div>
    <p className="muted">FL 是目前市售橫拍最主流的握柄；但球隊實際配置不應靠系統猜測，所以這裡由教練自行設定。</p>
    {canEdit?<form action={saveGuidePreference} className="inlineForm" style={{alignItems:'end'}}><input type="hidden" name="preference_key" value="team_handle_style"/><label style={{flex:1,fontWeight:800,color:'#536174'}}>球隊主要握柄<select name="preference_value" defaultValue={current} style={{display:'block',width:'100%',marginTop:7,padding:'12px 13px',border:'1px solid #dce2ea',borderRadius:12,background:'#fff'}}><option value="unset">尚未設定</option><option value="fl">FL 喇叭柄</option><option value="st">ST 直柄</option><option value="an">AN 葫蘆柄</option><option value="mixed">混合使用</option></select></label><button className="secondaryButton">儲存球隊設定</button></form>:<div className="notice">你目前沒有器材設定權限，可查看但不能修改。</div>}
  </section></section>;
}
