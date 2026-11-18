import { after, connection } from "next/server";
import { deleteHeart, listHeart } from "@/lib/heartStore";
import { syncTelegram } from "@/lib/telegram";

// 상담사 전용 (src/proxy.ts가 비밀번호로 막는다)

export async function GET() {
  await connection();
  try {
    return Response.json({ rows: await listHeart() });
  } catch (e) {
    console.error("coach list failed", (e as Error).message);
    return Response.json({ error: "목록을 불러오지 못했어요." }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  await deleteHeart(id);
  after(syncTelegram); // 지운 사람을 텔레그램 누적에서도 뺀다
  return Response.json({ ok: true });
}
