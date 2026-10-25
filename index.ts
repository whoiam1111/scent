// OpenAI 이미지 생성 확인용 (앱의 /api/picture와 같은 모델). 실행: npm run image (장당 과금)
import { writeFileSync } from "node:fs";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("OPENAI_API_KEY is not set. Add it to .env.local.");
  process.exit(1);
}

const res = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gpt-image-2.5-flare", prompt: "A delicate watercolor painting of a quiet Korean seaside at sunset", size: "1024x1024", quality: "medium", output_format: "jpeg", n: 1 }),
});
const j = await res.json().catch(() => null);
const b64 = j?.data?.[0]?.b64_json;
if (!res.ok || typeof b64 !== "string") {
  console.error("Generation failed:", res.status, JSON.stringify(j?.error ?? j));
  process.exit(1);
}
writeFileSync("test-image.jpg", Buffer.from(b64, "base64"));
console.log("saved test-image.jpg");
