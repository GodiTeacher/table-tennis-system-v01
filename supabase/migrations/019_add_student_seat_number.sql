alter table public.students add column if not exists seat_number smallint;
alter table public.students drop constraint if exists students_seat_number_check;
alter table public.students add constraint students_seat_number_check check (seat_number is null or seat_number between 1 and 99);
create index if not exists students_team_class_seat_idx on public.students(team_id, grade, class_name, seat_number);
