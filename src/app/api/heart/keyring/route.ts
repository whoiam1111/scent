import { saveKeyring, storeReady } from "@/lib/heartStore";

// 참가자가 키링 이미지를 저장하면 PNG를 결과에 붙인다. 코칭존에서 내려받아 키링을 만든다.
// 본문은 PNG 그대로 (base64보다 작아서 배포 환경의 요청 크기 제한 4.5MB에 덜 걸린다)

const MAX = 4_000_000;
const PNG = [0x89, 0x50, 0x4e, 0x47];

export async function POST(req: Request) {
  if (!storeReady()) return Response.json({ error: "상담 저장이 설정되지 않았어요." }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  if (Number(req.headers.get("content-length")) > MAX) return Response.json({ error: "이미지가 너무 커요." }, { status: 413 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX || !PNG.every((b, i) => buf[i] === b)) return Response.json({ error: "이미지를 확인해 주세요." }, { status: 400 });
  try {
    if (!(await saveKeyring(id, buf))) return Response.json({ error: "상담 결과를 찾지 못했어요." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("keyring save failed", (e as Error).message);
    return Response.json({ error: "키링 이미지를 보내지 못했어요." }, { status: 502 });
  }
}
