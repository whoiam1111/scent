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
-- 그림일기(키링) PNG는 Storage의 비공개 버킷 'image'에 keyring/<id>.png로 둔다. 표에는 저장 시각만
alter table heart_results add column if not exists keyring_at timestamptz;
-- 참가자에게 보여 준 향 조합 {type, top, middle, base} (조향사용)
alter table heart_results add column if not exists scent jsonb;
-- 6회 코칭 신청 {phone, slots: ["YYYY-MM-DDTHH:mm"], agreed, at} (코칭존 패드에서 받는다)
alter table heart_results add column if not exists followup jsonb;
-- 텔레그램 누적 메시지: 날짜별로 고쳐 쓸 메시지 번호
create table if not exists telegram_logs (day date primary key, message_ids jsonb not null default '[]');
alter table telegram_logs enable row level security;
-- 버킷이 없으면 만든다 (비공개, PNG만, 5MB까지)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('image', 'image', false, 5242880, array['image/png'])
on conflict (id) do nothing;
