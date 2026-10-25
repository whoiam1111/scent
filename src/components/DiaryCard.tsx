/* eslint-disable @next/next/no-img-element -- 런타임에 만든 SVG data URL */
import { EMOTION_COLORS } from "@/lib/diary";
import { svgToDataUrl } from "@/lib/illustration";

// 그림 일기 카드 6종. 각 디자인은 이 체험에 실제로 있는 물건에서 왔다:
// 책 표지, 향수 라벨, 원고지 그림일기장, 폴라로이드, 기억 입장권, 찢은 종이 조각. 키링 PNG는 이 카드를 그대로 찍는다(cardImage.ts).
export type Theme = "book" | "perfume" | "note" | "polaroid" | "ticket" | "pieces";
export const THEMES: [Theme, string][] = [
  ["book", "문학전집"],
  ["perfume", "향수 라벨"],
  ["note", "그림일기장"],
  ["polaroid", "폴라로이드"],
  ["ticket", "입장권"],
  ["pieces", "종이 조각"],
];

export type DiaryFont = "bookk" | "saeeum" | "omiri";
export type DiaryAlign = "auto" | "left" | "center" | "right";
export const FONTS: [DiaryFont, string][] = [
  ["bookk", "부크크명조"],
  ["saeeum", "강원교육새음"],
  ["omiri", "오미리손글씨"],
];
const FONT_CLASS: Record<DiaryFont, string> = { bookk: "font-[family-name:var(--font-bookk)]", saeeum: "font-[family-name:var(--font-saeeum)]", omiri: "font-[family-name:var(--font-omiri)]" };
const SMALLER: Record<string, string> = { "text-[2.4rem]": "text-[2rem]", "text-[1.6rem]": "text-xl" };

export const ALIGNS: [DiaryAlign, string][] = [
  ["auto", "기본"],
  ["left", "왼쪽"],
  ["center", "가운데"],
  ["right", "오른쪽"],
];

// 배경색: 기본이면 디자인·감정 색을 쓰고, 고르면 카드의 바탕 면을 그 색으로 바꾼다. light = 밝은 바탕(어두운 글자)
export type DiaryBg = "auto" | "paper" | "greige" | "apricot" | "rose" | "sage" | "sky" | "forest" | "black";
export const BGS: [DiaryBg, string, string, boolean][] = [
  ["auto", "기본", "", true],
  ["paper", "종이", "#fbf7ef", true],
  ["greige", "회베이지", "#e3dbcf", true],
  ["apricot", "살구", "#f1c4a6", true],
  ["rose", "장미", "#e8c3c0", true],
  ["sage", "세이지", "#b4c1a5", true],
  ["sky", "하늘", "#c5d8de", true],
  ["forest", "숲", "#3c4c3d", false],
  ["black", "먹", "#141210", false],
];
// 글자색·포인트색: "" = 디자인 기본. 포인트색은 표지 띠·입장권 바탕(배경색이 기본일 때), 향 이름 줄, 테이프에 쓰인다
export const INKS: [string, string][] = [
  ["", "기본"],
  ["#141210", "먹"],
  ["#4a3828", "고동"],
  ["#2f3a56", "남색"],
  ["#7a2e3a", "와인"],
  ["#8b7651", "금색"],
  ["#f6f2ea", "흰색"],
];
export const ACCENTS: [string, string][] = [
  ["", "기본"],
  ["#c9694a", "테라코타"],
  ["#d99a3e", "호박"],
  ["#7d8a5a", "올리브"],
  ["#4f7f80", "청록"],
  ["#34466b", "남색"],
  ["#8a3b4a", "와인"],
  ["#2a2622", "먹"],
];
const DARK_TEXT = "#141210";
const LIGHT_TEXT = "#f6f2ea";

type Props = { theme: Theme; title: string; text: string; illustration: string; createdAt: string | null; emotions: string[]; font?: DiaryFont; align?: DiaryAlign; bg?: DiaryBg; ink?: string; accent?: string };

// 받침에 따라 과/와: "편안함과 그리움"
const batchim = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
export const and = (xs: string[]) => xs.map((x, i) => (i < xs.length - 1 ? x + (batchim(x) ? "과" : "와") : x)).join(" ");

