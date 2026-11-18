import { randomInt } from "node:crypto";

// 상담용 핵심감정 체크 결과 저장소 (서버 전용). Supabase REST를 fetch로 직접 부른다.
// 저장하는 것: 이름, 4자리 상담 번호, 고른 문항 키, 추천한 향 조합, 시각. 그림일기(키링) PNG는 Storage 버킷 image에 (참가자가 저장할 때). 기억 글은 저장하지 않는다.
// SUPABASE_* 가 없으면 개발 중에만 메모리에 둔다 (서버를 재시작하면 사라짐).

// keyring_at: 키링 이미지가 들어온 시각. 이미지 자체는 무거워서 목록에 싣지 않고 getKeyring으로 따로 받는다
// scent: 참가자 화면에 보여 준 향 조합 그대로 (조향사용). 나중에 조합표가 바뀌어도 그날 추천한 향이 남는다
export type SavedScent = { type: string; top: string; middle: string; base: string };
// followup: 후속 프로그램 신청 (코칭존 패드에서 받는다). program이 없으면 예전 신청 = 코칭
// slots는 코칭 희망 일정 "YYYY-MM-DDTHH:mm" (현지 시각), 그 밖에는 빈 배열. none = 신청은 안 하고 연락처만
// birth: 생년월일 "YYYY-MM-DD" (생일 이벤트). agreed: 신청 주의사항 안내 확인 (none은 false)
export type Program = "coaching" | "reading" | "none";
export type FollowUp = { program?: Program; phone: string; birth?: string; slots: string[]; agreed: boolean; at: string };
export type HeartRow = { id: string; code: string; name: string; checks: string[]; created_at: string; keyring_at?: string | null; scent?: SavedScent | null; followup?: FollowUp | null };
type MemRow = HeartRow & { keyring?: Buffer };

// 대시보드에서 REST 주소(…/rest/v1/)를 통째로 복사해 넣는 경우가 많아 프로젝트 주소만 남긴다
const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const remote = Boolean(url && key);
export const storeReady = () => remote || process.env.NODE_ENV !== "production";
export const retentionDays = () => Number(process.env.HEART_RETENTION_DAYS) || 7;

const mem = ((globalThis as { __heart?: MemRow[] }).__heart ??= []);

async function rest(path: string, init: RequestInit = {}, table = "heart_results") {
  const res = await fetch(`${url}/rest/v1/${table}${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) throw Object.assign(new Error(`supabase ${res.status}`), { status: res.status });
  return res.json();
}

export async function saveHeart(name: string, checks: string[], scent: SavedScent | null): Promise<HeartRow> {
  for (let i = 0; i < 6; i++) {
    const code = String(randomInt(0, 10000)).padStart(4, "0");
    if (!remote) {
      if (mem.some((r) => r.code === code)) continue;
      const row = { id: crypto.randomUUID(), code, name, checks, scent, created_at: new Date().toISOString() };
      mem.unshift(row);
      return row;
    }
    try {
      const [row] = await rest("", { method: "POST", body: JSON.stringify({ code, name, checks, scent }) });
      return row;
    } catch (e) {
      const status = (e as { status?: number }).status;
      // scent 칸을 아직 안 만든 DB(400)면 향 없이라도 저장한다. 코칭 화면이 체크 결과로 다시 계산한다
      if (status === 400) return (await rest("", { method: "POST", body: JSON.stringify({ code, name, checks }) }))[0];
      if (status !== 409) throw e; // 번호가 겹치면 다른 번호로 다시
    }
  }
  throw new Error("code exhausted");
}

// 그림일기(키링) PNG는 Supabase Storage의 비공개 버킷에 결과 id 이름으로 둔다
const BUCKET = "image";
const objectPath = (id: string) => `keyring/${id}.png`;
async function storage(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/storage/v1/object/${path}`, { ...init, cache: "no-store", headers: { apikey: key!, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok && res.status !== 404 && res.status !== 400) throw Object.assign(new Error(`storage ${res.status}`), { status: res.status });
  return res;
}
// 없는 파일이면 Supabase가 400·404를 준다: 던지지 않고 호출한 쪽이 res.ok로 본다. 결과를 지울 때 그림도 지운다
const removeImages = (ids: string[]) =>
  ids.length ? storage(BUCKET, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: ids.map(objectPath) }) }) : null;

