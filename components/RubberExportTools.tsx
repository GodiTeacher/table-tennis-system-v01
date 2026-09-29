'use client';

type RubberSide = {
  side: string;
  label: string;
  brand?: string | null;
  model: string;
  thickness?: string | null;
  color?: string | null;
  amountDue: number;
  amountPaid: number;
  paymentStatus: string;
  workflowStatus: string;
  payee?: string | null;
  cost: number;
};

type RubberStudent = {
  studentId: string;
  name: string;
  grade?: number | null;
  className?: string | null;
  sides: RubberSide[];
  totalDue: number;
  totalPaid: number;
  balance: number;
};

type Props = {
  competitionName: string;
  dateText: string;
  students: RubberStudent[];
};

const money = (value:number) => `$${Math.round(value).toLocaleString()}`;

function coachText(props: Props) {
  const lines = [`📋 ${props.competitionName}｜球皮管理（教練版）`, props.dateText, ''];
  for (const student of props.students) {
    const totalCost = student.sides.reduce((sum,s)=>sum+s.cost,0);
    lines.push(`👤 ${student.name}｜應收 ${money(student.totalDue)}｜已收 ${money(student.totalPaid)}｜未收 ${money(student.balance)}｜成本 ${money(totalCost)}`);
    for (const side of student.sides) {
      lines.push(`・${side.label}：${[side.brand,side.model,side.thickness,side.color].filter(Boolean).join(' ')}｜${money(side.amountDue)}｜${side.workflowStatus}${side.payee ? `｜付給 ${side.payee}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

function parentText(props: Props) {
  const lines = [`🏓 ${props.competitionName}｜比賽換皮整理`, props.dateText, ''];
  for (const student of props.students) {
    lines.push(`👤 ${student.name}`);
    for (const side of student.sides) {
      lines.push(`・${side.label}：${[side.brand,side.model,side.thickness,side.color].filter(Boolean).join(' ')}`);
    }
    lines.push(`應付 ${money(student.totalDue)}｜已付 ${money(student.totalPaid)}｜未付 ${money(student.balance)}`, '');
  }
  lines.push('如球皮或金額有誤，再請告知教練，謝謝！');
  return lines.join('\n').trim();
}

async function copyText(text:string) {
  await navigator.clipboard.writeText(text);
  alert('已複製，可直接貼到 LINE。');
}

function downloadBlob(content:string, type:string, filename:string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"','""')}"`;
}

function exportCsv(props:Props) {
  const rows = [['比賽','學生','年級','班級','面別','品牌','型號','厚度','顏色','應付','已付','未付','付款狀態','處理進度','付款對象','成本']];
  for (const student of props.students) {
    for (const side of student.sides) {
      rows.push([props.competitionName,student.name,student.grade ?? '',student.className ?? '',side.label,side.brand ?? '',side.model,side.thickness ?? '',side.color ?? '',side.amountDue,side.amountPaid,Math.max(0,side.amountDue-side.amountPaid),side.paymentStatus,side.workflowStatus,side.payee ?? '',side.cost]);
    }
  }
  const csv = '\ufeff' + rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
  downloadBlob(csv,'text/csv;charset=utf-8',`${props.competitionName}-球皮管理.csv`);
}

function exportJson(props:Props) {
  downloadBlob(JSON.stringify({competition:props.competitionName,date:props.dateText,students:props.students},null,2),'application/json;charset=utf-8',`${props.competitionName}-球皮管理.json`);
}

function drawWrapped(ctx:CanvasRenderingContext2D, text:string, x:number, y:number, maxWidth:number, lineHeight:number) {
  const chars = [...text];
  let line = '';
  let yy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line,x,yy);
      line = ch;
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line,x,yy);
  return yy + lineHeight;
}

function exportImage(props:Props, mode:'coach'|'parent') {
  const scale = 2;
  const width = 760;
  const perStudent = mode === 'coach' ? 150 : 125;
  const height = Math.max(420, 170 + props.students.length * perStudent);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale,scale);
  ctx.fillStyle = '#f5f7fa';
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#162033';
  ctx.font = '700 28px sans-serif';
  ctx.fillText(`${props.competitionName}｜${mode === 'coach' ? '球皮管理・教練版' : '換皮通知・家長版'}`,36,48);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#667085';
  ctx.fillText(props.dateText,36,78);
  let y = 112;
  for (const student of props.students) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(28,y-20,width-56,perStudent-10);
    ctx.fillStyle = '#162033';
    ctx.font = '700 20px sans-serif';
    ctx.fillText(student.name,44,y+8);
    ctx.font = '15px sans-serif';
    let sy = y+38;
    for (const side of student.sides) {
      const detail = `${side.label}｜${[side.brand,side.model,side.thickness,side.color].filter(Boolean).join(' ')}｜${money(side.amountDue)}${mode==='coach' ? `｜${side.workflowStatus}` : ''}`;
      sy = drawWrapped(ctx,detail,44,sy,width-88,22);
    }
    ctx.font = '700 15px sans-serif';
    ctx.fillStyle = student.balance > 0 ? '#9b2c2c' : '#17663a';
    ctx.fillText(`應付 ${money(student.totalDue)}　已付 ${money(student.totalPaid)}　未付 ${money(student.balance)}`,44,y+perStudent-38);
    if (mode === 'coach') {
      const cost = student.sides.reduce((sum,s)=>sum+s.cost,0);
      ctx.fillStyle = '#667085';
      ctx.font = '14px sans-serif';
      ctx.fillText(`成本 ${money(cost)}　預估差額 ${money(student.totalDue-cost)}`,390,y+perStudent-38);
    }
    y += perStudent;
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${props.competitionName}-${mode==='coach'?'教練版':'家長版'}-球皮整理.png`;
  a.click();
}

export default function RubberExportTools(props:Props) {
  return <div className="rubberExportTools">
    <div className="exportGroup"><b>LINE</b><button type="button" onClick={()=>copyText(coachText(props))}>複製教練版</button><button type="button" onClick={()=>copyText(parentText(props))}>複製家長版</button></div>
    <div className="exportGroup"><b>圖片</b><button type="button" onClick={()=>exportImage(props,'coach')}>教練版圖片</button><button type="button" onClick={()=>exportImage(props,'parent')}>家長版圖片</button></div>
    <div className="exportGroup"><b>資料</b><button type="button" onClick={()=>exportCsv(props)}>Excel / CSV</button><button type="button" onClick={()=>exportJson(props)}>JSON</button></div>
    <style>{`.rubberExportTools{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}.exportGroup{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #e0e5eb;border-radius:14px;background:#fff}.exportGroup b{font-size:12px;color:#687588}.exportGroup button{border:0;border-radius:9px;padding:8px 10px;background:#edf1f5;color:#243246;font-weight:800;cursor:pointer}@media(max-width:620px){.rubberExportTools,.exportGroup{width:100%}.exportGroup{display:grid;grid-template-columns:auto 1fr 1fr}.exportGroup button{width:100%}}`}</style>
  </div>;
}
