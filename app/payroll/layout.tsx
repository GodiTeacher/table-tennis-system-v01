import { Suspense } from 'react';
import MonthViewSwitcher from '@/components/MonthViewSwitcher';

export default function PayrollLayout({children}:{children:React.ReactNode}){
  return <><Suspense fallback={null}><MonthViewSwitcher label="教練薪酬檢視月份"/></Suspense>{children}<style>{`input[type="time"]{min-width:145px!important;font-variant-numeric:tabular-nums}`}</style></>;
}
