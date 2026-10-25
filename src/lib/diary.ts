// 감정·장면 단서와 데모용 그림 일기 문장 생성 (서버와 브라우저 공용)

// 밝은 감정을 앞에, 아릿하거나 무거운 감정을 뒤에 둔다. 기억 탐색의 느낌(explore.ts feelings)은 모두 이 안에 있다
export const EMOTIONS = [
  "기쁨", "행복함", "즐거움", "설렘", "따뜻함", "편안함", "평온함", "감사함",
  "뿌듯함", "벅참", "사랑스러움", "다정함", "든든함", "안도감", "후련함", "자유로움",
  "만족스러움", "신기함", "그리움", "아쉬움", "외로움", "불안", "막막함", "기타",
] as const;

// 감정별 색 — 그림의 하늘/포인트 색으로 쓴다 (아이보리·살구·세이지·브라운 계열 안에서 변주)
export const EMOTION_COLORS: Record<string, { sky: [string, string]; accent: string }> = {
  기쁨: { sky: ["#fde7c8", "#f9c79a"], accent: "#e9895c" },
  편안함: { sky: ["#e8eedf", "#cbd8bf"], accent: "#8fa37e" },
  설렘: { sky: ["#fde3dc", "#f6bfae"], accent: "#e07f6a" },
  뿌듯함: { sky: ["#fbe9c4", "#ecc985"], accent: "#c78f3c" },
  사랑스러움: { sky: ["#fbe4e0", "#f2c3bd"], accent: "#d9857a" },
  그리움: { sky: ["#ece4dc", "#cdbbaa"], accent: "#9b7a5f" },
  아쉬움: { sky: ["#ebe3dc", "#d3c1b3"], accent: "#a67f68" },
  외로움: { sky: ["#e4e6e6", "#bfc6c8"], accent: "#7f8e94" },
  불안: { sky: ["#e7e4df", "#c9c2b8"], accent: "#8a7e70" },
  후련함: { sky: ["#e3eef0", "#bcd6d6"], accent: "#6f9c9a" },
  자유로움: { sky: ["#e2edf0", "#b9d3dc"], accent: "#6b97a6" },
  막막함: { sky: ["#e6e2dc", "#c4bcb0"], accent: "#857866" },
  감사함: { sky: ["#fbead2", "#efcfa6"], accent: "#c98a52" },
  평온함: { sky: ["#eaeee4", "#d2dcc8"], accent: "#93a487" },
  벅참: { sky: ["#fde2cd", "#f4b98f"], accent: "#d9754a" },
  행복함: { sky: ["#fde6cf", "#f6c597"], accent: "#e08a55" },
  즐거움: { sky: ["#fdebc6", "#f7cf8a"], accent: "#d99a3e" },
  따뜻함: { sky: ["#fbe4d2", "#efc3a2"], accent: "#c97f5a" },
  다정함: { sky: ["#fbe6df", "#efc6b8"], accent: "#c98472" },
  든든함: { sky: ["#e9eadb", "#cfd2b2"], accent: "#8c9465" },
  안도감: { sky: ["#e6eee8", "#c6d8cc"], accent: "#7f9e8b" },
  만족스러움: { sky: ["#f8ead0", "#e8cd9c"], accent: "#b98d4f" },
  신기함: { sky: ["#e6e9f2", "#c7cfe2"], accent: "#7d88aa" },
  기타: { sky: ["#f3ece0", "#e2d4c0"], accent: "#a58a6c" },
};

export type Scene = "sea" | "mountain" | "city" | "home" | "food" | "flower" | "music" | "travel" | "field";
export type Sky = "day" | "sunset" | "night" | "rain" | "snow";

