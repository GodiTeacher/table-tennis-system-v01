alter table public.students add column if not exists grade smallint;
alter table public.students add column if not exists class_name text;
alter table public.students add column if not exists gender text;

alter table public.students drop constraint if exists students_grade_check;
alter table public.students add constraint students_grade_check
  check (grade is null or grade between 1 and 6);

alter table public.students drop constraint if exists students_gender_check;
alter table public.students add constraint students_gender_check
  check (gender is null or gender in ('男','女','其他'));

create index if not exists students_grade_class_idx
  on public.students (grade, class_name);
