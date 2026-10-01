import MonthViewSwitcher from '@/components/MonthViewSwitcher';

export default function AttendanceSettingsLayout({children}:{children:React.ReactNode}){
  return <><MonthViewSwitcher label="學生出勤檢視月份"/>{children}<style>{`input[type="time"]{min-width:145px!important;font-variant-numeric:tabular-nums}`}</style></>;
}
