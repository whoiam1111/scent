import { scoreHeart } from "@/lib/heart";
import { getTelegramIds, listHeart, setTelegramIds, type HeartRow } from "@/lib/heartStore";

// 코칭존 신청을 누적 양식 그대로 텔레그램 방에 쌓는다 (서버 전용). TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID가 없으면 아무것도 안 한다.
// 하루(한국 시각)에 메시지 하나: 신청이 들어올 때마다 그날 신청 전체를 DB에서 다시 모아 그 메시지를 고친다.
// 그래서 순서는 언제나 참가 순서이고, 동시에 들어와도 마지막에 고친 쪽이 전체를 담는다.
// shortcut: 그날 첫 신청 두 건이 거의 동시에 들어오면 메시지가 두 개 생길 수 있다. 자주 생기면 잠금을 둔다

const HEAD = `구분 : 향수행사
날짜 :

✔️ 당터뷰하시는 분들 필독
1) 코칭 신청 X여도 최대한 연락처를 확보 한다
2) 코칭 신청시 생년월일 꼭 기입
3) MBTI, 군입대시기, 약물, 센터환경, 시험시산 파악
4) 행정의 효율성을 위해 인도자지역,인도자 기재를 마무리 까지 부탁드립니다 !

✔️ 당터뷰 후 바로 누적
섭외자/성별/생년월일/연락처/인도자지역/인도자/인터뷰자/다음 만남예정일, 장소/간단정보`;

const PROGRAM = { coaching: "6회 코칭 신청", reading: "독서 인문학 강의 신청", none: "신청 안 함 · 연락처만" } as const;
const WEEK = "일월화수목금토";
const slotText = (s: string) => `${+s.slice(5, 7)}.${+s.slice(8, 10)}(${WEEK[new Date(`${s.slice(0, 10)}T00:00Z`).getUTCDay()]}) ${s.slice(11)}`;
const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
const LIMIT = 4000; // 텔레그램 메시지 한 개 4096자

// 섭외자/성별/생년월일/연락처/인도자지역/인도자/인터뷰자/다음 만남예정일, 장소/간단정보
// 연락처는 뒷자리 4개만, 모르는 칸은 비워 두고 나중에 채운다
export function entryLine(row: HeartRow) {
  const f = row.followup!;
  const top = scoreHeart(new Set(row.checks));
  const emotion = top.filter((x) => x.ratio === top[0].ratio && x.ratio > 0).map((x) => x.type.name).join("·");
  return [
    row.name,
    "",
    f.birth?.replaceAll("-", "").slice(2) ?? "",
    f.phone.replace(/\D/g, "").slice(-4),
    "",
    "",
    "",
    f.slots.map(slotText).join(", "),
    [emotion && `핵심감정 ${emotion}`, PROGRAM[f.program ?? "coaching"]].filter(Boolean).join(" · "),
  ].join("/");
}

// 양식 전체를 만들고, 길면 줄 단위로 나눈다
export function boardTexts(rows: HeartRow[]) {
  const pick = (none: boolean) => rows.filter((r) => (r.followup!.program === "none") === none).map(entryLine);
  const lines = [...HEAD.split("\n"), "", "▪️후속연결O", ...pick(false), "", "▪️후속연결 보류", ...pick(true), "", "▪️후속연결 X"];
  const out = [""];
  for (const l of lines) {
    if (out[out.length - 1].length + l.length + 1 > LIMIT) out.push("");
    out[out.length - 1] += (out[out.length - 1] ? "\n" : "") + l;
  }
  return out;
}

async function tg(method: string, body: object) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, ...body }),
  });
  return (await res.json()) as { ok: boolean; description?: string; result?: { message_id: number } };
}

export async function syncTelegram() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    const day = kstDay(new Date().toISOString());
    const rows = (await listHeart()).filter((r) => r.followup && kstDay(r.created_at) === day).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const texts = boardTexts(rows);
    // 메시지 번호 표(telegram_logs)가 없으면 매번 새 메시지로라도 보낸다
    const ids = await getTelegramIds(day).catch((e) => (console.error("telegram ids", (e as Error).message), [] as number[]));
    const next: number[] = [];
    for (const [i, text] of texts.entries()) {
      if (ids[i]) {
        const r = await tg("editMessageText", { message_id: ids[i], text });
        if (r.ok || r.description?.includes("not modified")) {
          next.push(ids[i]);
          continue;
        }
      }
      const r = await tg("sendMessage", { text }); // 처음이거나, 지워진 메시지면 새로
      if (!r.ok) throw new Error(r.description);
      next.push(r.result!.message_id);
    }
    if (next.join() !== ids.join()) await setTelegramIds(day, next);
  } catch (e) {
    console.error("telegram failed", (e as Error).message);
  }
}
