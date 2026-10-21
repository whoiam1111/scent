// 기억 탐색 도우미 질문 데이터와 분기 규칙.
// 흐름: 카테고리 → 시작 질문 → 무엇/누구(start) → 장면(scene) → 언제(when) → 느낌(feeling) → 단서 확인
// start 선택지에 scenes가 없으면 장면 단계를 건너뛰고, free가 true면 직접 적기 단계로 간다.
// 단서 문장은 "{언제} {lead} {장면}이 떠올라요." 로 이어 붙이므로, 장면은 lead 뒤에 그대로 붙여 읽혀야 한다.

export type Option = { label: string; lead?: string; scenes?: string[]; free?: boolean };

export type Category = {
  id: string;
  title: string;
  desc: string;
  questions: string[];
  startQuestion: string;
  start: Option[];
  feelings: string[];
};

const free: Option = { label: "직접 적어 볼게요", free: true };

export const categories: Category[] = [
  {
    id: "people",
    title: "사람과 함께한 순간",
    desc: "누군가와 함께였던 장면",
    questions: [
      "누군가와 함께 있어 편안했던 때가 있나요?",
      "오랜만에 만나 반가웠던 사람이 있나요?",
      "누군가의 말이나 행동이 오래 기억에 남았나요?",
      "누군가에게 고맙거나 미안했던 순간이 있나요?",
    ],
    startQuestion: "그 사람은 누구에 가까운가요?",
    start: [
      { label: "친구와 함께했던 시간", lead: "친구와", scenes: ["함께 웃고 떠들던 장면", "조용히 이야기를 나누던 장면", "어디론가 함께 걸어가던 장면", "서로를 도와주던 장면"] },
      { label: "가족과 함께했던 시간", lead: "가족과", scenes: ["둘러앉아 밥을 먹던 장면", "집에서 느긋하게 쉬던 장면", "함께 어딘가 다녀온 장면", "서로를 챙겨 주던 장면"] },
      { label: "연인과 함께했던 시간", lead: "연인과", scenes: ["나란히 걷던 장면", "밤늦도록 이야기를 나누던 장면", "함께 무언가를 보던 장면", "말없이 곁에 있던 장면"] },
      { label: "처음 만난 사람과의 순간", lead: "처음 만난 사람과", scenes: ["뜻밖의 친절을 주고받은 장면", "짧지만 따뜻한 대화를 나눈 장면", "함께 무언가를 해낸 장면"] },
      free,
    ],
    feelings: ["따뜻함", "행복함", "즐거움", "편안함", "다정함", "든든함", "그리움", "아쉬움"],
  },
  {
    id: "alone",
    title: "혼자 보낸 순간",
    desc: "온전히 나만의 시간",
    questions: [
      "혼자여서 오히려 좋았던 시간이 있나요?",
      "혼자 어디론가 떠났던 적이 있나요?",
      "아무것도 하지 않고 쉬었던 순간이 기억나나요?",
      "혼자 무언가를 해내고 뿌듯했던 때가 있나요?",
    ],
    startQuestion: "그때 나는 어디에 있었나요?",
    start: [
      { label: "내 방이나 집", lead: "집에서", scenes: ["창밖을 바라보던 장면", "좋아하는 일에 푹 빠져 있던 장면", "아무것도 하지 않고 쉬던 장면"] },
      { label: "카페나 동네의 어느 곳", lead: "동네 카페에서", scenes: ["무언가를 쓰거나 읽던 장면", "지나가는 사람들을 바라보던 장면", "따뜻한 음료를 천천히 마시던 장면"] },
      { label: "여행지나 낯선 곳", lead: "낯선 여행지에서", scenes: ["처음 보는 풍경 앞에 섰던 장면", "혼자 길을 찾아 걷던 장면", "바다나 산을 오래 바라보던 장면"] },
      free,
    ],
    feelings: ["편안함", "평온함", "자유로움", "뿌듯함", "만족스러움", "행복함", "후련함", "외로움"],
  },
  {
    id: "new",
    title: "새로운 경험",
    desc: "처음이라 선명한 장면",
    questions: [
      "처음 해봤던 일 중 기억에 남는 것이 있나요?",
      "낯선 장소에 가서 인상 깊었던 순간이 있나요?",
      "새로운 사람이나 취향을 발견했던 때가 있나요?",
      "예상과 달라서 놀랐던 순간이 있나요?",
    ],
    startQuestion: "어떤 처음에 가까운가요?",
    start: [
      { label: "처음 가 본 장소", lead: "처음 가 본 곳에서", scenes: ["설레며 이곳저곳 둘러보던 장면", "길을 잃었다가 다시 찾은 장면", "눈앞의 풍경에 놀랐던 장면"] },
      { label: "처음 해 본 일", lead: "처음 해 보는 일을", scenes: ["긴장하며 시작하던 장면", "생각보다 잘 해낸 장면", "서툴게 해내며 웃음이 났던 장면"] },
      { label: "새로 알게 된 취향", scenes: ["좋아하는 것을 처음 발견한 장면", "누군가의 추천으로 새로운 취향에 빠진 장면", "우연히 마음에 드는 것을 만난 장면"] },
      free,
    ],
    feelings: ["설렘", "즐거움", "기쁨", "벅참", "뿌듯함", "신기함", "행복함", "불안"],
  },
  {
    id: "scene",
    title: "작지만 선명한 장면",
    desc: "날씨, 노래, 냄새, 풍경",
    questions: [
      "유난히 날씨가 좋았던 날이 있나요?",
      "특정한 노래나 냄새를 맡고 어떤 순간이 떠오른 적이 있나요?",
      "맛있게 먹었던 음식이나 기억에 남는 풍경이 있나요?",
      "집으로 돌아가는 길에 기분이 좋았던 적이 있나요?",
    ],
    startQuestion: "무엇이 가장 먼저 떠오르나요?",
    start: [
      { label: "그날의 하늘과 날씨", scenes: ["맑은 하늘 아래를 걷던 장면", "노을 지는 하늘을 보던 장면", "빗소리를 듣던 장면", "눈 내리는 길을 걷던 장면"] },
      { label: "노래나 냄새", scenes: ["좋아하는 노래를 들으며 걷던 장면", "익숙한 냄새가 스쳐 간 장면", "음악을 틀어 두고 방에서 쉬던 장면"] },
      { label: "음식이나 풍경", scenes: ["맛있는 음식을 먹던 장면", "창가에서 풍경을 보던 장면", "꽃이 핀 길을 걷던 장면"] },
      { label: "집으로 가는 길", lead: "집으로 돌아가며", scenes: ["밤길을 걷던 장면", "버스나 지하철 창밖을 보던 장면", "익숙한 골목을 지나던 장면"] },
      free,
    ],
    feelings: ["평온함", "기쁨", "행복함", "편안함", "따뜻함", "자유로움", "설렘", "그리움"],
  },
  {
    id: "growth",
    title: "변화와 성장",
    desc: "조금 달라진 나를 느낀 때",
    questions: [
      "예전보다 조금 성장했다고 느낀 순간이 있나요?",
      "무언가를 끝내고 후련했던 때가 있나요?",
      "어려운 일을 지나온 뒤 안도했던 순간이 있나요?",
      "마음을 먹고 새로운 선택을 했던 적이 있나요?",
    ],
    startQuestion: "어떤 순간에 가까운가요?",
    start: [
      { label: "무언가를 끝낸 순간", scenes: ["마지막 일을 마치고 숨을 고르던 장면", "결과를 확인하던 장면", "모든 걸 끝내고 밖으로 나서던 장면"] },
      { label: "어려운 시간을 지나온 순간", lead: "어려운 시간을 지나", scenes: ["안도의 한숨을 쉬던 장면", "누군가에게 마음을 털어놓던 장면", "다시 일상으로 돌아온 장면"] },
      { label: "새로운 선택을 한 순간", scenes: ["새로운 결심을 하던 장면", "첫걸음을 내딛던 장면", "결심을 누군가에게 이야기하던 장면"] },
      free,
    ],
    feelings: ["뿌듯함", "후련함", "안도감", "벅참", "감사함", "든든함", "만족스러움", "막막함"],
  },
];

