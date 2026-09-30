import BladeGuideTeamPreference from '@/components/BladeGuideTeamPreference';
import WorldTop10Equipment from '@/components/WorldTop10Equipment';

export default function BladeGuideLayout({children}:{children:React.ReactNode}){
  return <>{children}<BladeGuideTeamPreference/><WorldTop10Equipment/></>;
}
