/* eslint-disable @next/next/no-img-element -- 런타임에 만든 SVG data URL */
import { EMOTION_COLORS } from "@/lib/diary";
import { svgToDataUrl } from "@/lib/illustration";
import type { Theme } from "@/lib/keyring";

// 그림 일기 카드 6종. 각 디자인은 이 체험에 실제로 있는 물건에서 왔다:
// 책 표지, 향수 라벨, 원고지 그림일기장, 폴라로이드, 기억 입장권, 찢은 종이 조각. 키링(keyring.ts)도 같은 6종.
export const THEMES: [Theme, string][] = [
  ["book", "문학전집"],
  ["perfume", "향수 라벨"],
  ["note", "그림일기장"],
  ["polaroid", "폴라로이드"],
  ["ticket", "입장권"],
  ["pieces", "종이 조각"],
];

type Props = { theme: Theme; title: string; text: string; illustration: string; createdAt: string | null; emotions: string[] };

// 받침에 따라 과/와: "편안함과 그리움"
const batchim = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
export const and = (xs: string[]) => xs.map((x, i) => (i < xs.length - 1 ? x + (batchim(x) ? "과" : "와") : x)).join(" ");

export default function DiaryCard({ theme, title, text, illustration, createdAt, emotions }: Props) {
  const img = svgToDataUrl(illustration);
  const date = createdAt ? new Date(createdAt) : null;
  const pal = EMOTION_COLORS[emotions[0]] ?? EMOTION_COLORS["기타"];
  const alt = "기억과 감정으로 그린 그림";

  if (theme === "perfume")
    // 향수병 라벨: 아치 창 속 그림, 제목이 향의 이름, 감정이 노트
    return (
      <article className="mx-auto max-w-md bg-[#f4efe6] p-3">
        <div className="border-[3px] border-double border-brown px-7 pt-8 pb-7 text-center">
          <img src={img} alt={alt} className="mx-auto aspect-[4/5] w-3/4 rounded-t-full object-cover" />
          <h1 className="mt-7 font-serif text-[2.2rem] leading-tight font-bold">{title}</h1>
          <p className="mt-2 text-lg" style={{ color: pal.accent }}>
            {and(emotions)}의 향
          </p>
          <p className="mx-auto mt-6 max-w-xs font-serif text-lg leading-loose whitespace-pre-line">{text}</p>
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
      <article className="mx-auto max-w-md bg-[#fffdf6] font-pen text-[#3d3a5c] outline-[3px] outline-[#3d3a5c]">
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
        <img src={img} alt={alt} className="aspect-[4/3] w-full border-y-[3px] border-[#3d3a5c] object-cover" />
        <p className="px-4 py-2 text-2xl">제목: {title}</p>
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
      <article className="mx-auto max-w-sm -rotate-1 bg-white p-4 pb-5 shadow-[0_1px_2px_rgba(0,0,0,.12),0_18px_30px_-20px_rgba(40,30,20,.55)]">
        <img src={img} alt={alt} className="aspect-square w-full object-cover" />
        <h1 className="mt-4 font-pen text-[2.4rem] leading-none text-[#2f3a56]">{title}</h1>
        <p className="mt-2 font-pen text-[1.6rem] leading-snug whitespace-pre-line text-[#2f3a56]/85">{text}</p>
        <p className="mt-3 text-right font-pen text-xl text-[#2f3a56]/60">
          {date?.toLocaleDateString("ko-KR")} {emotions.join(", ")}
        </p>
      </article>
    );

  if (theme === "ticket")
    // 기억 입장권: 그림 쪽과 떼어 내는 쪽, 사이에 절취선과 반원 홈
    return (
      <article className="relative mx-auto max-w-md overflow-hidden rounded-xl text-ivory" style={{ background: pal.accent }}>
        <img src={img} alt={alt} className="aspect-[4/3] w-full object-cover" />
        <div className="relative px-7 pt-6 pb-4">
          <p className="text-lg opacity-90">기억 입장권</p>
          <h1 className="mt-1 font-serif text-[2.2rem] leading-tight font-bold">{title}</h1>
          <p className="mt-4 font-serif text-lg leading-relaxed whitespace-pre-line">{text}</p>
        </div>
        <div className="relative my-2 border-t-[3px] border-dotted border-ivory/70">
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
      <article className="relative mx-auto max-w-md overflow-hidden px-8 pt-10 pb-10" style={{ background: pal.sky[1] }}>
        <div className="relative rotate-[-2.5deg]">
          <img src={img} alt={alt} className="aspect-[4/3] w-full object-cover [clip-path:polygon(1%_3%,22%_0,47%_2%,71%_0,99%_2%,100%_31%,98%_58%,100%_97%,76%_100%,51%_98%,27%_100%,0_98%,2%_64%,0_33%)]" />
          <span className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rotate-[4deg] bg-white/55" />
        </div>
        <div className="relative mt-6 ml-6 rotate-[1.5deg] bg-[#fffdf8] px-6 py-5">
          <span className="absolute -top-3 right-8 h-6 w-20 rotate-[-6deg]" style={{ background: `${pal.accent}99` }} />
          <h1 className="font-serif text-[2rem] leading-tight font-bold">{title}</h1>
          <p className="mt-3 font-serif text-lg leading-relaxed whitespace-pre-line">{text}</p>
          <p className="mt-4 text-base text-mute">
            {and(emotions)} · {date?.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
          </p>
        </div>
        <p className="mt-6 text-right font-serif text-lg text-brown">마음의 조각</p>
      </article>
    );

  // 문학전집 표지: 감정 색 한 면, 흰 테를 두른 그림 판, 명조 제목, 감정은 저자 자리
  return (
    <article className="mx-auto flex aspect-[2/3] max-w-md flex-col px-9 pt-10 pb-8 text-ivory" style={{ background: pal.accent }}>
      <img src={img} alt={alt} className="aspect-[4/3] w-full border-[10px] border-ivory object-cover" />
      <h1 className="mt-9 font-serif text-[2.5rem] leading-[1.15] font-bold">{title}</h1>
      <p className="mt-3 text-lg opacity-90">{and(emotions)}</p>
      <p className="mt-6 font-serif text-lg leading-relaxed whitespace-pre-line opacity-95">{text}</p>
      <p className="mt-auto pt-6 font-serif text-lg">마음의 조각</p>
    </article>
  );
}
