import StudentPhotoImport from '@/components/StudentPhotoImport';
import {importStudentsData} from './actions';

export default function StudentsLayout({children}:{children:React.ReactNode}){
  return <>
    {children}
    <StudentPhotoImport importAction={importStudentsData}/>
  </>;
}
