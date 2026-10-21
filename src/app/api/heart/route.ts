import { z } from "zod";
import { AREAS, heartTypes, itemKey } from "@/lib/heart";
import { saveHeart, storeReady } from "@/lib/heartStore";

// 체크리스트를 마치면 바로 호출된다. 이름과 체크한 문항 키를 받아 상담 번호를 돌려준다.

const valid = new Set(heartTypes.flatMap((t) => AREAS.flatMap((a) => t.items[a].map((x) => itemKey(a, x)))));

const Body = z.object({
  name: z.string().trim().min(1).max(20),
  checks: z.array(z.string().refine((k) => valid.has(k))).min(1).max(valid.size),
});

export async function POST(req: Request) {
  if (!storeReady()) return Response.json({ error: "상담 저장이 설정되지 않았어요." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "이름과 체크한 내용을 다시 확인해 주세요." }, { status: 400 });
  try {
    const row = await saveHeart(parsed.data.name, [...new Set(parsed.data.checks)]);
    return Response.json({ code: row.code });
  } catch (e) {
    console.error("heart save failed", (e as Error).message);
    return Response.json({ error: "결과를 보내지 못했어요." }, { status: 502 });
  }
}
