import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import TeamStandardsPage from '@/app/team-standards/page';
import RubberGuidePage from '@/app/rubber-guide/page';
import BladeGuidePage from '@/app/blade-guide/page';
import CareerGuidePage from '@/app/career-guide/page';
import ServiceRulesPage from '@/app/service-rules/page';

const VALID=new Set(['standards','rubber_guide','blade_guide','career_guide','service_rules']);

export default async function PublicFullGuidePage({params}:{params:Promise<{slug:string;module:string}>}){
  const {slug,module}=await params;if(!VALID.has(module))notFound();
  const supabase=await createClient();const {data:rows}=await supabase.rpc('get_public_team',{target_slug:slug});const team=rows?.[0] as {public_modules?:Record<string,unknown>|null}|undefined;
  const mods=team?.public_modules||{};
  if(!team||mods[module]!==true||mods[`full_${module}`]!==true)notFound();
  let content:React.ReactNode=null;
  if(module==='standards')content=<TeamStandardsPage/>;
  if(module==='rubber_guide')content=<RubberGuidePage searchParams={Promise.resolve({})}/>;
  if(module==='blade_guide')content=<BladeGuidePage searchParams={Promise.resolve({})}/>;
  if(module==='career_guide')content=<CareerGuidePage/>;
  if(module==='service_rules')content=<ServiceRulesPage/>;
  return <div className={`parentFullPage full-${module}`}>
    <div className="parentFullBack"><Link href={`/p/${slug}/more`}>← 返回家長更多</Link><Link href={`/p/${slug}`}>家長首頁</Link></div>
    {content}
    <style>{`
      .parentFullPage{padding-bottom:92px}.parentFullBack{max-width:900px;margin:12px auto 0;padding:0 16px;display:flex;gap:8px;flex-wrap:wrap}.parentFullBack a{padding:8px 11px;border-radius:999px;background:#fff;border:1px solid #e2e5eb;text-decoration:none;color:#586477;font-size:12px;font-weight:900;box-shadow:0 5px 15px #5c52640d}.parentFullPage .topNav{display:none!important}.parentFullPage .guidePriceForm{display:none!important}.full-rubber_guide .equipmentGuide>.card:last-of-type .notice{display:none!important}.full-service_rules .shell>.card:last-of-type{display:none!important}.parentFullPage .shell{padding-bottom:32px}@media(max-width:640px){.parentFullBack{margin-top:8px}.parentFullBack a{flex:1;text-align:center}}
    `}</style>
  </div>;
}
