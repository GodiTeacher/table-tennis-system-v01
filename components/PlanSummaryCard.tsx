import Link from 'next/link';
import type {TeamEntitlements} from '@/lib/subscription-server';

export default function PlanSummaryCard({
  entitlements,
  studentCount,
  compact=false,
}:{
  entitlements:TeamEntitlements|null;
  studentCount?:number;
  compact?:boolean;
}){
  if(!entitlements)return null;
  const isPro=entitlements.plan_code==='pro';
  const studentLimit=entitlements.student_limit;
  const studentText=typeof studentCount==='number'
    ? `${studentCount}${studentLimit!==null?` / ${studentLimit}`:''} 位學生`
    : studentLimit!==null?`最多 ${studentLimit} 位學生`:'學生人數不限';
  const historyText=entitlements.training_history_months===null?'訓練紀錄永久保留':`訓練紀錄最近 ${entitlements.training_history_months} 個月`;
  const pdfText=entitlements.pdf_level==='custom'?'自訂 PDF':'基本 PDF 模板';
  const ocrText=entitlements.monthly_ocr_imports===null?'OCR 不限額':'OCR 每月 '+entitlements.monthly_ocr_imports+' 次';

  return <section className={`planSummaryCard ${isPro?'planPro':'planFree'} ${compact?'compact':''}`}>
    <div className="planSummaryTop">
      <div><span className="planEyebrow">CURRENT PLAN</span><h2>{entitlements.plan_name}</h2></div>
      <span className="planBadge">{isPro?'PRO':'FREE'}</span>
    </div>
    <div className="planFacts">
      <span>{studentText}</span><span>{historyText}</span><span>{pdfText}</span><span>{ocrText}</span>
    </div>
    <div className="planSummaryBottom">
      <small>{isPro?'目前已開啟完整菁英版功能。':'免費版可完整體驗核心管理流程，需要更多容量時再升級。'}</small>
      <Link href="/plans">查看方案 ›</Link>
    </div>
    <style>{`
      .planSummaryCard{margin:14px 0 18px;padding:16px 17px;border-radius:19px;border:1px solid #dfe5ec;background:linear-gradient(135deg,#fff,#f8fafc);box-shadow:0 7px 22px rgba(24,33,47,.055)}
      .planSummaryCard.planPro{background:linear-gradient(135deg,color-mix(in srgb,var(--theme-soft,#f5f3ff) 70%,#fff),#fff);border-color:color-mix(in srgb,var(--theme-accent,#7c3aed) 24%,#dfe5ec)}
      .planSummaryTop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.planEyebrow{font-size:9px;letter-spacing:.16em;font-weight:900;color:#8a94a3}.planSummaryTop h2{margin:3px 0 0;font-size:18px}.planBadge{padding:6px 9px;border-radius:999px;background:#eef2f6;color:#667386;font-size:10px;font-weight:950;letter-spacing:.08em}.planPro .planBadge{background:var(--theme-accent,#7c3aed);color:#fff}.planFacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}.planFacts span{padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.82);border:1px solid #edf0f3;font-size:11px;font-weight:800;color:#556174}.planSummaryBottom{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:12px}.planSummaryBottom small{color:#7a8595}.planSummaryBottom a{text-decoration:none;font-size:12px;font-weight:900;color:var(--theme-accent,#7c3aed);white-space:nowrap}.planSummaryCard.compact{margin:0 0 18px}.planSummaryCard.compact .planFacts{grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:680px){.planFacts{grid-template-columns:repeat(2,minmax(0,1fr))}.planSummaryBottom{align-items:flex-end}.planSummaryBottom small{max-width:72%}}
    `}</style>
  </section>;
}
