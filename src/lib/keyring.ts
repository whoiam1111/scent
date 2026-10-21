import { EMOTION_COLORS } from "./diary";
import { svgToDataUrl } from "./illustration";

// 키링 인쇄용 1:1 PNG를 캔버스로 직접 그린다 (화면 캡처가 아님). 그림 일기 카드와 같은 6가지 디자인.
// 1500px 정사각형: 바깥 60px는 재단 여유, 글자는 150px 안쪽(안전 영역)에만 둔다.
// 투명 배경이면 디자인의 바깥 모양(사각·아치·입장권 홈·찢은 종이)이 그대로 재단선이 된다.
export const KEYRING_SIZE = 1500;

export type Theme = "book" | "perfume" | "note" | "polaroid" | "ticket" | "pieces";

type Input = { theme: Theme; svg: string; title: string; line: string; emotions: string[]; date: Date; transparent: boolean; font?: "auto" | "serif" | "sans" | "pen"; align?: "auto" | "left" | "center" | "right"; bg?: { fill: string; light: boolean } | null };

const S = KEYRING_SIZE;
const IVORY = "#fbf6ec";
const INK = "#4a3828";
const NAVY = "#2f3a56";

// 한 줄에 들어가도록 줄이고, 그래도 넘치면 말줄임
function fit(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight: string, family: string, min = 40) {
  let s = size;
  for (; s > min; s -= 4) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= max) return text;
  }
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return t === text ? t : `${t}…`;
}

function write(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: { size: number; max: number; family: string; color: string; weight?: string; align?: CanvasTextAlign; min?: number }) {
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? "left";
  ctx.fillText(fit(ctx, text, o.max, o.size, o.weight ?? "400", o.family, o.min), x, y);
}

// 원본 SVG(1000×1000)에서 상자 비율에 맞게 잘라 그린다. 사람·상징물이 수평선 아래에 있어서 세로는 아래쪽(70%)을 남긴다
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = w / h;
  const sw = r >= 1 ? 1000 : 1000 * r;
  const sh = r >= 1 ? 1000 / r : 1000;
  ctx.drawImage(img, (1000 - sw) / 2, (1000 - sh) * 0.7, sw, sh, x, y, w, h);
}

function clipped(ctx: CanvasRenderingContext2D, path: () => void, draw: () => void) {
  ctx.save();
  ctx.beginPath();
  path();
  ctx.clip();
  draw();
  ctx.restore();
}

const poly = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));

// 찢은 종이 가장자리: 0~1 비율 좌표
const TORN: [number, number][] = [
  [0.01, 0.03], [0.22, 0], [0.47, 0.02], [0.71, 0], [0.99, 0.02], [1, 0.31], [0.98, 0.58], [1, 0.97],
  [0.76, 1], [0.51, 0.98], [0.27, 1], [0, 0.98], [0.02, 0.64], [0, 0.33],
];
const torn = (x: number, y: number, w: number, h: number) => TORN.map(([a, b]) => [x + a * w, y + b * h] as [number, number]);

