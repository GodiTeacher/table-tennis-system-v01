import Link from 'next/link';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import { setTheme } from './actions';

const THEMES = [
  {
    id: 'current',
    name: '目前配色',
    desc: '維持現在的灰白、深藍灰風格，最中性。',
    swatches: ['#273444', '#edf1f5', '#ffffff'],
  },
  {
    id: 'clean',
    name: '專業清爽',
    desc: '藍綠＋淡橘，乾淨、穩定，又比目前更有層次。',
    swatches: ['#2f7e79', '#e7f5f3', '#f6b94c'],
  },
  {
    id: 'teaching',
    name: '活潑教學感',
    desc: '柔和藍＋暖黃，適合教學與學生管理，但不會太花。',
    swatches: ['#4f73b8', '#edf3ff', '#f2bf4d'],
  },
  {
    id: 'competitive',
    name: '競技感',
    desc: '深藍綠＋亮橘，對比更明確，偏球隊與比賽風格。',
    swatches: ['#173f4a', '#e8f1f2', '#e97835'],
  },
  {
    id: 'sunset',
    name: '晴空珊瑚',
    desc: '亮藍＋珊瑚橘＋暖黃，比較繽紛，但維持乾淨底色。',
    swatches: ['#2f80d0', '#ff7a6b', '#ffd66b'],
  },
  {
    id: 'berry',
    name: '莓果繽紛',
    desc: '莓紫＋粉紅＋奶油黃，活潑柔和，適合想要更有個性的介面。',
    swatches: ['#8358b3', '#ec6f91', '#ffd978'],
  },
  {
    id: 'pingpong',
    name: '桌球主題',
    desc: '球桌綠＋球拍紅，背景加入低調桌球拍與球的圖案。',
    swatches: ['#0f6b58', '#e23c3c', '#ffffff'],
  },
] as const;

const ROLE_TEXT: Record<string, string> = {
  owner: '擁有者',
  admin: '管理員',
  coach: '一般成員',
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect('/login');

  const [{ data: profile }, { data: teamId }] = await Promise.all([
    supabase.from('profiles').select('display_name,role,platform_admin,theme_preference').eq('id', user.id).single(),
    supabase.rpc('current_team_id'),
  ]);

  let team: { school_name: string | null; sport_name: string | null; name: string } | null = null;
  let memberRole = '';
  if (teamId) {
    const [{ data: teamData }, { data: membership }] = await Promise.all([
      supabase.from('teams').select('school_name,sport_name,name').eq('id', teamId).single(),
      supabase.from('team_members').select('member_role').eq('team_id', teamId).eq('user_id', user.id).single(),
    ]);
    team = teamData ?? null;
    memberRole = membership?.member_role ?? '';
  }

  const canManageAccounts = Boolean(profile?.platform_admin || memberRole === 'owner' || memberRole === 'admin');
  const currentTheme = profile?.theme_preference ?? 'current';

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">SETTINGS</div>
        <h1>設定</h1>
        <p>集中管理介面風格、帳號、隊伍資訊與登入狀態。</p>
        <div className="topNav"><Link href="/more">← 返回更多</Link></div>
      </section>

      {params.message ? <div className="notice successNotice">{params.message}</div> : null}
      {params.error ? <div className="notice errorNotice">{params.error}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>介面主題</h2></div><strong>目前：{THEMES.find((theme) => theme.id === currentTheme)?.name ?? '目前配色'}</strong></div>
        <p className="muted">主題只套用在你自己的帳號，不會改到同隊其他教練的介面。現在共有 7 種風格可選。</p>
        <div className="themeChoiceGrid">
          {THEMES.map((theme) => (
            <form action={setTheme} key={theme.id} className={`themeChoiceCard ${currentTheme === theme.id ? 'selected' : ''}`}>
              <input type="hidden" name="theme" value={theme.id} />
              <div className="themeSwatches" aria-hidden="true">
                {theme.swatches.map((color) => <span key={color} style={{ background: color }} />)}
              </div>
              <div className="themeChoiceText"><b>{theme.name}</b><p>{theme.desc}</p></div>
              <button className={currentTheme === theme.id ? 'primaryButton' : 'secondaryButton'} disabled={currentTheme === theme.id}>
                {currentTheme === theme.id ? '目前使用中' : '套用主題'}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>目前帳號與隊伍</h2></div>{memberRole ? <strong>{ROLE_TEXT[memberRole] ?? memberRole}</strong> : null}</div>
        <div className="notice">
          <b>{profile?.display_name || '未設定名稱'}</b><br />
          <span>{user.email}</span>
          {team ? <><br /><span className="muted">{team.school_name || '未設定學校'}｜{team.sport_name || '未設定運動'}｜{team.name}</span></> : <><br /><span className="muted">目前尚未加入學校／隊伍</span></>}
        </div>
        <div className="settingsActionGrid">
          <Link className="settingsActionCard" href="/account"><b>帳號設定</b><span>更換密碼、刪除帳號</span></Link>
          {canManageAccounts ? <Link className="settingsActionCard" href="/more/accounts"><b>帳號申請管理</b><span>審核加入隊伍與權限</span></Link> : null}
          {!team ? <Link className="settingsActionCard" href="/access-request"><b>學校／隊伍申請</b><span>申請加入或建立隊伍</span></Link> : null}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>登入狀態</h2></div></div>
        <p className="muted">使用共用裝置或離開球隊電腦時，建議登出帳號。</p>
        <LogoutButton />
      </section>
    </main>
  );
}
