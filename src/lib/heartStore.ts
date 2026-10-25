import { randomInt } from "node:crypto";

// 상담용 핵심감정 체크 결과 저장소 (서버 전용). Supabase REST를 fetch로 직접 부른다.
// 저장하는 것: 이름, 4자리 상담 번호, 고른 문항 키, 시각. 그림일기(키링) PNG는 Storage 버킷 image에 (참가자가 저장할 때). 기억 글은 저장하지 않는다.
// SUPABASE_* 가 없으면 개발 중에만 메모리에 둔다 (서버를 재시작하면 사라짐).

// keyring_at: 키링 이미지가 들어온 시각. 이미지 자체는 무거워서 목록에 싣지 않고 getKeyring으로 따로 받는다
export type HeartRow = { id: string; code: string; name: string; checks: string[]; created_at: string; keyring_at?: string | null };
type MemRow = HeartRow & { keyring?: Buffer };

// 대시보드에서 REST 주소(…/rest/v1/)를 통째로 복사해 넣는 경우가 많아 프로젝트 주소만 남긴다
const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const remote = Boolean(url && key);
export const storeReady = () => remote || process.env.NODE_ENV !== "production";
export const retentionDays = () => Number(process.env.HEART_RETENTION_DAYS) || 7;

const mem = ((globalThis as { __heart?: MemRow[] }).__heart ??= []);

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
  return rest("?select=id,code,name,checks,created_at,keyring_at&order=created_at.desc&limit=500");
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

export async function deleteHeart(id: string) {
  if (!remote) return void mem.splice(0, mem.length, ...mem.filter((r) => r.id !== id));
  await removeImages([id]);
  await rest(`?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}