export async function renderKeyring({ theme, svg, title, line, emotions, date, transparent, font = "auto", align = "auto", bg = null }: Input): Promise<Blob> {
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue("--font-gowun").trim() || "serif";
  const pen = css.getPropertyValue("--font-pen-src").trim() || "cursive";
  const sans = css.getPropertyValue("--font-noto").trim() || "sans-serif";
  // 화면에 아직 안 쓰인 글꼴은 직접 불러 와야 캔버스에 나온다
  await Promise.all([document.fonts.load(`700 100px ${serif}`, title + line), document.fonts.load(`400 100px ${pen}`, title + line), document.fonts.load(`700 100px ${sans}`, title + line)]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.textBaseline = "alphabetic";
  if (!transparent) {
    ctx.fillStyle = IVORY;
    ctx.fillRect(0, 0, S, S);
  }

  const img = new Image();
  img.src = svgToDataUrl(svg);
  await img.decode();

  // 참가자가 고른 글꼴·정렬은 제목과 감정 줄에만 쓴다. box = 글자가 놓일 [왼쪽 끝, 오른쪽 끝]
  const fam = (def: string) => ({ auto: def, serif, sans, pen })[font];
  const main = (text: string, box: [number, number], y: number, o: Omit<Parameters<typeof write>[4], "max">) => {
    const al = align === "auto" ? (o.align ?? "left") : align;
    const x = al === "center" ? (box[0] + box[1]) / 2 : al === "right" ? box[1] : box[0];
    const boost = font === "pen" && o.family !== pen ? 1.3 : 1; // 손글씨는 글자 몸이 작다
    write(ctx, text, x, y, { ...o, size: o.size * boost, family: fam(o.family), align: al, max: box[1] - box[0] });
  };

  const pal = EMOTION_COLORS[emotions[0]] ?? EMOTION_COLORS["기타"];
  const feel = emotions.join(", ");
  const day = date.toLocaleDateString("ko-KR");
  // 참가자가 배경색을 고르면 바탕 면만 그 색으로, 글자는 밝기에 맞춰 바꾼다 (DiaryCard의 surface와 같은 규칙)
  const tone = (defText: string) => (!bg ? defText : !bg.light ? IVORY : defText === IVORY ? "#141210" : defText);
  const body = (r: number, def: string) => {
    const fill = bg?.fill ?? def;
    ctx.beginPath();
    ctx.roundRect(60, 60, S - 120, S - 120, r);
    ctx.fillStyle = fill;
    ctx.fill();
  };

  if (theme === "book") {
    body(36, pal.accent);
    ctx.fillStyle = IVORY;
    ctx.fillRect(186, 176, 1128, 846);
    cover(ctx, img, 210, 200, 1080, 798);
    const t = tone(IVORY);
    main(title, [210, 1290], 1190, { size: 140, family: serif, weight: "700", color: t });
    main(feel, [210, 1290], 1282, { size: 68, family: serif, color: t, min: 48 });
    write(ctx, "마음의 조각", 210, 1368, { size: 54, max: 600, family: serif, color: t });
  } else if (theme === "perfume") {
    body(90, "#f4efe6");
    const t = tone(INK);
    ctx.strokeStyle = t;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(110, 110, S - 220, S - 220, 54);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(132, 132, S - 264, S - 264, 40);
    ctx.stroke();
    const w = 700, h = 760, x = (S - w) / 2, y = 190;
    clipped(ctx, () => {
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + w / 2);
      ctx.arc(S / 2, y + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    }, () => cover(ctx, img, x, y, w, h));
    main(title, [220, 1280], 1100, { size: 136, family: serif, weight: "700", color: t, align: "center" });
    main(`${feel}의 향`, [220, 1280], 1200, { size: 68, family: serif, color: pal.accent, align: "center", min: 48 });
    write(ctx, "마음의 조각", S / 2, 1310, { size: 54, max: 600, family: serif, color: t, align: "center" });
  } else if (theme === "note") {
    const ink = tone("#3d3a5c"), red = "rgba(201,91,91,.55)";
    body(12, "#fffdf6");
    ctx.strokeStyle = ink;
    ctx.lineWidth = 10;
    ctx.strokeRect(65, 65, S - 130, S - 130);
    write(ctx, `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.toLocaleDateString("ko-KR", { weekday: "long" })}`, 160, 170, { size: 76, max: 1180, family: pen, color: ink });
    cover(ctx, img, 70, 215, S - 140, 690);
    ctx.fillStyle = ink;
    ctx.fillRect(70, 205, S - 140, 10);
    ctx.fillRect(70, 905, S - 140, 10);
    main(`제목: ${title}`, [160, 1340], 1020, { size: 92, family: pen, color: ink });
    // 원고지 한 줄: 첫 문장 앞 9글자
    const cols = 9, cw = 1200 / cols, top = 1075;
    const chars = [...line].slice(0, cols);
    ctx.strokeStyle = red;
    ctx.lineWidth = 4;
    for (let i = 0; i < cols; i++) {
      ctx.strokeRect(150 + i * cw, top, cw, cw);
      if (chars[i]) write(ctx, chars[i], 150 + i * cw + cw / 2, top + cw * 0.72, { size: 96, max: cw, family: pen, color: ink, align: "center" });
    }
    main(`오늘의 마음: ${feel}`, [160, 1340], 1345, { size: 82, family: pen, color: ink, min: 56 });
  } else if (theme === "polaroid") {
    body(10, "#ffffff");
    cover(ctx, img, 160, 160, S - 320, 980);
    const t = tone(NAVY);
    main(title, [170, 1330], 1270, { size: 140, family: pen, color: t });
    ctx.globalAlpha = 0.65;
    write(ctx, `${day} ${feel}`, S - 170, 1370, { size: 76, max: 1000, family: pen, color: t, align: "right", min: 56 });
    ctx.globalAlpha = 1;
  } else if (theme === "ticket") {
    body(48, pal.accent);
    // 절취선 양 끝의 반원 홈은 아예 지운다 (투명이면 재단선이 된다)
    const cut = 1140;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (const cx of [60, S - 60]) {
      ctx.beginPath();
      ctx.arc(cx, cut, 72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!transparent) {
      ctx.fillStyle = IVORY;
      for (const cx of [60, S - 60]) {
        ctx.beginPath();
        ctx.arc(cx, cut, 72, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    clipped(ctx, () => ctx.roundRect(150, 150, S - 300, 660, 28), () => cover(ctx, img, 150, 150, S - 300, 660));
    const t = tone(IVORY);
    write(ctx, "기억 입장권", 160, 905, { size: 64, max: 1180, family: serif, color: t });
    main(title, [160, 1340], 1045, { size: 132, family: serif, weight: "700", color: t });
    ctx.strokeStyle = t;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 8;
    ctx.setLineDash([4, 22]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(170, cut);
    ctx.lineTo(S - 170, cut);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    write(ctx, feel, 160, 1320, { size: 70, max: 700, family: serif, color: t, min: 50 });
    write(ctx, day, S - 160, 1320, { size: 66, max: 460, family: serif, color: t, align: "right", min: 50 });
  } else {
    // pieces: 찢은 종이 모양 바탕 위에 비뚤게 붙인 그림과 메모
    ctx.beginPath();
    poly(ctx, torn(60, 60, S - 120, S - 120));
    ctx.closePath();
    ctx.fillStyle = bg?.fill ?? pal.sky[1];
    ctx.fill();
    ctx.save();
    ctx.translate(S / 2, 560);
    ctx.rotate((-2.5 * Math.PI) / 180);
    clipped(ctx, () => {
      poly(ctx, torn(-560, -400, 1120, 800));
      ctx.closePath();
    }, () => cover(ctx, img, -560, -400, 1120, 800));
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.fillRect(-130, -440, 260, 76);
    ctx.restore();
    ctx.save();
    ctx.translate(S / 2 + 40, 1170);
    ctx.rotate((1.5 * Math.PI) / 180);
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(-520, -175, 1040, 330);
    ctx.fillStyle = `${pal.accent}99`;
    ctx.fillRect(300, -200, 200, 60);
    main(title, [-460, 460], -30, { size: 124, family: serif, weight: "700", color: INK });
    main(feel, [-460, 460], 90, { size: 68, family: serif, color: "#8c7a68", min: 48 });
    ctx.restore();
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}