// 보관 기간이 지난 결과는 목록을 볼 때마다 그림과 함께 지운다
export async function listHeart(): Promise<HeartRow[]> {
  const cutoff = new Date(Date.now() - retentionDays() * 86_400_000).toISOString();
  if (!remote) {
    mem.splice(0, mem.length, ...mem.filter((r) => r.created_at >= cutoff));
    return mem.map(({ keyring: _, ...r }) => r); // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  const old: { id: string }[] = await rest(`?created_at=lt.${cutoff}&keyring_at=not.is.null&select=id`);
  await removeImages(old.map((r) => r.id));
  await rest(`?created_at=lt.${cutoff}`, { method: "DELETE" });
  return rest("?select=*&order=created_at.desc&limit=500"); // * : scent 칸이 없는 DB에서도 깨지지 않게
}

// 그림일기 PNG를 결과에 붙인다. 다시 저장하면 덮어쓴다. 해당 결과가 없으면 false
export async function saveKeyring(id: string, png: Buffer): Promise<boolean> {
  const keyring_at = new Date().toISOString();
  if (!remote) {
    const row = mem.find((r) => r.id === id);
    if (row) Object.assign(row, { keyring: png, keyring_at });
    return Boolean(row);
  }
  // 없는 결과 id로 파일만 쌓이지 않게 먼저 확인한다
  const found: unknown[] = await rest(`?id=eq.${encodeURIComponent(id)}&select=id`);
  if (!found.length) return false;
  const up = await storage(`${BUCKET}/${objectPath(id)}`, { method: "POST", headers: { "Content-Type": "image/png", "x-upsert": "true" }, body: new Uint8Array(png) });
  if (!up.ok) throw new Error(`storage upload ${up.status}`);
  await rest(`?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ keyring_at }) });
  return true;
}

export async function getKeyring(id: string): Promise<Buffer | null> {
  if (!remote) return mem.find((r) => r.id === id)?.keyring ?? null;
  const res = await storage(`authenticated/${BUCKET}/${objectPath(id)}`);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

// 신청을 결과에 붙인다. 다시 신청하면 덮어쓴다. 바뀐 결과를 돌려주고, 해당 결과가 없으면 null
export async function saveFollowUp(id: string, followup: FollowUp): Promise<HeartRow | null> {
  if (!remote) {
    const row = mem.find((r) => r.id === id);
    if (row) row.followup = followup;
    return row ?? null;
  }
  const rows: HeartRow[] = await rest(`?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ followup }) });
  return rows[0] ?? null;
}

export async function deleteHeart(id: string) {
  if (!remote) return void mem.splice(0, mem.length, ...mem.filter((r) => r.id !== id));
  await removeImages([id]);
  await rest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

// 텔레그램 누적 메시지 번호 (날짜별). 하루에 메시지 하나를 계속 고쳐 쓰고, 길어지면 다음 메시지로 이어 간다
const tgMem = ((globalThis as { __tg?: Map<string, number[]> }).__tg ??= new Map());
export async function getTelegramIds(day: string): Promise<number[]> {
  if (!remote) return tgMem.get(day) ?? [];
  const rows: { message_ids: number[] }[] = await rest(`?day=eq.${day}&select=message_ids`, {}, "telegram_logs");
  return rows[0]?.message_ids ?? [];
}
export async function setTelegramIds(day: string, ids: number[]) {
  if (!remote) return void tgMem.set(day, ids);
  await rest("", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ day, message_ids: ids }) }, "telegram_logs");
}
