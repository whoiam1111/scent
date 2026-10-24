// Higgsfield 이미지 생성 확인용 (앱의 /api/picture와 같은 모델). 실행: npm run image (장당 과금)
import { config, higgsfield } from "@higgsfield/client/v2";

if (!process.env.HF_CREDENTIALS) {
  console.error("HF_CREDENTIALS is not set. Add it to .env.local as key-id:key-secret.");
  process.exit(1);
}
config({ credentials: process.env.HF_CREDENTIALS });

try {
  const result = await higgsfield.subscribe("higgsfield-ai/soul/standard", {
    input: { prompt: "A delicate watercolor painting of a quiet Korean seaside at sunset", aspect_ratio: "1:1", resolution: "720p", batch_size: 1 },
    withPolling: true,
  });
  const url = result.images?.[0]?.url;
  if (result.status !== "completed" || !url) {
    console.error(`Generation did not succeed: status=${result.status} request_id=${result.request_id}`);
    process.exit(1);
  }
  console.log(url);
} catch (e) {
  // Print only message and API status/body, never the request config (it holds the credentials header).
  const err = e as Error & { response?: { status?: number; data?: unknown } };
  console.error("Request failed:", err.name, err.message, err.response?.status ?? "", JSON.stringify(err.response?.data ?? ""));
  process.exit(1);
}