export const whenOptions = ["최근 며칠 또는 몇 주 사이", "몇 달 전", "몇 년 전"];

export type StepId = "start" | "scene" | "free" | "when" | "feeling";

// who: 직접 적기에서 고른 함께한 사람 (단계가 아니라 직접 적기 화면의 덧붙임)
export type Answers = Partial<Record<StepId | "who", string>>;

// 직접 적을 때 함께한 사람 고르기. 그림 속 인물 화면이 이 말로 모습을 미리 채운다(figures.ts)
export const WHO = ["혼자", "친구", "연인", "엄마", "아빠", "형제자매", "할머니", "할아버지", "동료", "처음 만난 사람"];

// 다음 단계 결정 — 답에 따라 장면 단계나 직접 적기 단계로 갈라진다
export function nextStep(cat: Category, step: StepId, answers: Answers): StepId | "summary" {
  if (step === "start") {
    const opt = cat.start.find((o) => o.label === answers.start);
    if (opt?.free) return "free";
    return opt?.scenes ? "scene" : "when";
  }
  if (step === "scene" || step === "free") return "when";
  if (step === "when") return "feeling";
  return "summary";
}

const whenPhrase: Record<string, string> = { "최근 며칠 또는 몇 주 사이": "얼마 전", "몇 달 전": "몇 달 전", "몇 년 전": "몇 년 전" };

