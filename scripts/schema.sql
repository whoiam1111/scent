-- Supabase SQL Editor에서 한 번 실행. 서버는 service_role 키로만 접근하고, RLS를 켜 두어 공개 키로는 읽을 수 없다.
create table if not exists heart_results (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{4}$'),
  name text not null check (char_length(name) between 1 and 20),
  checks jsonb not null,
  created_at timestamptz not null default now()
);
alter table heart_results enable row level security;
-- 이미 테이블을 만들었다면 이름 칸만 추가
alter table heart_results add column if not exists name text not null default '';
