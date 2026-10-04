import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function OperationsCloseLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="finance">{children}</RequirePlanFeature>;
}
