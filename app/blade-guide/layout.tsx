import BladeGuideTeamPreference from '@/components/BladeGuideTeamPreference';

export default function BladeGuideLayout({children}:{children:React.ReactNode}){
  return <>{children}<BladeGuideTeamPreference/></>;
}
