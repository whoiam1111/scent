import { z } from "zod";
import { picturePrompt } from "@/lib/picture";

// 그림 생성: OpenAI Images (1024x1024). 응답이 base64라 그대로 data URL로 넘긴다.
// 키가 없거나 실패하면 화면이 템플릿 그림으로 대신한다.
export const maxDuration = 60;

const MODEL = "gpt-image-2.5-flare";
const enabled = () => Boolean(process.env.OPENAI_API_KEY);

const Figure = z.object({
  gender: z.enum(["none", "female", "male"]),
  age: z.enum(["", "child", "teen", "adult", "middle", "senior"]),
});
const Body = z.object({
  hints: z.object({
    scene: z.enum(["sea", "mountain", "city", "home", "food", "flower", "music", "travel", "field"]),
    sky: z.enum(["day", "sunset", "night", "rain", "snow"]),
    people: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  }),
  me: Figure,
  mate: Figure,
  who: z.string().max(10),
  emotions: z.array(z.string().max(20)).max(2),
  description: z.string().max(400).optional(),
  details: z.string().trim().max(300).optional(), // 참가자가 직접 적은 옷차림·머리 모양 (한국어)
  style: z.enum(["watercolor", "photo", "cartoon"]).optional(),
});

export async function POST(req: Request) {
  if (!enabled()) return Response.json({ error: "그림 생성이 설정되지 않았어요." }, { status: 501 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청을 확인해 주세요." }, { status: 400 });

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt: picturePrompt(parsed.data), size: "1024x1024", quality: "medium", output_format: "jpeg", n: 1 }),
      signal: AbortSignal.timeout(45_000),
    });
    const j = await res.json().catch(() => null);
    const b64: unknown = j?.data?.[0]?.b64_json;
    if (!res.ok || typeof b64 !== "string") {
      console.error("picture generation failed", res.status, j?.error?.code ?? j?.error?.type); // 크레딧 부족이면 보통 429 insufficient_quota
      return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
    }
    return Response.json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (e) {
    console.error("picture generation failed", (e as Error).name);
    return Response.json({ error: "그림을 만들지 못했어요." }, { status: 502 });
  }
}
