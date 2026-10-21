import { z } from "zod";
import { picturePrompt } from "@/lib/picture";

// 그림 생성: Cloudflare Workers AI (FLUX.1 schnell). 무료 한도는 하루 1만 뉴런(1024px 약 170장).
// 키가 없거나 실패하면 화면이 템플릿 그림으로 대신한다. 받은 내용과 그림은 저장하지 않는다.
export const maxDuration = 30;

const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const enabled = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

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
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: picturePrompt(parsed.data), steps: 6 }),
      signal: AbortSignal.timeout(25_000),
    });
    const j = await res.json().catch(() => null);
    const image: unknown = j?.result?.image ?? j?.image;
    if (!res.ok || typeof image !== "string") {
      console.error("picture generation failed", res.status, j?.errors?.[0]?.code); // 한도 초과면 보통 429
      return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
    }
    return Response.json({ image: `data:image/jpeg;base64,${image}` });
  } catch (e) {
    console.error("picture generation failed", (e as Error).name);
    return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
  }
}