// 느낌마다 가장 자연스러운 한 문장 (꾸밈말 하나로 찍어 내면 "다정한 마음이 들었어요"처럼 어색해진다)
const feelingLine: Record<string, string> = {
  기쁨: "그때 정말 기뻤어요.", 행복함: "그때 참 행복했어요.", 즐거움: "그때 정말 즐거웠어요.", 설렘: "그때 마음이 설렜어요.",
  따뜻함: "그때 마음이 따뜻해졌어요.", 편안함: "그때 마음이 편안했어요.", 평온함: "그때 마음이 평온했어요.", 감사함: "그때 고마운 마음이 들었어요.",
  뿌듯함: "그때 참 뿌듯했어요.", 벅참: "그때 가슴이 벅찼어요.", 사랑스러움: "그때 모든 게 사랑스러웠어요.", 다정함: "그때 다정한 마음이 오갔어요.",
  든든함: "그때 마음이 든든했어요.", 안도감: "그때 비로소 안도했어요.", 후련함: "그때 마음이 후련했어요.", 자유로움: "그때 마음이 자유로웠어요.",
  만족스러움: "그때 참 만족스러웠어요.", 신기함: "그때 모든 게 신기했어요.", 그리움: "지금은 그때가 그리워요.", 아쉬움: "지금 생각하면 조금 아쉬워요.",
  외로움: "그때 조금 외로웠어요.", 불안: "그때 조금 불안했어요.", 막막함: "그때 앞이 막막했어요.",
};

// 단서 문장 — 참가자가 바로 이어서 고쳐 쓸 수 있게, 기억 하나와 그때의 마음을 두 문장으로 담는다.
// 예: "몇 년 전 친구와 함께 웃고 떠들던 기억이 나요. 그때 정말 즐거웠어요."
export function summarize(cat: Category, answers: Answers): string {
  const opt = cat.start.find((o) => o.label === answers.start);
  const trim = (t?: string) => t?.trim().replace(/[.!?。…~\s]+$/, "") || undefined;
  // 선택지에 없는 답은 참가자가 직접 적은 말이다
  const when = answers.when ? (whenPhrase[answers.when] ?? trim(answers.when)) : undefined;
  const sc = trim(answers.scene);
  // "~장면"으로 끝나는 장면은 "~기억이 나요"로 잇고, 그렇지 않게 직접 적은 말은 그대로 한 문장으로 둔다
  const own = trim(answers.free) ?? (sc && !sc.endsWith("장면") ? sc : undefined);
  const memory = sc?.endsWith("장면") ? [opt?.lead, `${sc.slice(0, -2).trim()} 기억이 나요.`] : [`${josa(cat.title)} 떠올라요.`];
  const who = answers.who === "혼자" ? "혼자 보낸 기억이에요." : answers.who ? `${wa(answers.who)} 함께한 기억이에요.` : null;
  const first = own
    ? who
      ? `${when ? `${when} ` : ""}${who} ${own}.`
      : `${when ? `${when}, ` : ""}${own}.`
    : [when, ...memory].filter(Boolean).join(" ");
  const feel = trim(answers.feeling);
  if (!feel) return first;
  return `${first} ${feelingLine[feel] ?? `그때 ${eul(feel)} 느꼈어요.`}`;
}

const wa = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "과" : "와");
};

const eul = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 0 ? "를" : "을");
};

// 받침 유무로 이/가 고르기 (한글이 아니면 "이")
export function josa(word: string) {
  const c = word.charCodeAt(word.length - 1);
  const hangul = c >= 0xac00 && c <= 0xd7a3;
  return word + (hangul && (c - 0xac00) % 28 === 0 ? "가" : "이");
}
