import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function RubberInventoryLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="inventory">{children}</RequirePlanFeature>;
}
