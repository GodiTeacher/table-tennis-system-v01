import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function CompetitionRubbersLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="inventory">{children}</RequirePlanFeature>;
}
