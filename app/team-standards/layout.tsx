import Link from 'next/link';

const NAV=[
  ['team','01 隊員基本'],['competition','02 外出比賽'],['payment','03 收退費'],['leave','04 請假／費用'],['equipment','05 器材'],['transport','06 比賽接送'],['parent','07 家長配合'],['reward','08 點數'],['venue','09 場地清潔'],['aircon','10 冷氣費用'],
] as const;

export default function TeamStandardsLayout({children}:{children:React.ReactNode}){
  return <>
    <div className="standardsStickyNav" aria-label="球隊規範快速導覽">
      <div className="standardsStickyInner">
        <Link href="/more">返回更多</Link>
        {NAV.map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}
      </div>
    </div>
    {children}
    <style>{`
      .standardsStickyNav{position:sticky;top:0;z-index:80;padding:8px 12px;background:color-mix(in srgb,var(--theme-bg,#f5f7fb) 88%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid color-mix(in srgb,var(--theme-primary,#2f7e79) 18%,transparent)}
      .standardsStickyInner{max-width:980px;margin:0 auto;display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;padding:2px}
      .standardsStickyInner a{flex:0 0 auto;text-decoration:none;color:var(--theme-primary,#273444);background:#fff;border:1px solid color-mix(in srgb,var(--theme-primary,#2f7e79) 24%,#dfe5ea);border-radius:12px;padding:8px 10px;font-size:12px;font-weight:900;white-space:nowrap;box-shadow:0 3px 12px rgba(30,45,60,.06)}
      .standardsStickyInner a:hover{background:var(--theme-soft,#eef7f5)}
      .teamStandards .hero .topNav{display:none}
      .teamStandards section[id]{scroll-margin-top:72px}
      @media(max-width:760px){.standardsStickyNav{padding:6px 8px}.standardsStickyInner a{padding:8px 9px;font-size:11px}.teamStandards section[id]{scroll-margin-top:68px}}
    `}</style>
  </>;
}
