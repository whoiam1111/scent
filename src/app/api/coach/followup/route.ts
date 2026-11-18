import { z } from "zod";
import { saveFollowUp } from "@/lib/heartStore";

// 상담사 전용 (src/proxy.ts가 비밀번호로 막는다). 코칭존 패드에서 받은 후속 프로그램 신청(6회 코칭 또는 독서 인문학 강의)을 저장한다.

const phone = z.string().trim().regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/);
const Body = z.discriminatedUnion("program", [
  z.object({ program: z.literal("coaching"), phone, slots: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)).min(1).max(3), agreed: z.literal(true) }),
  // 코칭 대신 툴즈 × 로고스스튜디오 독서 인문학 강의: 일정은 따로 안내한다
  z.object({ program: z.literal("reading"), phone, agreed: z.literal(true) }),
]);

export async function POST(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "프로그램·연락처·일정·주의사항 확인을 다시 봐 주세요." }, { status: 400 });
  try {
    const d = parsed.data;
    const slots = d.program === "coaching" ? [...new Set(d.slots)].sort() : [];
    const ok = await saveFollowUp(id, { program: d.program, phone: d.phone, slots, agreed: true, at: new Date().toISOString() });
    if (!ok) return Response.json({ error: "참가자 결과를 찾지 못했어요." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("followup save failed", (e as Error).message);
    // 400: DB에 followup 칸이 아직 없다 (scripts/schema.sql)
    const msg = (e as { status?: number }).status === 400 ? "DB에 신청 칸(followup)이 없어요. scripts/schema.sql을 실행해 주세요." : "신청을 저장하지 못했어요.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
