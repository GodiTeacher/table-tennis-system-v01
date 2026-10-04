import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function PointsLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="advanced_analytics">{children}</RequirePlanFeature>;
}
