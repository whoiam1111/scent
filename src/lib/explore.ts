// 기억 탐색 도우미 질문 데이터와 분기 규칙.
// 흐름: 카테고리 → 시작 질문 → 무엇/누구(start) → 장면(scene) → 언제(when) → 느낌(feeling) → 단서 확인
// start 선택지에 scenes가 없으면 장면 단계를 건너뛰고, free가 true면 직접 적기 단계로 간다.

export type Option = { label: string; scenes?: string[]; free?: boolean };

export type Category = {
  id: string;
  title: string;
  desc: string;
  questions: string[];
  startQuestion: string;
  start: Option[];
  feelings: string[];
};

const unsure = "잘 모르겠어요";

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
      { label: "친구와 함께했던 시간", scenes: ["함께 웃고 떠들던 장면", "조용히 이야기를 나누던 장면", "어디론가 함께 걸어가던 장면", "서로를 도와주던 장면"] },
      { label: "가족과 함께했던 시간", scenes: ["함께 밥을 먹던 장면", "집에서 쉬던 장면", "함께 어딘가 다녀온 장면", "서로를 챙겨 주던 장면"] },
      { label: "연인과 함께했던 시간", scenes: ["나란히 걷던 장면", "오래 이야기를 나누던 장면", "함께 무언가를 보던 장면", "말없이 곁에 있던 장면"] },
      { label: "처음 만난 사람과의 순간", scenes: ["뜻밖의 친절을 받은 장면", "짧게 대화를 나눈 장면", "함께 무언가를 해낸 장면"] },
      { label: "특정한 사람이 떠오르지는 않아요" },
      { label: "직접 적어 볼게요", free: true },
    ],
    feelings: ["따뜻함", "편안함", "즐거움", "그리움", "아쉬움", unsure],
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
      { label: "내 방이나 집", scenes: ["창밖을 바라보던 장면", "좋아하는 것을 하던 장면", "푹 쉬던 장면"] },
      { label: "카페나 동네의 어느 곳", scenes: ["무언가를 쓰거나 읽던 장면", "사람들을 바라보던 장면", "천천히 걷던 장면"] },
      { label: "여행지나 낯선 곳", scenes: ["처음 보는 풍경 앞에 선 장면", "혼자 길을 찾던 장면", "바다나 산을 바라보던 장면"] },
      { label: "장소는 잘 떠오르지 않아요" },
      { label: "직접 적어 볼게요", free: true },
    ],
    feelings: ["편안함", "자유로움", "뿌듯함", "평온함", "외로움", unsure],
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
      { label: "처음 가 본 장소", scenes: ["도착해서 처음 둘러보던 장면", "길을 잃었다가 찾은 장면", "풍경에 놀랐던 장면"] },
      { label: "처음 해 본 일", scenes: ["긴장하며 시작하던 장면", "생각보다 잘 해낸 장면", "서툴러서 웃음이 났던 장면"] },
      { label: "새로 알게 된 취향", scenes: ["좋아하는 것을 처음 발견한 장면", "누군가에게 추천받은 장면", "우연히 마주친 장면"] },
      { label: "무엇인지는 잘 모르겠어요" },
      { label: "직접 적어 볼게요", free: true },
    ],
    feelings: ["설렘", "즐거움", "벅참", "뿌듯함", "불안", unsure],
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
      { label: "그날의 하늘과 날씨", scenes: ["맑은 하늘 아래 걷던 장면", "노을이 지던 장면", "비가 내리던 장면", "눈이 오던 장면"] },
      { label: "노래나 냄새", scenes: ["노래를 들으며 걷던 장면", "익숙한 냄새가 스친 장면", "음악이 흐르던 방 안의 장면"] },
      { label: "음식이나 풍경", scenes: ["맛있는 음식을 먹던 장면", "창가에서 풍경을 보던 장면", "꽃이 피어 있던 장면"] },
      { label: "집으로 가는 길", scenes: ["밤길을 걷던 장면", "버스나 지하철 창밖을 보던 장면", "골목을 지나던 장면"] },
      { label: "직접 적어 볼게요", free: true },
    ],
    feelings: ["평온함", "기쁨", "그리움", "편안함", "자유로움", unsure],
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
      { label: "무언가를 끝낸 순간", scenes: ["마지막 일을 마치고 숨을 고르던 장면", "결과를 확인하던 장면", "끝난 뒤 밖으로 나서던 장면"] },
      { label: "어려운 시간을 지나온 순간", scenes: ["안도의 한숨을 쉬던 장면", "누군가에게 털어놓던 장면", "다시 일상으로 돌아온 장면"] },
      { label: "새로운 선택을 한 순간", scenes: ["결심을 하던 장면", "첫걸음을 내딛던 장면", "누군가에게 이야기하던 장면"] },
      { label: "구체적인 순간은 잘 모르겠어요" },
      { label: "직접 적어 볼게요", free: true },
    ],
    feelings: ["후련함", "뿌듯함", "벅참", "감사함", "막막함", unsure],
  },
];

export const whenOptions = ["최근 며칠 또는 몇 주 사이", "몇 달 전", "몇 년 전", "정확히 기억나지 않아요"];
export const UNSURE = unsure;

export type StepId = "start" | "scene" | "free" | "when" | "feeling";

export type Answers = Partial<Record<StepId, string>>;

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

const whenPhrase: Record<string, string> = { "최근 며칠 또는 몇 주 사이": "최근", "몇 달 전": "몇 달 전", "몇 년 전": "몇 년 전" };

// 단서 문장 — 확정하지 않고 "~것 같아요/가까울까요" 같은 표현만 쓴다. 참가자가 이후 직접 고친다.
export function summarize(cat: Category, answers: Answers): string {
  const startOpt = cat.start.find((o) => o.label === answers.start);
  const parts: string[] = [];
  const when = answers.when ? whenPhrase[answers.when] : undefined;
  const free = answers.free?.trim().replace(/[.!?。…~\s]+$/, "");
  if (free) parts.push(`“${free}” 같은 장면`);
  else if (startOpt?.scenes) parts.push(`${when ? `${when}, ` : ""}${startOpt.label}`);
  else if (when) parts.push(`${when}의 어느 날`);
  if (answers.scene && answers.scene !== unsure) parts.push(answers.scene);
  const feeling = answers.feeling && answers.feeling !== unsure ? answers.feeling : null;
  const scene = parts.length ? `${josa(parts.join(", "))} 떠오르는 것 같아요.` : `${cat.title}과 닿아 있는 장면이 어렴풋이 떠오르는 것 같아요.`;
  return feeling ? `${scene} 떠올리면 ${feeling}이 먼저 느껴지는 장면일까요?` : scene;
}

// 받침 유무로 이/가 고르기 (한글이 아니면 "이")
export function josa(word: string) {
  const c = word.charCodeAt(word.length - 1);
  const hangul = c >= 0xac00 && c <= 0xd7a3;
  return word + (hangul && (c - 0xac00) % 28 === 0 ? "가" : "이");
}

// 탐색에서 고른 느낌 → 감정 선택 화면의 미리 표시 (참가자가 바꿀 수 있다)
export const feelingToEmotion: Record<string, string> = {
  따뜻함: "감사함",
  편안함: "편안함",
  즐거움: "기쁨",
  그리움: "그리움",
  아쉬움: "아쉬움",
  자유로움: "자유로움",
  뿌듯함: "뿌듯함",
  평온함: "평온함",
  외로움: "외로움",
  설렘: "설렘",
  벅참: "벅참",
  불안: "불안",
  기쁨: "기쁨",
  후련함: "후련함",
  감사함: "감사함",
  막막함: "막막함",
};
