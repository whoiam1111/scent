import { after } from "next/server";
import { z } from "zod";
import { scoreHeart } from "@/lib/heart";
import { saveFollowUp, type FollowUp, type HeartRow } from "@/lib/heartStore";

// 상담사 전용 (src/proxy.ts가 비밀번호로 막는다). 코칭존 패드에서 받은 후속 프로그램 신청을 저장하고,
// TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID가 있으면 누적 양식 한 줄로 텔레그램 방에 보낸다.

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

const PROGRAM = { coaching: "6회 코칭 신청", reading: "독서 인문학 강의 신청", none: "신청 안 함 · 연락처만" } as const;
const WEEK = "일월화수목금토";
const slotText = (s: string) => `${+s.slice(5, 7)}.${+s.slice(8, 10)}(${WEEK[new Date(`${s.slice(0, 10)}T00:00Z`).getUTCDay()]}) ${s.slice(11)}`;

// 누적 양식: 섭외자/성별/생년월일/연락처/인도자지역/인도자/인터뷰자/다음 만남예정일, 장소/간단정보
// 연락처는 뒷자리 4개만, 모르는 칸은 비워 두고 나중에 고친다
function telegramText(row: HeartRow, f: FollowUp) {
  const program = f.program ?? "coaching";
  const top = scoreHeart(new Set(row.checks));
  const emotion = top.filter((x) => x.ratio === top[0].ratio && x.ratio > 0).map((x) => x.type.name).join("·");
  const fields = [
    row.name,
    "",
    f.birth?.replaceAll("-", ".") ?? "",
    f.phone.replace(/\D/g, "").slice(-4),
    "",
    "",
    "",
    f.slots.map(slotText).join(", "),
    [emotion && `핵심감정 ${emotion}`, PROGRAM[program]].filter(Boolean).join(" · "),
  ];
  return `${program === "none" ? "▪️후속연결 보류" : "▪️후속연결O"}\n${fields.join("/")}`;
}

async function notify(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text }) });
    if (!res.ok) console.error("telegram failed", res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error("telegram failed", (e as Error).message);
  }
}

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
    after(() => notify(telegramText(row, followup))); // 패드가 텔레그램을 기다리지 않게
    return Response.json({ ok: true });
  } catch (e) {
    console.error("followup save failed", (e as Error).message);
    // 400: DB에 followup 칸이 아직 없다 (scripts/schema.sql)
    const msg = (e as { status?: number }).status === 400 ? "DB에 신청 칸(followup)이 없어요. scripts/schema.sql을 실행해 주세요." : "신청을 저장하지 못했어요.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
