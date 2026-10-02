import Link from 'next/link';
import {redirect} from 'next/navigation';
import PublicPortalSettingsForm from '@/components/PublicPortalSettingsForm';
import {createClient} from '@/lib/supabase/server';

type TeamPublic={public_enabled:boolean;public_slug:string|null;public_description:string|null;public_modules:Record<string,boolean>|null};

export default async function PublicSettingsPage(){
  const supabase=await createClient();
  const {data:userData}=await supabase.auth.getUser();
  const user=userData.user;if(!user)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/settings');
  const [{data:team},{data:member}]=await Promise.all([
    supabase.from('teams').select('public_enabled,public_slug,public_description,public_modules').eq('id',teamId).single(),
    supabase.from('team_members').select('member_role').eq('team_id',teamId).eq('user_id',user.id).single(),
  ]);
  const canManage=member?.member_role==='owner'||member?.member_role==='admin';
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">PARENT PORTAL</div><h1>家長／訪客公開設定</h1><p>決定哪些內容可以不用登入查看。學生個資、教練薪酬、收入支出與內部紀錄不會出現在公開頁。</p><div className="topNav"><Link href="/settings">返回設定</Link>{canManage?<Link href="/settings/public/content">管理公開內容</Link>:null}<Link href="/more">更多</Link></div></section>
    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>公開頁狀態</h2></div><strong>{canManage?'管理員可編輯':'僅檢視'}</strong></div><PublicPortalSettingsForm team={(team as TeamPublic)} canManage={canManage}/></section>
    {canManage?<section className="card"><div className="sectionTitle"><div><span>02</span><h2>公開內容管理</h2></div><strong>Phase 3</strong></div><p className="muted">建立家長公告、安排置頂與公開期間，並逐場決定比賽參賽學生姓名是否公開。</p><Link href="/settings/public/content" className="primaryButton" style={{display:'inline-block',textDecoration:'none'}}>管理家長公告與比賽公開內容</Link></section>:null}
    <section className="card"><div className="sectionTitle"><div><span>{canManage?'03':'02'}</span><h2>安全原則</h2></div></div><div className="notice"><b>公開頁只讀：</b>訪客不會取得管理功能，也不會透過公開資料接口讀到學生出勤明細、車資、付款狀態、教練薪酬或營運收支。參賽學生姓名仍預設不公開，必須由管理員逐場開啟。</div></section>
  </main>;
}
