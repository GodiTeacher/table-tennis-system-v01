import StudentPhotoImport from '@/components/StudentPhotoImport';
import StudentRosterTableEnhancer from '@/components/StudentRosterTableEnhancer';
import {importStudentsData} from './actions';

export default function StudentsLayout({children}:{children:React.ReactNode}){
  return <>
    {children}
    <StudentRosterTableEnhancer/>
    <StudentPhotoImport importAction={importStudentsData}/>
  </>;
}
