import { getKeyring } from "@/lib/heartStore";

// 상담사 전용 (src/proxy.ts가 비밀번호로 막는다). 키링 PNG를 내려준다.

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("잘못된 요청", { status: 400 });
  try {
    const png = await getKeyring(id);
    if (!png) return new Response("없음", { status: 404 });
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("keyring load failed", (e as Error).message);
    return new Response("불러오지 못했어요", { status: 502 });
  }
}
