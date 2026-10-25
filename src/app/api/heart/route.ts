import { z } from "zod";
import { AREAS, heartTypes, itemKey, scoreHeart } from "@/lib/heart";
import { SCENTS } from "@/lib/scent";
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
    const checks = [...new Set(parsed.data.checks)];
    // 참가자 화면(ScentResult)과 같은 규칙으로 서버에서 다시 정한다: 1위 유형의 조합
    const top = scoreHeart(new Set(checks))[0];
    const scent = top.ratio > 0 ? { type: top.type.name, ...SCENTS[top.type.name] } : null;
    const row = await saveHeart(parsed.data.name, checks, scent);
    // id는 키링 이미지를 붙일 때 쓰는 비밀 열쇠 (4자리 번호는 추측할 수 있어서 쓰지 않는다)
    return Response.json({ code: row.code, id: row.id });
  } catch (e) {
    console.error("heart save failed", (e as Error).message);
    return Response.json({ error: "결과를 보내지 못했어요." }, { status: 502 });
  }
}
