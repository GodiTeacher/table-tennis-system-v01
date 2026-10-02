import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {publicThemeStyle} from '@/lib/public-theme';
import TeamStandardsPage from '@/app/team-standards/page';
import RubberGuidePage from '@/app/rubber-guide/page';
import BladeGuidePage from '@/app/blade-guide/page';
import CareerGuidePage from '@/app/career-guide/page';
import ServiceRulesPage from '@/app/service-rules/page';

const VALID=new Set(['standards','rubber_guide','blade_guide','career_guide','service_rules']);

type PublicTeam={brand_color?:string|null;public_modules?:Record<string,unknown>|null};

export default async function PublicFullGuidePage({params}:{params:Promise<{slug:string;module:string}>}){
  const {slug,module}=await params;if(!VALID.has(module))notFound();
  const supabase=await createClient();
  const {data:rows}=await supabase.rpc('get_public_team',{target_slug:slug});
  const team=rows?.[0] as PublicTeam|undefined;
  const mods=team?.public_modules||{};
  if(!team||mods[module]!==true||mods[`full_${module}`]!==true)notFound();

  let content:React.ReactNode=null;
  if(module==='standards')content=<TeamStandardsPage/>;
  if(module==='rubber_guide')content=<RubberGuidePage searchParams={Promise.resolve({})}/>;
  if(module==='blade_guide')content=<BladeGuidePage searchParams={Promise.resolve({})}/>;
  if(module==='career_guide')content=<CareerGuidePage/>;
  if(module==='service_rules')content=<ServiceRulesPage/>;

  return <div className={`parentFullPage full-${module}`} style={publicThemeStyle(mods,team.brand_color)}>
    <div className="parentFullBack"><Link href={`/p/${slug}/more`}>← 返回更多</Link><Link href={`/p/${slug}`}>首頁</Link></div>
    {content}
    <style>{`
      .parentFullPage{min-height:100vh;padding-bottom:92px;background:radial-gradient(circle at 92% 4%,color-mix(in srgb,var(--public-primary) 10%,transparent) 0 120px,transparent 122px),linear-gradient(180deg,var(--public-page) 0%,color-mix(in srgb,var(--public-page) 72%,white) 100%);--theme-primary:var(--public-primary);--theme-soft:var(--public-soft);--theme-page:var(--public-page);--theme-accent:var(--public-accent);--theme-border:var(--public-border);--theme-hero-a:color-mix(in srgb,var(--public-primary) 12%,white);--theme-hero-b:color-mix(in srgb,var(--public-accent) 8%,white)}
      .parentFullBack{max-width:900px;margin:0 auto;padding:14px 16px 2px;display:flex;gap:8px;flex-wrap:wrap}.parentFullBack a{padding:9px 13px;border-radius:999px;background:rgba(255,255,255,.94);border:1px solid var(--public-border);text-decoration:none;color:var(--public-primary);font-size:12px;font-weight:900;box-shadow:0 5px 15px #5c52640d}.parentFullPage .shell{padding-top:16px;padding-bottom:32px}.parentFullPage .hero{background:linear-gradient(135deg,var(--theme-hero-a),var(--theme-hero-b));border:1px solid var(--theme-border);border-radius:24px;padding:24px 22px;margin-bottom:16px;box-shadow:0 12px 30px color-mix(in srgb,var(--public-primary) 9%,transparent)}.parentFullPage .eyebrow,.parentFullPage .sectionTitle span,.parentFullPage .sectionTitle strong{color:var(--theme-primary)}.parentFullPage .card{border-color:var(--theme-border);box-shadow:0 10px 30px rgba(24,33,47,.065)}.parentFullPage .notice{background:var(--theme-soft)}.parentFullPage .topNav{display:none!important}.parentFullPage .guidePriceForm{display:none!important}.parentFullPage .guidePriceRow{grid-template-columns:1fr!important}.full-rubber_guide .equipmentGuide>.card:last-of-type .notice{display:none!important}.full-service_rules .shell>.card:last-of-type{display:none!important}@media(max-width:640px){.parentFullBack{padding-top:10px}.parentFullBack a{flex:1;text-align:center}.parentFullPage .shell{padding-top:10px}.parentFullPage .hero{padding:20px 17px}}
    `}</style>
  </div>;
}
