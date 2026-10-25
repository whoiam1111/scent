import type { SceneHints } from "./diary";
import type { Figure, PictureStyle } from "./figures";

// 생성형 그림(OpenAI gpt-image)용 영어 프롬프트. 한국 팝업이라 장소·사람을 한국으로 맞춘다.
// 이미지 모델은 키워드 나열보다 문장형 묘사를 잘 따른다: 무엇(매체) → 누가 → 어디서·언제 → 구체 묘사 → 분위기 → 촬영/화풍 순서.
// 한국어는 잘 못 알아들어서 정해진 영어 표현을 쓰고, AI가 만든 영어 장면 묘사(description)가 있으면 가운데 넣는다.

const STYLE: Record<PictureStyle, { medium: string; finish: string }> = {
  watercolor: {
    medium: "A delicate watercolor painting",
    finish: "Painted with soft wet-on-wet washes and gentle bleeding edges in a calm, simple composition, luminous natural light, the paint reaching every edge of the picture.",
  },
  photo: {
    medium: "A realistic candid photograph",
    finish: "It looks like a real photo, not an illustration or 3D render: shot on 35mm film with natural light, shallow depth of field, true-to-life skin tones and colors, subtle film grain, documentary style.",
  },
  // 한국 아동 3D 애니메이션(뽀로로 같은) 느낌. 캐릭터 이름은 넣지 않는다: 저작권 캐릭터를 그대로 그리거나 거절될 수 있다
  cartoon: {
    medium: "A cute 3D animated still in the style of a Korean children's TV cartoon",
    finish: "Rendered like a cheerful kids' animation: soft rounded chubby shapes, big round expressive eyes, small simple features, smooth clean CG surfaces, bright pastel colors, soft even lighting, playful and heartwarming. Original characters only, no existing cartoon characters.",
  },
};
const NO_MARKS = "The image fills the whole frame edge to edge with no white margin and no border. No writing anywhere: no signs with letters, no text, no signature, no watermark.";

// 장소는 한국에서 흔한 모습으로 (뒤에 "in South Korea"가 붙는다)
const SCENE: Record<SceneHints["scene"], string> = {
  sea: "on a sandy east-coast beach with calm waves",
  mountain: "on a Korean mountain trail among pine trees",
  city: "in a quiet residential alley with low-rise buildings and small neighborhood shops",
  home: "in a cozy Korean apartment room by a window",
  food: "at a low table with a home-cooked Korean meal and side dishes",
  flower: "on a Korean neighborhood path lined with blooming flowers",
  music: "in a cozy Korean room with music playing",
  travel: "by the window of a Korean train passing through the countryside",
  field: "in an open countryside field",
};

const SKY: Record<SceneHints["sky"], string> = {
  day: "on a clear day with soft daylight",
  sunset: "at sunset with warm golden light",
  night: "at night under soft city lights and stars",
  rain: "on a rainy day with wet reflections",
  snow: "while snow is gently falling",
};

const MOOD: Record<string, string> = {
  기쁨: "joyful", 행복함: "happy", 즐거움: "cheerful", 설렘: "fluttering", 따뜻함: "warm", 편안함: "relaxed", 평온함: "peaceful", 감사함: "grateful",
  뿌듯함: "proud", 벅참: "uplifting", 사랑스러움: "lovely", 다정함: "tender", 든든함: "reassuring", 안도감: "relieved", 후련함: "refreshing", 자유로움: "free",
  만족스러움: "content", 신기함: "wondrous", 그리움: "nostalgic", 아쉬움: "wistful", 외로움: "lonely", 불안: "uneasy", 막막함: "hazy and uncertain",
};

const RELATION: Record<string, string> = {
  친구: "a friend", 연인: "a partner", 엄마: "mother", 아빠: "father", 형제자매: "a sibling", 할머니: "grandmother", 할아버지: "grandfather", 동료: "a coworker", "처음 만난 사람": "a stranger",
};

// 인물은 한국 사람으로
export function personText(f: Figure): string {
  const g = f.gender;
  const pick = (female: string, male: string, none: string) => (g === "female" ? female : g === "male" ? male : none);
  switch (f.age) {
    case "child": return pick("a little Korean girl", "a little Korean boy", "a small Korean child");
    case "teen": return pick("a Korean teenage girl", "a Korean teenage boy", "a Korean teenager");
    case "adult": return pick("a young Korean woman", "a young Korean man", "a young Korean adult");
    case "middle": return pick("a middle-aged Korean woman", "a middle-aged Korean man", "a middle-aged Korean person");
    case "senior": return pick("an elderly Korean woman", "an elderly Korean man", "an elderly Korean person");
    default: return pick("a Korean woman", "a Korean man", "a Korean person");
  }
}

export type PictureInput = { hints: SceneHints; me: Figure; mate: Figure; who: string; emotions: string[]; description?: string; details?: string; style?: PictureStyle };

export function picturePrompt({ hints, me, mate, who, emotions, description, details, style = "watercolor" }: PictureInput): string {
  const st = STYLE[style];
  // 앞모습도 괜찮다. 사람 수를 앞에 두어야 모델이 빠뜨리지 않는다
  const who2 = RELATION[who] ? `, ${RELATION[who]}` : "";
  const n = Math.min(hints.people, 5);
  const pair = `${personText(me)} and ${personText(mate)}${who2}`;
  const subject =
    n === 0
      ? "a quiet scene with no people"
      : n === 1
        ? `${personText(me)} with a natural expression`
        : n === 2
          ? `exactly two people, ${pair}, together with natural expressions`
          : n === 5
            ? `a lively group of five Korean people, including ${pair}, gathered together with natural expressions, every person clearly visible`
            : `exactly ${n === 3 ? "three" : "four"} people, ${pair} and ${n === 3 ? "one more Korean person" : "two more Korean people"}, together with natural expressions`;
  const mood = emotions.map((e) => MOOD[e]).filter(Boolean).join(" and ");
  return [
    `${st.medium} of ${subject}, ${SCENE[hints.scene]} in South Korea, ${SKY[hints.sky]}.`,
    description?.trim().replace(/([^.])$/, "$1."),
    // 참가자가 직접 적은 옷차림·머리 모양 등. 한국어 원문 그대로 넘기고, 기본 묘사보다 우선하게 한다
    details && `MOST IMPORTANT — the participant described these details in Korean, follow them exactly: "${details.replace(/[.\s]+$/, "")}". Clothing (sleeve and pants length), hairstyle and hair length, colors and objects must match these words precisely, overriding anything else in this prompt.`,
    // 모델이 서양인 얼굴로 기울지 않게 따로 못박는다. 적은 내용이 있으면 머리·옷은 그쪽을 따른다
    n > 0 && `${n === 1 ? "The person is" : n === 2 ? "Both people are" : "All the people are"} Korean, with East Asian facial features${details ? "" : ", natural black or dark brown hair and everyday Korean clothing and styling"}.`,
    mood && `The moment feels ${mood}, and the light, colors and posture carry that feeling.`,
    st.finish,
    NO_MARKS,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 2000);
}
