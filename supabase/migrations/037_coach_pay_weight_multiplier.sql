alter table public.coach_pay_rules
  add column if not exists weight_multiplier numeric not null default 1;

alter table public.coach_pay_rules
  drop constraint if exists coach_pay_rules_weight_multiplier_check;

alter table public.coach_pay_rules
  add constraint coach_pay_rules_weight_multiplier_check
  check (weight_multiplier >= 0);
