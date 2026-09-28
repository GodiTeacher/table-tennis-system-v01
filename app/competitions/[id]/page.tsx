import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addCompetitionParticipants, removeCompetitionParticipant, createTransportVehicle, assignTransportPassengers, removeTransportPassenger } from './actions';

const ROLE_TEXT: Record<string, string> = { competitor: '參賽', reserve: '後備' };
const DIRECTION_TEXT: Record<string, string> = { outbound: '去程', return: '回程', both: '來回' };

export default async function CompetitionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: competition } = await supabase
    .from('competitions')
    .select('id,name,start_date,end_date,location,registration_deadline,status,notes')
    .eq('id', id)
    .single();
  if (!competition) notFound();

  const [{ data: students }, { data: participantRows }, { data: vehicles }] = await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name,gender').eq('active', true).order('grade').order('display_name'),
    supabase.from('competition_participants').select('id,student_id,category,participant_role,registration_status,notes').eq('competition_id', id),
    supabase.from('competition_transport_vehicles').select('id,driver_name,driver_type,direction,capacity,contact,vehicle_note,estimated_cost').eq('competition_id', id).order('created_at'),
  ]);

  const vehicleIds = (vehicles ?? []).map((vehicle) => vehicle.id);
  const { data: assignmentRows } = vehicleIds.length
    ? await supabase.from('competition_transport_assignments').select('id,vehicle_id,student_id').in('vehicle_id', vehicleIds)
    : { data: [] as Array<{ id:string; vehicle_id:string; student_id:string }> };

  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const registeredIds = new Set((participantRows ?? []).map((row) => row.student_id));
  const availableStudents = (students ?? []).filter((student) => !registeredIds.has(student.id));

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">COMPETITION</div>
        <h1>{competition.name}</h1>
        <p>{competition.start_date}{competition.end_date && competition.end_date !== competition.start_date ? ` ～ ${competition.end_date}` : ''}{competition.location ? ` · ${competition.location}` : ''}</p>
        <div className="topNav"><Link href="/competitions">比賽列表</Link><Link href="/today">今日訓練</Link><Link href="/more">更多</Link></div>
      </section>

      {query.error ? <div className="notice errorNotice"><b>操作失敗：</b>{query.error}</div> : null}

      <section className="competitionSummaryGrid">
        <div className="statCard"><span>參賽／後備</span><strong>{participantRows?.length ?? 0}</strong><small>人</small></div>
        <div className="statCard"><span>接送車輛</span><strong>{vehicles?.length ?? 0}</strong><small>台</small></div>
        <div className="statCard"><span>總座位</span><strong>{(vehicles ?? []).reduce((sum, vehicle) => sum + (vehicle.capacity ?? 0), 0)}</strong><small>人</small></div>
        <div className="statCard"><span>預估接送成本</span><strong>{(vehicles ?? []).reduce((sum, vehicle) => sum + Number(vehicle.estimated_cost ?? 0), 0)}</strong><small>元</small></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>參賽名單</h2></div><strong>{participantRows?.length ?? 0} 人</strong></div>
        {participantRows?.length ? <div className="competitionParticipantList">
          {participantRows.map((row) => {
            const student = studentMap.get(row.student_id);
            return <div className="competitionParticipant" key={row.id}>
              <div><b>{student?.display_name ?? '未知學生'}</b><small>{student ? [student.grade ? `${student.grade}年級` : null, student.class_name, student.gender].filter(Boolean).join(' · ') : ''}</small></div>
              <span>{ROLE_TEXT[row.participant_role] ?? row.participant_role}{row.category ? ` · ${row.category}` : ''}</span>
              <form action={removeCompetitionParticipant}><input type="hidden" name="competition_id" value={id}/><input type="hidden" name="participant_id" value={row.id}/><button className="secondaryButton">移除</button></form>
            </div>;
          })}
        </div> : <p className="muted">目前尚未加入參賽學生。</p>}

        <details className="competitionAddPanel">
          <summary>＋ 加入參賽／後備學生</summary>
          <form action={addCompetitionParticipants} className="competitionParticipantForm">
            <input type="hidden" name="competition_id" value={id} />
            <div className="competitionFormRow">
              <label>身分<select name="participant_role"><option value="competitor">參賽</option><option value="reserve">後備</option></select></label>
              <label>組別<input name="category" placeholder="例如：中年級男子組" /></label>
            </div>
            <div className="competitionStudentPicker">
              {availableStudents.length ? availableStudents.map((student) => <label key={student.id}><input type="checkbox" name="student_ids" value={student.id}/><span><b>{student.display_name}</b><small>{student.grade ? `${student.grade}年級` : '未設定年級'}{student.class_name ? ` · ${student.class_name}` : ''}{student.gender ? ` · ${student.gender}` : ''}</small></span></label>) : <p className="muted">所有啟用學生都已加入這場比賽。</p>}
            </div>
            <button className="primaryButton" disabled={!availableStudents.length}>加入勾選學生</button>
          </form>
        </details>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>接送車輛</h2></div><strong>{vehicles?.length ?? 0} 台</strong></div>
        {vehicles?.length ? <div className="vehicleGrid">
          {vehicles.map((vehicle) => {
            const assigned = (assignmentRows ?? []).filter((row) => row.vehicle_id === vehicle.id);
            const assignedIds = new Set(assigned.map((row) => row.student_id));
            const candidates = (participantRows ?? []).filter((row) => !assignedIds.has(row.student_id));
            const remainingSeats = Math.max(0, vehicle.capacity - assigned.length);
            return <article className="vehicleCard" key={vehicle.id}>
              <div className="vehicleCardTop"><b>{vehicle.driver_name}</b><span>{DIRECTION_TEXT[vehicle.direction] ?? vehicle.direction}</span></div>
              <p>{assigned.length}/{vehicle.capacity} 人 · {vehicle.driver_type === 'parent' ? '家長' : vehicle.driver_type === 'coach' ? '教練' : '其他'}</p>
              {vehicle.contact ? <small>聯絡：{vehicle.contact}</small> : null}
              {vehicle.vehicle_note ? <small>{vehicle.vehicle_note}</small> : null}
              <strong>預估成本 ${Number(vehicle.estimated_cost ?? 0).toLocaleString()}</strong>

              <div className="vehiclePassengerList">
                {assigned.map((assignment) => <div className="vehiclePassenger" key={assignment.id}><span>{studentMap.get(assignment.student_id)?.display_name ?? '未知學生'}</span><form action={removeTransportPassenger}><input type="hidden" name="competition_id" value={id}/><input type="hidden" name="assignment_id" value={assignment.id}/><button className="secondaryButton">移出</button></form></div>)}
                {!assigned.length ? <small className="muted">尚未安排乘車學生</small> : null}
              </div>

              {remainingSeats > 0 && candidates.length ? <details className="vehicleAssignPanel">
                <summary>＋ 安排學生上車（剩 {remainingSeats} 席）</summary>
                <form action={assignTransportPassengers}>
                  <input type="hidden" name="competition_id" value={id}/><input type="hidden" name="vehicle_id" value={vehicle.id}/>
                  <div className="vehicleAssignList">{candidates.map((row) => <label key={row.student_id}><input type="checkbox" name="student_ids" value={row.student_id}/>{studentMap.get(row.student_id)?.display_name ?? '未知學生'}</label>)}</div>
                  <button className="secondaryButton">加入此車</button>
                </form>
              </details> : remainingSeats <= 0 ? <div className="notice smallNotice"><b>座位已滿</b></div> : null}
            </article>;
          })}
        </div> : <p className="muted">目前尚未登記接送車輛。</p>}

        <details className="competitionAddPanel">
          <summary>＋ 新增接送車輛</summary>
          <form action={createTransportVehicle} className="vehicleForm">
            <input type="hidden" name="competition_id" value={id} />
            <label>駕駛姓名<input name="driver_name" required placeholder="家長或教練姓名" /></label>
            <label>身分<select name="driver_type"><option value="parent">家長</option><option value="coach">教練</option><option value="other">其他</option></select></label>
            <label>接送<select name="direction"><option value="both">來回</option><option value="outbound">去程</option><option value="return">回程</option></select></label>
            <label>可載人數<input name="capacity" type="number" min="1" required /></label>
            <label>聯絡方式<input name="contact" /></label>
            <label>預估成本<input name="estimated_cost" type="number" min="0" step="1" defaultValue="0" /></label>
            <label className="wideField">車輛／集合備註<input name="vehicle_note" placeholder="例如：7:00 校門口集合、白色休旅車" /></label>
            <button className="primaryButton wideField">新增車輛</button>
          </form>
        </details>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>下一步</h2></div></div>
        <div className="notice"><b>接送配置 V1 已完成：</b>目前可把參賽學生分配到各車並檢查剩餘座位。下一版會加入每人交通分攤、已付款／未付款，以及油資、停車、過路費明細。</div>
      </section>

      <style>{`
        .competitionSummaryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.competitionParticipantList{display:flex;flex-direction:column;gap:8px}.competitionParticipant{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;border:1px solid #e2e7ee;border-radius:14px;padding:12px}.competitionParticipant small{display:block;color:#738093;margin-top:3px}.competitionParticipant>span{font-size:12px;font-weight:800;color:#596779;background:#f1f4f7;border-radius:999px;padding:7px 9px}.competitionAddPanel{margin-top:14px;border:1px solid #e1e6ec;border-radius:15px;overflow:hidden}.competitionAddPanel>summary{cursor:pointer;padding:14px 16px;font-weight:900;background:#f7f9fb}.competitionParticipantForm,.vehicleForm{padding:14px}.competitionFormRow{display:grid;grid-template-columns:1fr 2fr;gap:10px}.competitionParticipantForm label,.vehicleForm label{font-size:12px;font-weight:800;color:#647184}.competitionParticipantForm input,.competitionParticipantForm select,.vehicleForm input,.vehicleForm select{width:100%;margin-top:6px;border:1px solid #dce2ea;border-radius:11px;padding:10px 11px;background:#fff;font:inherit}.competitionStudentPicker{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.competitionStudentPicker label{display:flex;gap:8px;align-items:flex-start;border:1px solid #e1e6ec;border-radius:12px;padding:10px;background:#fff}.competitionStudentPicker input{width:auto;margin:3px 0 0}.competitionStudentPicker b,.competitionStudentPicker small{display:block}.competitionStudentPicker small{color:#738093;margin-top:3px}.vehicleGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.vehicleCard{border:1px solid #e1e6ec;border-radius:15px;padding:14px;background:#fbfcfe}.vehicleCardTop{display:flex;justify-content:space-between;gap:10px}.vehicleCardTop span{font-size:12px;font-weight:800;background:#edf1f5;border-radius:999px;padding:6px 8px}.vehicleCard p{margin:10px 0 6px}.vehicleCard small{display:block;color:#738093;margin-top:3px}.vehicleCard>strong{display:block;margin-top:12px}.vehicleForm{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.vehicleForm .wideField{grid-column:1/-1}.vehiclePassengerList{display:flex;flex-direction:column;gap:6px;margin-top:12px}.vehiclePassenger{display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:10px;padding:8px 9px}.vehiclePassenger form{margin:0}.vehicleAssignPanel{margin-top:10px;border-top:1px solid #e1e6ec;padding-top:10px}.vehicleAssignPanel summary{cursor:pointer;font-weight:800}.vehicleAssignList{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.vehicleAssignList label{font-size:13px;display:flex;gap:6px;align-items:center}.smallNotice{margin:10px 0 0;padding:8px 10px}@media(max-width:900px){.competitionSummaryGrid{grid-template-columns:1fr 1fr}.vehicleGrid,.competitionStudentPicker{grid-template-columns:1fr 1fr}.vehicleForm{grid-template-columns:1fr 1fr}}@media(max-width:520px){.competitionSummaryGrid{grid-template-columns:1fr 1fr}.competitionParticipant{grid-template-columns:1fr auto}.competitionParticipant>span{grid-column:1/-1;justify-self:start}.competitionStudentPicker,.vehicleGrid,.competitionFormRow,.vehicleForm{grid-template-columns:1fr}.vehicleForm .wideField{grid-column:auto}.vehicleAssignList{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
