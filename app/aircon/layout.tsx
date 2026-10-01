export default function AirconLayout({children}:{children:React.ReactNode}){
  return <>{children}<style>{`input[type="time"]{min-width:150px!important;font-variant-numeric:tabular-nums}`}</style></>;
}
