import type { SceneHints } from "./diary";
import type { Figure, PictureStyle } from "./figures";

// 생성형 그림(Cloudflare Workers AI · FLUX)용 영어 프롬프트. Flux는 한국어를 잘 못 알아들어서
// 장면·날씨·인물을 정해진 영어 표현으로 바꾸고, AI가 만든 영어 장면 묘사(description)가 있으면 함께 넣는다.

const NO_MARKS = "full-bleed edge to edge, no border, no frame, no text, no letters, no watermark";
const STYLE: Record<PictureStyle, string> = {
  watercolor: `delicate watercolor painting, soft wet-on-wet washes, gentle bleeding edges, visible cold-press paper texture, luminous light, ${NO_MARKS}`,
  photo: `realistic candid photograph, natural light, 35mm film look, shallow depth of field, gentle film grain, ${NO_MARKS}`,
};

const SCENE: Record<SceneHints["scene"], string> = {
  sea: "a calm sea and a sandy beach",
  mountain: "a green forest trail",
  city: "a quiet city street",
  home: "a cozy room by a window",
  food: "a warm table with a homemade meal",
  flower: "a path lined with blooming flowers",
  music: "a cozy room filled with music",
  travel: "a view from a train window on a journey",
  field: "an open meadow",
};

const SKY: Record<SceneHints["sky"], string> = {
  day: "on a clear day",
  sunset: "at sunset",
  night: "at night under the stars",
  rain: "on a rainy day",
  snow: "while snow is falling",
};

const MOOD: Record<string, string> = {
  기쁨: "joyful", 행복함: "happy", 즐거움: "cheerful", 설렘: "fluttering", 따뜻함: "warm", 편안함: "relaxed", 평온함: "peaceful", 감사함: "grateful",
  뿌듯함: "proud", 벅참: "uplifting", 사랑스러움: "lovely", 다정함: "tender", 든든함: "reassuring", 안도감: "relieved", 후련함: "refreshing", 자유로움: "free",
  만족스러움: "content", 신기함: "wondrous", 그리움: "nostalgic", 아쉬움: "wistful", 외로움: "lonely", 불안: "uneasy", 막막함: "hazy and uncertain",
};

const RELATION: Record<string, string> = {
  친구: "a friend", 연인: "a partner", 엄마: "mother", 아빠: "father", 형제자매: "a sibling", 할머니: "grandmother", 할아버지: "grandfather", 동료: "a coworker", "처음 만난 사람": "a stranger",
};

export function personText(f: Figure): string {
  const g = f.gender;
  const pick = (female: string, male: string, none: string) => (g === "female" ? female : g === "male" ? male : none);
  switch (f.age) {
    case "child": return pick("a little girl", "a little boy", "a small child");
    case "teen": return pick("a teenage girl", "a teenage boy", "a teenager");
    case "adult": return pick("a young woman", "a young man", "a young adult");
    case "middle": return pick("a middle-aged woman", "a middle-aged man", "a middle-aged person");
    case "senior": return pick("an elderly woman", "an elderly man", "an elderly person");
    default: return pick("a woman", "a man", "a person");
  }
}

export type PictureInput = { hints: SceneHints; me: Figure; mate: Figure; who: string; emotions: string[]; description?: string; style?: PictureStyle };

export function picturePrompt({ hints, me, mate, who, emotions, description, style = "watercolor" }: PictureInput): string {
  const place = `${SCENE[hints.scene]} ${SKY[hints.sky]}`;
  // 얼굴은 그리지 않는다 (실제 인물처럼 보이지 않게 늘 뒷모습)
  const people =
    hints.people === 0
      ? "no people"
      : hints.people === 1
        ? `${personText(me)} seen from behind, small in the scene`
        : `exactly two people side by side, seen from behind: ${personText(me)} and ${personText(mate)}${RELATION[who] ? ` (${RELATION[who]})` : ""}`;
  const mood = emotions.map((e) => MOOD[e]).filter(Boolean).join(" and ");
  // FLUX schnell은 앞쪽 말을 더 따르므로 사람 수를 맨 앞에 둔다
  // 감정은 빛·색·분위기로 녹인다
  return [people, place, description?.trim(), mood && `the whole scene feels ${mood}, the light and colors carry that feeling`, STYLE[style]].filter(Boolean).join(", ").slice(0, 2000);
}
