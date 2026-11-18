import { after } from "next/server";
import { z } from "zod";
import { saveFollowUp, type FollowUp } from "@/lib/heartStore";
import { syncTelegram } from "@/lib/telegram";

// 상담사 전용 (src/proxy.ts가 비밀번호로 막는다). 코칭존 패드에서 받은 후속 프로그램 신청을 저장하고,
// 텔레그램 누적 메시지를 고친다 (src/lib/telegram.ts).

const phone = z.string().trim().regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/);
// 생년월일 8자리 (19990101). 실제 있는 날짜만
const birth = z
  .string()
  .regex(/^(19|20)\d{6}$/)
  .transform((b) => `${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6)}`)
  .refine((b) => new Date(`${b}T00:00Z`).toISOString().startsWith(b) && b <= new Date().toISOString().slice(0, 10));
const Body = z.discriminatedUnion("program", [
  z.object({ program: z.literal("coaching"), phone, birth, slots: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)).min(1).max(3), agreed: z.literal(true) }),
  // 코칭 대신 툴즈 × 로고스스튜디오 독서 인문학 강의: 일정은 따로 안내한다
  z.object({ program: z.literal("reading"), phone, birth, agreed: z.literal(true) }),
  // 신청은 안 하고 연락처만 남긴다
  z.object({ program: z.literal("none"), phone, birth }),
]);

export async function POST(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "연락처·생년월일·일정·주의사항 확인을 다시 봐 주세요." }, { status: 400 });
  try {
    const d = parsed.data;
    const followup: FollowUp = {
      program: d.program,
      phone: d.phone,
      birth: d.birth,
      slots: d.program === "coaching" ? [...new Set(d.slots)].sort() : [],
      agreed: d.program !== "none",
      at: new Date().toISOString(),
    };
    const row = await saveFollowUp(id, followup);
    if (!row) return Response.json({ error: "참가자 결과를 찾지 못했어요." }, { status: 404 });
    after(syncTelegram); // 패드가 텔레그램을 기다리지 않게
    return Response.json({ ok: true });
  } catch (e) {
    console.error("followup save failed", (e as Error).message);
    // 400: DB에 followup 칸이 아직 없다 (scripts/schema.sql)
    const msg = (e as { status?: number }).status === 400 ? "DB에 신청 칸(followup)이 없어요. scripts/schema.sql을 실행해 주세요." : "신청을 저장하지 못했어요.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
