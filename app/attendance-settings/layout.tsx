import { Suspense } from 'react';
import MonthViewSwitcher from '@/components/MonthViewSwitcher';

export default function AttendanceSettingsLayout({children}:{children:React.ReactNode}){
  return <><Suspense fallback={null}><MonthViewSwitcher label="學生出勤檢視月份"/></Suspense>{children}<style>{`input[type="time"]{min-width:145px!important;font-variant-numeric:tabular-nums}`}</style></>;
}
