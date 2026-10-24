import { z } from "zod";
import { picturePrompt } from "@/lib/picture";

// 그림 생성: Higgsfield (SOUL, 1:1 720p). 비동기라 제출 후 완료될 때까지 상태를 조회한다.
// 키가 없거나 실패하면 화면이 템플릿 그림으로 대신한다. 받은 그림은 data URL로 넘기고 Higgsfield 쪽 기록은 바로 지운다.
export const maxDuration = 60;

const API = "https://api.higgsfield.ai";
const MODEL = "higgsfield-ai/soul/standard";
const enabled = () => Boolean(process.env.HF_CREDENTIALS);
const auth = () => ({ Authorization: `Key ${process.env.HF_CREDENTIALS}` });
const DONE = ["completed", "failed", "nsfw", "canceled"];

const Figure = z.object({
  gender: z.enum(["none", "female", "male"]),
  age: z.enum(["", "child", "teen", "adult", "middle", "senior"]),
});
const Body = z.object({
  hints: z.object({
    scene: z.enum(["sea", "mountain", "city", "home", "food", "flower", "music", "travel", "field"]),
    sky: z.enum(["day", "sunset", "night", "rain", "snow"]),
    people: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  }),
  me: Figure,
  mate: Figure,
  who: z.string().max(10),
  emotions: z.array(z.string().max(20)).max(2),
  description: z.string().max(400).optional(),
  style: z.enum(["watercolor", "photo"]).optional(),
});

export async function POST(req: Request) {
  if (!enabled()) return Response.json({ error: "그림 생성이 설정되지 않았어요." }, { status: 501 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청을 확인해 주세요." }, { status: 400 });

  try {
    const deadline = Date.now() + 45_000;
    const sub = await fetch(`${API}/${MODEL}`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json", "Hf-Expires-After": "3600" },
      body: JSON.stringify({ prompt: picturePrompt(parsed.data), aspect_ratio: "1:1", resolution: "720p", batch_size: 1 }),
      signal: AbortSignal.timeout(15_000),
    });
    let j = await sub.json().catch(() => null);
    if (!sub.ok || typeof j?.status_url !== "string") {
      console.error("picture generation failed", sub.status, j?.detail ?? j?.error); // 크레딧 부족이면 보통 402
      return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
    }
    const id: string = j.request_id;
    const statusUrl: string = j.status_url;
    for (let delay = 1500; !DONE.includes(j?.status) && Date.now() < deadline; delay = Math.min(delay * 1.5, 5000)) {
      await new Promise((r) => setTimeout(r, delay));
      const st = await fetch(statusUrl, { headers: auth(), signal: AbortSignal.timeout(10_000) });
      if (st.ok) j = await st.json().catch(() => j);
    }
    const url: unknown = j?.images?.[0]?.url;
    if (j?.status !== "completed" || typeof url !== "string") {
      if (!DONE.includes(j?.status)) fetch(`${API}/requests/${id}/cancel`, { method: "POST", headers: auth() }).catch(() => {});
      console.error("picture generation failed", j?.status);
      return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
    }
    // 키링 저장(캔버스)이 막히지 않게 서버에서 받아 data URL로 넘긴다
    const img = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!img.ok) throw new Error("download");
    const type = img.headers.get("content-type") ?? "image/jpeg";
    const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
    fetch(`${API}/requests/${id}`, { method: "DELETE", headers: auth() }).catch(() => {});
    return Response.json({ image: `data:${type};base64,${b64}` });
  } catch (e) {
    console.error("picture generation failed", (e as Error).name);
    return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
  }
}
