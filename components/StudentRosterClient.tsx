'use client';

type StudentRow = { id:string; display_name:string; grade:number|null; class_name:string|null; seat_number:number|null; gender:string|null; active:boolean; created_at:string };

export default function StudentRosterClient({
  students,
  updateStudent,
  setStudentActive,
  deleteStudent,
}:{
  students:StudentRow[];
  updateStudent:(formData:FormData)=>void|Promise<void>;
  setStudentActive:(formData:FormData)=>void|Promise<void>;
  deleteStudent:(formData:FormData)=>void|Promise<void>;
}){
  if(!students.length)return <p className="muted">目前沒有符合條件的學生，可調整上方篩選。</p>;
  return <div className="studentList">{students.map(student=><div className={`studentManageCard ${student.active?'':'inactive'}`} key={student.id}>
    <div className="studentProfileLinkRow"><a href={`/students/${student.id}`} className="studentProfileLink"><b>{student.display_name}</b><small>{student.seat_number ? `${student.seat_number} 號 · ` : ''}查看個人訓練與技能成長 ›</small></a></div>
    <form action={updateStudent} className="studentEditGrid">
      <input type="hidden" name="id" value={student.id}/>
      <label>姓名<input name="display_name" defaultValue={student.display_name} required maxLength={30}/></label>
      <label>年級<select name="grade" defaultValue={student.grade??''}><option value="">未設定</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g} 年級</option>)}</select></label>
      <label>班級<input name="class_name" defaultValue={student.class_name??''} placeholder="未設定" maxLength={20}/></label>
      <label>座號<input name="seat_number" type="number" min="1" max="99" inputMode="numeric" defaultValue={student.seat_number??''} placeholder="未設定"/></label>
      <label>性別<select name="gender" defaultValue={student.gender??''}><option value="">未設定</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select></label>
      <button className="secondaryButton">儲存修改</button>
    </form>
    <div className="studentManageActions">
      <span className={student.active?'statusPill active':'statusPill'}>{student.active?'啟用中':'已停用'}</span>
      <form action={setStudentActive}><input type="hidden" name="id" value={student.id}/><input type="hidden" name="active" value={student.active?'false':'true'}/><button className="secondaryButton">{student.active?'停用':'重新啟用'}</button></form>
      <form action={deleteStudent}><input type="hidden" name="id" value={student.id}/><button className="dangerButton">永久刪除</button></form>
    </div>
  </div>)}</div>;
}