const SCENE_WORDS: [Scene, string[]][] = [
  ["sea", ["바다", "해변", "파도", "바닷", "강가", "한강", "호수", "해수욕"]],
  ["mountain", ["산", "숲", "등산", "나무", "공원", "캠핑"]],
  ["food", ["밥", "음식", "김밥", "커피", "카페", "먹", "빵", "케이크", "라면", "식당", "요리"]],
  ["music", ["노래", "음악", "공연", "콘서트", "기타 치", "피아노"]],
  ["flower", ["꽃", "화분", "봄", "정원", "마당", "벚꽃"]],
  ["travel", ["여행", "기차", "비행기", "공항", "버스 창", "떠났"]],
  ["city", ["길", "골목", "버스", "지하철", "거리", "도시", "퇴근", "학교", "회사"]],
  ["home", ["집", "방", "창문", "이불", "침대", "거실", "부엌"]],
];

const SKY_WORDS: [Sky, string[]][] = [
  ["snow", ["눈이 오", "눈 오", "눈이 내", "눈 내", "눈사람", "함박눈", "첫눈"]],
  ["rain", ["비가", "비 오", "우산", "장마", "빗"]],
  ["night", ["밤", "새벽", "별", "달빛", "야경"]],
  ["sunset", ["노을", "저녁", "해 질", "해질", "석양"]],
];

const PEOPLE_WORDS = ["친구", "가족", "엄마", "아빠", "할머니", "할아버지", "언니", "오빠", "누나", "형", "동생", "연인", "애인", "우리", "함께", "같이", "둘이"];

// people: 그림 속 사람 수(나 포함). 5는 "다섯 명 이상·여럿"을 뜻한다
export type SceneHints = { scene: Scene; sky: Sky; people: 0 | 1 | 2 | 3 | 4 | 5 };

const COUNT_WORDS: [3 | 4 | 5, string[]][] = [
  [5, ["다섯", "5명", "여섯", "6명", "일곱", "여덟", "여럿", "여러 명", "다 같이", "다같이", "모두 함께", "친구들", "가족들", "동료들", "단체"]],
  [4, ["넷이", "네 명", "네명", "4명", "넷이서"]],
  [3, ["셋이", "세 명", "세명", "3명", "셋이서"]],
];

export function detectScene(text: string): SceneHints {
  const scene = SCENE_WORDS.find(([, ws]) => ws.some((w) => text.includes(w)))?.[0] ?? "field";
  const sky = SKY_WORDS.find(([, ws]) => ws.some((w) => text.includes(w)))?.[0] ?? "day";
  const many = COUNT_WORDS.find(([, ws]) => ws.some((w) => text.includes(w)))?.[0];
  const people = many ?? (PEOPLE_WORDS.some((w) => text.includes(w)) ? 2 : text.includes("혼자") || text.includes("나는") || text.includes("내가") ? 1 : 0);
  return { scene, sky, people };
}

export type Diary = { title: string; text: string };

const SCENE_TITLE: Record<Scene, string> = {
  sea: "바다",
  mountain: "초록",
  city: "그 길",
  home: "작은 방",
  food: "따뜻한 한 끼",
  flower: "꽃",
  music: "노래",
  travel: "먼 곳",
  field: "그날",
};

const SKY_PREFIX: Record<Sky, string> = { day: "", sunset: "해 질 무렵, ", night: "밤의 ", rain: "비 오는 날, ", snow: "눈 내리는 날, " };

function withParticle(word: string, a: string, b: string) {
  const c = word.charCodeAt(word.length - 1);
  return word + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b);
}

// 데모 모드: AI 없이 참가자의 문장을 그대로 살려 짧게 엮는다. 새로운 사실은 덧붙이지 않는다.
export function demoDiary(memory: string, emotions: string[]): Diary {
  const { scene, sky } = detectScene(memory);
  const feel = emotions.filter((e) => e !== "기타");
  const first = memory
    .trim()
    .split(/(?<=[.!?。])\s+|\n+/)[0]
    .replace(/[.!?。]+$/, "");
  const line1 = first.length > 70 ? `${first.slice(0, 68)}…` : first;
  const feelText = feel.length ? withParticle(feel.join("과 "), "을", "를") : "그 마음을";
  return {
    title: `${SKY_PREFIX[sky]}${SCENE_TITLE[scene]}`,
    text: `${line1}.\n그 순간의 ${feelText} 오래 간직하고 싶다.`,
  };
}
