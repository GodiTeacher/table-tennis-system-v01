import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function RubberCatalogLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="inventory">{children}</RequirePlanFeature>;
}
