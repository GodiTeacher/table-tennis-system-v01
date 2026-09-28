import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  addCompetitionParticipants,
  assignTransportPassengers,
  createTransportVehicle,
  removeCompetitionParticipant,
  removeTransportPassenger,
  updateCompetition,
  updateTransportCharge,
} from './actions';

const ROLE_TEXT: Record<string, string> = { competitor: '參賽', reserve: '後備' };
const DIRECTION_TEXT: Record<string, string> = { outbound: '去程', return: '回程', both: '來回' };
const PAYMENT_TEXT: Record<string, string> = { unpaid: '未付款', partial: '部分付款', paid: '已付款', waived: '免收' };

export default async function CompetitionDetailPage({ params, searchParams }: {
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
    supabase.from('competition_participants').select('id,student_id,competition_date,category,participant_role,registration_status,notes').eq('competition_id', id).order('competition_date'),
    supabase.from('competition_transport_vehicles').select('id,driver_name,driver_type,direction,capacity,contact,vehicle_note,transport_date,fare_per_ride').eq('competition_id', id).order('transport_date').order('created_at'),
  ]);

  const vehicleIds = (vehicles ?? []).map((vehicle) => vehicle.id);
  const { data: assignmentRows } = vehicleIds.length
    ? await supabase.from('competition_transport_assignments').select('id,vehicle_id,student_id,competition_id,transport_date,ride_direction,amount_due,amount_paid,payment_status,payment_note').in('vehicle_id', vehicleIds).order('transport_date')
    : { data: [] as Array<any> };

  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const dates = Array.from(new Set((participantRows ?? []).map((row) => row.competition_date))).sort();
  const uniqueParticipantIds = new Set((participantRows ?? []).map((row) => row.student_id));

  const paymentByStudent = new Map<string, { due: number; paid: number }>();
  for (const row of assignmentRows ?? []) {
    const current = paymentByStudent.get(row.student_id) ?? { due: 0, paid: 0 };
    current.due += Number(row.amount_due ?? 0);
    current.paid += Number(row.amount_paid ?? 0);
    paymentByStudent.set(row.student_id, current);
  }

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
        <div className="statCard"><span>參賽學生</span><strong>{uniqueParticipantIds.size}</strong><small>人</small></div>
        <div className="statCard"><span>參賽項目</span><strong>{participantRows?.length ?? 0}</strong><small>筆</small></div>
        <div className="statCard"><span>接送車次</span><strong>{vehicles?.length ?? 0}</strong><small>台次</small></div>
        <div className="statCard"><span>待收車資</span><strong>{[...paymentByStudent.values()].reduce((sum, row) => sum + Math.max(0, row.due - row.paid), 0)}</strong><small>元</small></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>比賽資訊</h2></div><strong>可編輯</strong></div>
        <details className="competitionAddPanel">
          <summary>✎ 編輯比賽資料</summary>
          <form action={updateCompetition} className="editCompetitionGrid">
            <input type="hidden" name="competition_id" value={id}/>
            <label>比賽名稱<input name="name" required defaultValue={competition.name}/></label>
            <label>開始日期<input name="start_date" type="date" required defaultValue={competition.start_date}/></label>
            <label>結束日期<input name="end_date" type="date" defaultValue={competition.end_date ?? ''}/></label>
            <label>報名截止<input name="registration_deadline" type="date" defaultValue={competition.registration_deadline ?? ''}/></label>
            <label>狀態<select name="status" defaultValue={competition.status}><option value="planning">規劃中</option><option value="open">開放中</option><option value="closed">已截止</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select></label>
            <label className="wideField">地點<input name="location" defaultValue={competition.location ?? ''}/></label>
            <label className="wideField">備註<textarea name="notes" rows={3} defaultValue={competition.notes ?? ''}/></label>
            <button className="primaryButton wideField">儲存比賽修改</button>
          </form>
        </details>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>參賽名單</h2></div><strong>{participantRows?.length ?? 0} 筆</strong></div>
        {dates.map((date) => (
          <div className="competitionDay" key={date}>
            <h3>{date}</h3>
            <div className="competitionParticipantList">
              {(participantRows ?? []).filter((row) => row.competition_date === date).map((row) => {
                const student = studentMap.get(row.student_id);
                return <div className="competitionParticipant" key={row.id}>
                  <div><b>{student?.display_name ?? '未知學生'}</b><small>{student ? [student.grade ? `${student.grade}年級` : null, student.class_name, student.gender].filter(Boolean).join(' · ') : ''}</small></div>
                  <span>{ROLE_TEXT[row.participant_role] ?? row.participant_role}{row.category ? ` · ${row.category}` : ''}</span>
                  <form action={removeCompetitionParticipant}><input type="hidden" name="competition_id" value={id}/><input type="hidden" name="participant_id" value={row.id}/><button className="secondaryButton">移除</button></form>
                </div>;
              })}
            </div>
          </div>
        ))}
        {!participantRows?.length ? <p className="muted">目前尚未加入參賽學生。</p> : null}

        <details className="competitionAddPanel">
          <summary>＋ 加入參賽／後備學生</summary>
          <form action={addCompetitionParticipants} className="competitionParticipantForm">
            <input type="hidden" name="competition_id" value={id}/>
            <div className="competitionFormRow three">
              <label>比賽日期<input type="date" name="competition_date" min={competition.start_date} max={competition.end_date ?? competition.start_date} defaultValue={competition.start_date} required/></label>
              <label>身分<select name="participant_role"><option value="competitor">參賽</option><option value="reserve">後備</option></select></label>
              <label>組別<input name="category" placeholder="例如：中年級男子組" required/></label>
            </div>
            <div className="competitionStudentPicker">
              {(students ?? []).map((student) => <label key={student.id}><input type="checkbox" name="student_ids" value={student.id}/><span><b>{student.display_name}</b><small>{student.grade ? `${student.grade}年級` : '未設定年級'}{student.class_name ? ` · ${student.class_name}` : ''}{student.gender ? ` · ${student.gender}` : ''}</small></span></label>)}
            </div>
            <button className="primaryButton">加入勾選學生</button>
          </form>
        </details>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>03</span><h2>接送車輛與車資</h2></div><strong>{vehicles?.length ?? 0} 台次</strong></div>
        <div className="notice"><b>規則：</b>車資以「每人單程」為基準；學生可只搭去程、只搭回程或兩段都搭。每位學生的實際金額可另外改成 0 或其他金額。</div>
        {vehicles?.length ? <div className="vehicleGrid">
          {vehicles.map((vehicle) => {
            const directions = vehicle.direction === 'both' ? ['outbound','return'] : [vehicle.direction];
            return <article className="vehicleCard" key={vehicle.id}>
              <div className="vehicleCardTop"><b>{vehicle.driver_name}</b><span>{vehicle.transport_date} · {DIRECTION_TEXT[vehicle.direction] ?? vehicle.direction}</span></div>
              <p>{vehicle.capacity} 席 · 每人單程 ${Number(vehicle.fare_per_ride ?? 0).toLocaleString()}</p>
              {vehicle.contact ? <small>聯絡：{vehicle.contact}</small> : null}
              {vehicle.vehicle_note ? <small>{vehicle.vehicle_note}</small> : null}

              {directions.map((direction) => {
                const assigned = (assignmentRows ?? []).filter((row) => row.vehicle_id === vehicle.id && row.ride_direction === direction);
                const globallyAssigned = new Set((assignmentRows ?? []).filter((row) => row.transport_date === vehicle.transport_date && row.ride_direction === direction).map((row) => row.student_id));
                const participantIdsForDay = Array.from(new Set((participantRows ?? []).filter((row) => row.competition_date === vehicle.transport_date).map((row) => row.student_id)));
                const candidates = participantIdsForDay.filter((studentId) => !globallyAssigned.has(studentId));
                const remainingSeats = Math.max(0, vehicle.capacity - assigned.length);
                return <div className="tripBlock" key={direction}>
                  <div className="tripTitle"><b>{DIRECTION_TEXT[direction]}</b><span>{assigned.length}/{vehicle.capacity} 人</span></div>
                  <div className="vehiclePassengerList">
                    {assigned.map((assignment) => <div className="fareRow" key={assignment.id}>
                      <div><b>{studentMap.get(assignment.student_id)?.display_name ?? '未知學生'}</b><small>{PAYMENT_TEXT[assignment.payment_status] ?? assignment.payment_status}</small></div>
                      <form action={updateTransportCharge} className="fareForm">
                        <input type="hidden" name="competition_id" value={id}/><input type="hidden" name="assignment_id" value={assignment.id}/>
                        <label>應付<input name="amount_due" type="number" min="0" step="1" defaultValue={Number(assignment.amount_due ?? 0)}/></label>
                        <label>已付<input name="amount_paid" type="number" min="0" step="1" defaultValue={Number(assignment.amount_paid ?? 0)}/></label>
                        <label>狀態<select name="payment_status" defaultValue={assignment.payment_status}><option value="unpaid">未付款</option><option value="partial">部分付款</option><option value="paid">已付款</option><option value="waived">免收</option></select></label>
                        <label>備註<input name="payment_note" defaultValue={assignment.payment_note ?? ''} placeholder="例如：家長自載免收"/></label>
                        <button className="secondaryButton">儲存</button>
                      </form>
                      <form action={removeTransportPassenger}><input type="hidden" name="competition_id" value={id}/><input type="hidden" name="assignment_id" value={assignment.id}/><button className="secondaryButton dangerText">移出</button></form>
                    </div>)}
                  </div>
                  {remainingSeats > 0 && candidates.length ? <details className="vehicleAssignPanel">
                    <summary>＋ 安排{DIRECTION_TEXT[direction]}（剩 {remainingSeats} 席）</summary>
                    <form action={assignTransportPassengers}>
                      <input type="hidden" name="competition_id" value={id}/><input type="hidden" name="vehicle_id" value={vehicle.id}/><input type="hidden" name="ride_direction" value={direction}/>
                      <div className="vehicleAssignList">{candidates.map((studentId) => <label key={studentId}><input type="checkbox" name="student_ids" value={studentId}/>{studentMap.get(studentId)?.display_name ?? '未知學生'}</label>)}</div>
                      <button className="secondaryButton">加入此車</button>
                    </form>
                  </details> : remainingSeats <= 0 ? <small className="muted">此方向座位已滿</small> : <small className="muted">這一天此方向沒有尚未分車的參賽學生</small>}
                </div>;
              })}
            </article>;
          })}
        </div> : <p className="muted">目前尚未登記接送車輛。</p>}

        <details className="competitionAddPanel">
          <summary>＋ 新增接送車輛</summary>
          <form action={createTransportVehicle} className="vehicleForm">
            <input type="hidden" name="competition_id" value={id}/>
            <label>接送日期<input name="transport_date" type="date" min={competition.start_date} max={competition.end_date ?? competition.start_date} defaultValue={competition.start_date} required/></label>
            <label>駕駛姓名<input name="driver_name" required placeholder="家長或教練姓名"/></label>
            <label>身分<select name="driver_type"><option value="parent">家長</option><option value="coach">教練</option><option value="other">其他</option></select></label>
            <label>接送<select name="direction"><option value="both">來回</option><option value="outbound">去程</option><option value="return">回程</option></select></label>
            <label>可載人數<input name="capacity" type="number" min="1" required/></label>
            <label>每人單程車資<input name="fare_per_ride" type="number" min="0" step="1" defaultValue="0"/></label>
            <label>聯絡方式<input name="contact"/></label>
            <label className="wideField">車輛／集合備註<input name="vehicle_note" placeholder="例如：7:00 校門口集合、白色休旅車"/></label>
            <button className="primaryButton wideField">新增車輛</button>
          </form>
        </details>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>04</span><h2>學生車資統計</h2></div><strong>{paymentByStudent.size} 人</strong></div>
        <div className="fareSummaryList">
          {[...paymentByStudent.entries()].sort((a,b) => (studentMap.get(a[0])?.display_name ?? '').localeCompare(studentMap.get(b[0])?.display_name ?? '', 'zh-Hant')).map(([studentId, money]) => <div key={studentId}><b>{studentMap.get(studentId)?.display_name ?? '未知學生'}</b><span>應付 ${money.due.toLocaleString()} · 已付 ${money.paid.toLocaleString()} · 未付 ${Math.max(0,money.due-money.paid).toLocaleString()}</span></div>)}
        </div>
      </section>

      <style>{`
        .competitionSummaryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.competitionAddPanel{margin-top:14px;border:1px solid #e1e6ec;border-radius:15px;overflow:hidden}.competitionAddPanel>summary{cursor:pointer;padding:14px 16px;font-weight:900;background:#f7f9fb}.editCompetitionGrid,.vehicleForm{padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.editCompetitionGrid label,.vehicleForm label,.competitionParticipantForm label,.fareForm label{font-size:12px;font-weight:800;color:#647184}.editCompetitionGrid input,.editCompetitionGrid select,.editCompetitionGrid textarea,.vehicleForm input,.vehicleForm select,.competitionParticipantForm input,.competitionParticipantForm select,.fareForm input,.fareForm select{width:100%;margin-top:5px;border:1px solid #dce2ea;border-radius:10px;padding:9px 10px;background:#fff;font:inherit}.wideField{grid-column:1/-1}.competitionDay{margin-top:16px}.competitionDay h3{margin:0 0 8px}.competitionParticipantList{display:flex;flex-direction:column;gap:8px}.competitionParticipant{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;border:1px solid #e2e7ee;border-radius:14px;padding:12px}.competitionParticipant small{display:block;color:#738093;margin-top:3px}.competitionParticipant>span{font-size:12px;font-weight:800;background:#f1f4f7;border-radius:999px;padding:7px 9px}.competitionParticipantForm{padding:14px}.competitionFormRow{display:grid;grid-template-columns:1fr 1fr;gap:10px}.competitionFormRow.three{grid-template-columns:1fr 1fr 2fr}.competitionStudentPicker{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.competitionStudentPicker label{display:flex;gap:8px;align-items:flex-start;border:1px solid #e1e6ec;border-radius:12px;padding:10px;background:#fff}.competitionStudentPicker input{width:auto;margin:3px 0 0}.competitionStudentPicker b,.competitionStudentPicker small{display:block}.competitionStudentPicker small{color:#738093;margin-top:3px}.vehicleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}.vehicleCard{border:1px solid #e1e6ec;border-radius:15px;padding:14px;background:#fbfcfe}.vehicleCardTop{display:flex;justify-content:space-between;gap:10px}.vehicleCardTop span{font-size:12px;font-weight:800;background:#edf1f5;border-radius:999px;padding:6px 8px}.vehicleCard p{margin:10px 0 6px}.vehicleCard small{display:block;color:#738093;margin-top:3px}.tripBlock{margin-top:14px;border-top:1px solid #e1e6ec;padding-top:12px}.tripTitle{display:flex;justify-content:space-between}.fareRow{border:1px solid #e3e8ee;border-radius:12px;padding:10px;margin-top:8px;background:#fff}.fareRow>div small{margin-top:2px}.fareForm{display:grid;grid-template-columns:repeat(4,1fr) auto;gap:7px;align-items:end;margin-top:8px}.vehicleAssignPanel{margin-top:10px}.vehicleAssignPanel summary{cursor:pointer;font-weight:800}.vehicleAssignList{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.vehicleAssignList label{display:flex;gap:6px;align-items:center;font-size:13px}.vehicleAssignList input{width:auto}.fareSummaryList{display:flex;flex-direction:column;gap:8px}.fareSummaryList>div{display:flex;justify-content:space-between;gap:12px;border:1px solid #e1e6ec;border-radius:12px;padding:11px}.fareSummaryList span{color:#647184}.dangerText{color:#a33}@media(max-width:900px){.competitionSummaryGrid{grid-template-columns:1fr 1fr}.vehicleGrid,.competitionStudentPicker{grid-template-columns:1fr 1fr}.editCompetitionGrid,.vehicleForm{grid-template-columns:1fr 1fr}.fareForm{grid-template-columns:1fr 1fr}}@media(max-width:560px){.competitionParticipant{grid-template-columns:1fr auto}.competitionParticipant>span{grid-column:1/-1;justify-self:start}.vehicleGrid,.competitionStudentPicker,.competitionFormRow,.competitionFormRow.three,.editCompetitionGrid,.vehicleForm,.fareForm{grid-template-columns:1fr}.wideField{grid-column:auto}.vehicleAssignList{grid-template-columns:1fr}.fareSummaryList>div{flex-direction:column;gap:3px}}
      `}</style>
    </main>
  );
}
