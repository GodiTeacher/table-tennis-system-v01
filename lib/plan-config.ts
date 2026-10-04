export type SubscriptionPlan='free'|'pro';

export type PlanFeature=
  |'student_roster'
  |'basic_attendance'
  |'simple_schedule'
  |'training_records'
  |'basic_parent_notifications'
  |'basic_pdf'
  |'ocr_student_import'
  |'table_tennis_map'
  |'advanced_analytics'
  |'finance'
  |'payroll'
  |'inventory'
  |'advanced_competitions'
  |'custom_pdf'
  |'multi_coach';

export type PlanLimits={
  studentLimit:number|null;
  trainingHistoryMonths:number|null;
  monthlyOcrImports:number|null;
};

export const PLAN_LIMITS:Record<SubscriptionPlan,PlanLimits>={
  free:{
    studentLimit:20,
    trainingHistoryMonths:2,
    monthlyOcrImports:5,
  },
  pro:{
    studentLimit:null,
    trainingHistoryMonths:null,
    monthlyOcrImports:null,
  },
};

const FREE_FEATURES=new Set<PlanFeature>([
  'student_roster',
  'basic_attendance',
  'simple_schedule',
  'training_records',
  'basic_parent_notifications',
  'basic_pdf',
  'ocr_student_import',
  'table_tennis_map',
]);

export function canUseFeature(plan:SubscriptionPlan,feature:PlanFeature){
  return plan==='pro'||FREE_FEATURES.has(feature);
}

export function getPlanLimits(plan:SubscriptionPlan){
  return PLAN_LIMITS[plan];
}

export function isStudentLimitReached(plan:SubscriptionPlan,currentStudentCount:number){
  const limit=PLAN_LIMITS[plan].studentLimit;
  return limit!==null&&currentStudentCount>=limit;
}

export function trainingHistoryCutoff(plan:SubscriptionPlan,now=new Date()){
  const months=PLAN_LIMITS[plan].trainingHistoryMonths;
  if(months===null)return null;
  const cutoff=new Date(now);
  cutoff.setMonth(cutoff.getMonth()-months);
  return cutoff;
}