export default function DiaryCard({ theme, title, text, illustration, createdAt, emotions, font = "bookk", align = "auto", bg = "auto", ink = "", accent = "" }: Props) {
  // 바탕 면의 색과 그 위 글자색. def = 디자인 기본 바탕, defText = 기본 글자색
  const [, , fill, light] = BGS.find(([id]) => id === bg) ?? BGS[0];
  const surface = (def: string, defText: string) => {
    const base = fill ? { background: fill, color: light ? (defText === LIGHT_TEXT ? DARK_TEXT : defText) : LIGHT_TEXT } : { background: def, color: defText };
    return ink ? { ...base, color: ink } : base;
  };
  // 제목·일기·감정 줄에만 적용. 디자인마다 정한 기본 글꼴(def) 대신 고른 글씨체를 쓴다
  // 나눔펜 기준으로 키워 둔 손글씨 디자인(그림일기장)은 다른 글씨체에서 한 단계 줄인다
  const f = (def: string, size: string) => `${FONT_CLASS[font]} ${def === "font-pen" ? (SMALLER[size] ?? size) : size}`;
  const a = align === "auto" ? "" : { left: "text-left", center: "text-center", right: "text-right" }[align];
  const img = illustration.startsWith("data:") ? illustration : svgToDataUrl(illustration); // 생성형 그림은 이미 data URL
  const date = createdAt ? new Date(createdAt) : null;
  const emo = EMOTION_COLORS[emotions[0]] ?? EMOTION_COLORS["기타"];
  const pal = accent ? { ...emo, accent } : emo;
  const alt = "기억과 감정으로 그린 그림";

  if (theme === "perfume")
    // 향수병 라벨: 아치 창 속 그림, 제목이 향의 이름, 감정이 노트
    return (
      <article className="mx-auto max-w-md p-3" style={surface("#f4efe6", DARK_TEXT)}>
        <div className="border-[3px] border-double border-current px-7 pt-8 pb-7 text-center">
          <img src={img} alt={alt} className="mx-auto aspect-[4/5] w-3/4 rounded-t-full object-cover" />
          <h1 className={`mt-7 ${f("font-serif", "text-[2.2rem]")} ${a} leading-tight font-bold`}>{title}</h1>
          <p className={`mt-2 text-lg ${a}`} style={{ color: pal.accent }}>
            {and(emotions)}의 향
          </p>
          <p className={`mx-auto mt-6 max-w-xs ${f("font-serif", "text-lg")} ${a} leading-loose whitespace-pre-line`}>{text}</p>
          <p className="mt-7 font-serif text-base">마음의 조각</p>
        </div>
      </article>
    );

  if (theme === "note") {
    // 어릴 적 그림일기장: 날짜 줄, 그림 칸, 원고지 칸에 한 글자씩
    const cols = 10;
    const cells = text.split("\n").flatMap((line) => {
      const chars = [...line];
      return [...chars, ...Array((cols - (chars.length % cols)) % cols).fill("")];
    });
    while (cells.length < cols * 4) cells.push("");
    return (
      <article className={`mx-auto max-w-md ${f("font-pen", "")} outline-[3px] outline-current`} style={surface("#fffdf6", "#3d3a5c")}>
        <p className="flex flex-wrap gap-x-5 px-4 py-2 text-2xl">
          {date && (
            <>
              <span>{date.getFullYear()}년</span>
              <span>{date.getMonth() + 1}월</span>
              <span>{date.getDate()}일</span>
              <span>{date.toLocaleDateString("ko-KR", { weekday: "long" })}</span>
            </>
          )}
        </p>
        <img src={img} alt={alt} className="aspect-[4/3] w-full border-y-[3px] border-current object-cover" />
        <p className={`px-4 py-2 text-2xl ${a}`}>제목: {title}</p>
        <div className="grid grid-cols-10 border-t-2 border-[#c95b5b]/60">
          {cells.map((c, i) => (
            <span key={i} className="flex aspect-square items-center justify-center border-r border-b border-[#c95b5b]/50 text-[1.7rem] leading-none">
              {c}
            </span>
          ))}
        </div>
        <p className="px-4 py-2 text-xl">오늘의 마음: {emotions.join(", ")}</p>
      </article>
    );
  }

  if (theme === "polaroid")
    return (
      <article className="mx-auto max-w-sm -rotate-1 p-4 pb-5 shadow-[0_1px_2px_rgba(0,0,0,.12),0_18px_30px_-20px_rgba(40,30,20,.55)]" style={surface("#ffffff", "#2f3a56")}>
        <img src={img} alt={alt} className="aspect-square w-full object-cover" />
        <h1 className={`mt-4 ${f("font-pen", "text-[2.4rem]")} ${a} leading-none`}>{title}</h1>
        <p className={`mt-2 ${f("font-pen", "text-[1.6rem]")} ${a} leading-snug whitespace-pre-line opacity-85`}>{text}</p>
        <p className="mt-3 text-right font-pen text-xl opacity-60">
          {date?.toLocaleDateString("ko-KR")} {emotions.join(", ")}
        </p>
      </article>
    );

  if (theme === "ticket")
    // 기억 입장권: 그림 쪽과 떼어 내는 쪽, 사이에 절취선과 반원 홈
    return (
      <article className="relative mx-auto max-w-md overflow-hidden rounded-xl" style={surface(pal.accent, LIGHT_TEXT)}>
        <img src={img} alt={alt} className="aspect-[4/3] w-full object-cover" />
        <div className="relative px-7 pt-6 pb-4">
          <p className="text-lg opacity-90">기억 입장권</p>
          <h1 className={`mt-1 ${f("font-serif", "text-[2.2rem]")} ${a} leading-tight font-bold`}>{title}</h1>
          <p className={`mt-4 ${f("font-serif", "text-lg")} ${a} leading-relaxed whitespace-pre-line`}>{text}</p>
        </div>
        <div className="relative my-2 border-t-[3px] border-dotted border-current/60">
          <span className="absolute -top-4 -left-4 size-8 rounded-full bg-ivory" />
          <span className="absolute -top-4 -right-4 size-8 rounded-full bg-ivory" />
        </div>
        <p className="flex items-baseline justify-between px-7 pt-3 pb-6 text-lg">
          <span>{emotions.join(", ")}</span>
          <span className="font-serif">{date?.toLocaleDateString("ko-KR")}</span>
        </p>
      </article>
    );

  if (theme === "pieces")
    // 찢은 종이 조각: 감정 색 바탕에 비뚤게 붙인 그림과 메모, 마스킹테이프
    return (
      <article className="relative mx-auto max-w-md overflow-hidden px-8 pt-10 pb-10" style={surface(pal.sky[1], DARK_TEXT)}>
        <div className="relative rotate-[-2.5deg]">
          <img src={img} alt={alt} className="aspect-[4/3] w-full object-cover [clip-path:polygon(1%_3%,22%_0,47%_2%,71%_0,99%_2%,100%_31%,98%_58%,100%_97%,76%_100%,51%_98%,27%_100%,0_98%,2%_64%,0_33%)]" />
          <span className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rotate-[4deg] bg-white/55" />
        </div>
        <div className="relative mt-6 ml-6 rotate-[1.5deg] bg-[#fffdf8] px-6 py-5 text-[#141210]">
          <span className="absolute -top-3 right-8 h-6 w-20 rotate-[-6deg]" style={{ background: `${pal.accent}99` }} />
          <h1 className={`${f("font-serif", "text-[2rem]")} ${a} leading-tight font-bold`}>{title}</h1>
          <p className={`mt-3 ${f("font-serif", "text-lg")} ${a} leading-relaxed whitespace-pre-line`}>{text}</p>
          <p className="mt-4 text-base text-mute">
            {and(emotions)} · {date?.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
          </p>
        </div>
        <p className="mt-6 text-right font-serif text-lg">마음의 조각</p>
      </article>
    );

  // 문학전집 표지: 위는 그림, 아래 흰 면에 전집 번호 → 감정 색 띠 사이 명조 제목 → 감정 띠 → 지은이. 띠는 오른쪽 끝까지 이어진다
  const no = [...title].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 900, 7) + 100; // 제목마다 같은 번호
  return (
    <article className="mx-auto flex aspect-[2/3] max-w-md flex-col overflow-hidden" style={surface("#ffffff", DARK_TEXT)}>
      <img src={img} alt={alt} className="aspect-[16/10] w-full object-cover" />
      <div className="flex flex-1 flex-col pt-5 pb-6 pl-8">
        <p className="flex items-baseline gap-2 pr-8 text-sm font-bold tracking-tight">
          마음의 조각 문학전집 <span className="font-en text-xl font-normal italic">{no}</span>
        </p>
        <span className="mt-3 h-1.5" style={{ background: pal.accent }} />
        <h1 className={`py-3 pr-8 ${f("font-serif", "text-[2.2rem]")} ${a} leading-[1.2] font-normal`}>{title}</h1>
        <p className={`px-3 py-1 font-label text-sm tracking-[0.08em] text-white ${a}`} style={{ background: pal.accent }}>
          {and(emotions)} · {date?.toLocaleDateString("ko-KR")}
        </p>
        <p className="mt-3 pr-8 text-base font-bold">
          오늘의 나 <span className="ml-1 text-xs font-normal opacity-70">지음</span>
        </p>
        <p className={`mt-4 pr-8 ${f("font-serif", "text-base")} ${a} leading-relaxed whitespace-pre-line opacity-90`}>{text}</p>
        <p className="mt-auto pt-4 text-base font-bold tracking-tight">마음의 조각</p>
      </div>
    </article>
  );
}
