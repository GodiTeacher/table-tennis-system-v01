import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function CompetitionsLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="advanced_competitions">{children}</RequirePlanFeature>;
}
