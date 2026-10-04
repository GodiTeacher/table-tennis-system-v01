import RequirePlanFeature from '@/components/RequirePlanFeature';

export default function AirconLayout({children}:{children:React.ReactNode}){
  return <RequirePlanFeature feature="finance"><>{children}<style>{`input[type="time"]{min-width:150px!important;font-variant-numeric:tabular-nums}`}</style></></RequirePlanFeature>;
}
