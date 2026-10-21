import { randomInt } from "node:crypto";

// 상담용 핵심감정 체크 결과 저장소 (서버 전용). Supabase REST를 fetch로 직접 부른다.
// 저장하는 것: 이름, 4자리 상담 번호, 고른 문항 키, 시각. 기억·그림 일기는 저장하지 않는다.
// SUPABASE_* 가 없으면 개발 중에만 메모리에 둔다 (서버를 재시작하면 사라짐).

export type HeartRow = { id: string; code: string; name: string; checks: string[]; created_at: string };

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const remote = Boolean(url && key);
export const storeReady = () => remote || process.env.NODE_ENV !== "production";
export const retentionDays = () => Number(process.env.HEART_RETENTION_DAYS) || 7;

const mem = ((globalThis as { __heart?: HeartRow[] }).__heart ??= []);

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/rest/v1/heart_results${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) throw Object.assign(new Error(`supabase ${res.status}`), { status: res.status });
  return res.json();
}

export async function saveHeart(name: string, checks: string[]): Promise<HeartRow> {
  for (let i = 0; i < 6; i++) {
    const code = String(randomInt(0, 10000)).padStart(4, "0");
    if (!remote) {
      if (mem.some((r) => r.code === code)) continue;
      const row = { id: crypto.randomUUID(), code, name, checks, created_at: new Date().toISOString() };
      mem.unshift(row);
      return row;
    }
    try {
      const [row] = await rest("", { method: "POST", body: JSON.stringify({ code, name, checks }) });
      return row;
    } catch (e) {
      if ((e as { status?: number }).status !== 409) throw e; // 번호가 겹치면 다른 번호로 다시
    }
  }
  throw new Error("code exhausted");
}

// 보관 기간이 지난 결과는 목록을 볼 때마다 지운다
export async function listHeart(): Promise<HeartRow[]> {
  const cutoff = new Date(Date.now() - retentionDays() * 86_400_000).toISOString();
  if (!remote) {
    mem.splice(0, mem.length, ...mem.filter((r) => r.created_at >= cutoff));
    return mem;
  }
  await rest(`?created_at=lt.${cutoff}`, { method: "DELETE" });
  return rest("?select=id,code,name,checks,created_at&order=created_at.desc&limit=500");
}

export async function deleteHeart(id: string) {
  if (!remote) return void mem.splice(0, mem.length, ...mem.filter((r) => r.id !== id));
  await rest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}
