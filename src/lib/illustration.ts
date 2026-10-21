import { EMOTION_COLORS, detectScene, type SceneHints } from "./diary";

// 기억 문장과 감정으로 그리는 SVG 일러스트 (데모 이미지).
// 같은 입력이면 같은 그림, 장면 단어·하늘·사람 수·감정 색에 따라 배경·상징물·색감·구도가 달라진다.

function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const INK = "#5b4636";
const PAPER = "#fbf6ec";

function person(x: number, y: number, s: number, color: string) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-118" r="26" fill="${INK}"/><path d="M-34 0 Q-38 -78 0 -84 Q38 -78 34 0 Z" fill="${color}"/></g>`;
}

export function buildIllustration(memory: string, emotions: string[], hints: SceneHints = detectScene(memory)): string {
  const r = seeded(memory + emotions.join());
  const pal = EMOTION_COLORS[emotions[0]] ?? EMOTION_COLORS["기타"];
  const accent2 = (EMOTION_COLORS[emotions[1]] ?? pal).accent;
  const { scene, sky, people } = hints;
  const night = sky === "night";
  const skyTop = night ? "#3f3a4a" : sky === "sunset" ? "#f6c79a" : sky === "rain" || sky === "snow" ? "#dfe0dc" : pal.sky[0];
  const skyBottom = night ? "#7a6a72" : sky === "sunset" ? "#e99a76" : sky === "rain" || sky === "snow" ? "#c9cbc5" : pal.sky[1];
  const horizon = 600 + Math.round(r() * 60);
  const parts: string[] = [];

  // 해·달
  const sx = 200 + r() * 600;
  if (night) {
    parts.push(`<circle cx="${sx}" cy="190" r="56" fill="#f6ead0"/><circle cx="${sx + 24}" cy="174" r="50" fill="${skyTop}"/>`);
    for (let i = 0; i < 26; i++) parts.push(`<circle cx="${r() * 1000}" cy="${r() * (horizon - 120)}" r="${1.5 + r() * 2.5}" fill="#f6ead0" opacity="${0.5 + r() * 0.5}"/>`);
  } else if (sky === "sunset") {
    parts.push(`<circle cx="${sx}" cy="${horizon - 20}" r="120" fill="#f08a62" opacity=".85"/>`);
  } else if (sky === "day") {
    parts.push(`<circle cx="${sx}" cy="${160 + r() * 80}" r="${60 + r() * 30}" fill="${pal.accent}" opacity=".75"/>`);
  }
  // 구름
  if (!night) for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
    const cx = r() * 900 + 50, cy = 120 + r() * 260;
    parts.push(`<g fill="#fffaf2" opacity=".8"><ellipse cx="${cx}" cy="${cy}" rx="90" ry="26"/><ellipse cx="${cx + 40}" cy="${cy - 18}" rx="50" ry="24"/></g>`);
  }

  // 장면별 땅과 상징물
  const ground = night ? "#4f4a44" : "#d9c6a5";
  switch (scene) {
    case "sea": {
      parts.push(`<rect y="${horizon}" width="1000" height="${1000 - horizon}" fill="${night ? "#3c4a57" : "#9fbfc4"}"/>`);
      for (let i = 0; i < 6; i++) {
        const y = horizon + 40 + i * 50;
        parts.push(`<path d="M0 ${y} Q 125 ${y - 18} 250 ${y} T 500 ${y} T 750 ${y} T 1000 ${y}" stroke="#f4efe4" stroke-width="5" fill="none" opacity="${0.7 - i * 0.08}"/>`);
      }
      parts.push(`<path d="M0 ${horizon + 260} Q 400 ${horizon + 200} 1000 ${horizon + 250} V1000 H0Z" fill="#e8d6b4"/>`);
      break;
    }
    case "mountain":
    case "travel": {
      parts.push(`<path d="M0 ${horizon} L ${180 + r() * 100} ${horizon - 260} L ${520} ${horizon} Z" fill="${night ? "#5d5a62" : "#b6c2a4"}"/>`);
      parts.push(`<path d="M300 ${horizon} L ${620 + r() * 100} ${horizon - 330} L 1000 ${horizon - 40} V ${horizon} Z" fill="${night ? "#4c4a52" : "#9aad8b"}"/>`);
      parts.push(`<rect y="${horizon}" width="1000" height="${1000 - horizon}" fill="${night ? "#45503f" : "#c8d3b4"}"/>`);
      for (let i = 0; i < 5; i++) {
        const tx = 60 + i * 210 + r() * 40, ty = horizon + 30 + r() * 40;
        parts.push(`<path d="M${tx} ${ty} l -30 70 h60z" fill="${night ? "#38432f" : "#7f9670"}"/><rect x="${tx - 5}" y="${ty + 70}" width="10" height="20" fill="${INK}"/>`);
      }
      if (scene === "travel") parts.push(`<path d="M450 1000 Q 520 ${horizon + 150} 500 ${horizon}" stroke="#efe2c8" stroke-width="40" fill="none"/>`);
      break;
    }
    case "city": {
      for (let x = 0; x < 1000; ) {
        const w = 90 + r() * 80, h = 140 + r() * 220;
        parts.push(`<rect x="${x}" y="${horizon - h}" width="${w - 8}" height="${h}" rx="6" fill="${night ? "#5a5258" : "#cdb79b"}"/>`);
        for (let wy = horizon - h + 24; wy < horizon - 30; wy += 46)
          for (let wx = x + 16; wx < x + w - 30; wx += 34) parts.push(`<rect x="${wx}" y="${wy}" width="16" height="22" fill="${night && r() > 0.4 ? "#f5d48c" : "#f3e7d3"}" opacity=".9"/>`);
        x += w;
      }
      parts.push(`<rect y="${horizon}" width="1000" height="${1000 - horizon}" fill="${night ? "#5c5650" : "#e2d2b6"}"/><rect y="${horizon + 140}" width="1000" height="10" fill="#f6eedf"/>`);
      break;
    }
    case "home": {
      // 방 안에서 바라본 창
      parts.push(`<path d="M0 0H1000V1000H0Z M220 140 V560 H780 V140 Z" fill-rule="evenodd" fill="#efe1c9"/>`);
      parts.push(`<rect x="220" y="140" width="560" height="420" fill="none" stroke="${INK}" stroke-width="14"/><path d="M500 140 V560 M220 350 H780" stroke="${INK}" stroke-width="10"/>`);
      parts.push(`<rect y="720" width="1000" height="280" fill="#d8bf9c"/><rect x="120" y="640" width="320" height="90" rx="40" fill="${accent2}" opacity=".7"/>`);
      break;
    }
    case "food": {
      parts.push(`<rect y="${horizon}" width="1000" height="${1000 - horizon}" fill="#c9a77f"/><rect y="${horizon}" width="1000" height="16" fill="#b08d67"/>`);
      parts.push(`<ellipse cx="420" cy="${horizon + 140}" rx="190" ry="54" fill="#fffaf0"/><path d="M260 ${horizon + 120} Q420 ${horizon + 290} 580 ${horizon + 120} Z" fill="#f3ebdc"/><path d="M300 ${horizon + 110} Q420 ${horizon + 60} 540 ${horizon + 110}" fill="${pal.accent}"/>`);
      parts.push(`<rect x="680" y="${horizon + 40}" width="110" height="130" rx="18" fill="#fffaf0"/><path d="M790 ${horizon + 70} q50 10 0 70" stroke="#fffaf0" stroke-width="16" fill="none"/>`);
      for (let i = 0; i < 3; i++) parts.push(`<path d="M${705 + i * 28} ${horizon + 20} q-14 -40 0 -80" stroke="#fffaf0" stroke-width="6" fill="none" opacity=".8"/>`);
      break;
    }
    case "flower": {
      parts.push(`<rect y="${horizon}" width="1000" height="${1000 - horizon}" fill="${night ? "#4d5a45" : "#c9d6b2"}"/>`);
      for (let i = 0; i < 9; i++) {
        const fx = 60 + i * 110 + r() * 30, fy = horizon + 80 + r() * 220, c = i % 2 ? pal.accent : accent2;
        parts.push(`<path d="M${fx} ${fy} v90" stroke="#7f9670" stroke-width="6"/>`);
        for (let p = 0; p < 5; p++) parts.push(`<circle cx="${fx + Math.cos((p * 2 * Math.PI) / 5) * 18}" cy="${fy + Math.sin((p * 2 * Math.PI) / 5) * 18}" r="15" fill="${c}"/>`);
        parts.push(`<circle cx="${fx}" cy="${fy}" r="10" fill="#f6dfa0"/>`);
      }
      break;
    }
    case "music": {
      parts.push(`<rect y="${horizon}" width="1000" height="${1000 - horizon}" fill="${ground}"/>`);
      for (let i = 0; i < 6; i++) {
        const nx = 120 + r() * 760, ny = 180 + r() * (horizon - 300);
        parts.push(`<g fill="${i % 2 ? pal.accent : INK}" opacity=".85"><ellipse cx="${nx}" cy="${ny + 70}" rx="22" ry="16"/><rect x="${nx + 18}" y="${ny}" width="6" height="72"/></g>`);
      }
      break;
    }
    default: {
      parts.push(`<path d="M0 ${horizon} Q 250 ${horizon - 80} 520 ${horizon - 10} T 1000 ${horizon - 30} V1000 H0Z" fill="${night ? "#55604c" : "#c6d1ae"}"/>`);
      parts.push(`<path d="M0 ${horizon + 120} Q 400 ${horizon + 40} 1000 ${horizon + 110} V1000 H0Z" fill="${night ? "#48523f" : "#b3c299"}"/>`);
    }
  }

  // 날씨
  if (sky === "rain") for (let i = 0; i < 60; i++) { const x = r() * 1000, y = r() * 900; parts.push(`<path d="M${x} ${y} l -10 34" stroke="#8ea3ad" stroke-width="4" stroke-linecap="round" opacity=".7"/>`); }
  if (sky === "snow") for (let i = 0; i < 70; i++) parts.push(`<circle cx="${r() * 1000}" cy="${r() * 1000}" r="${4 + r() * 6}" fill="#ffffff" opacity=".9"/>`);

  // 사람 — 등장 단어가 있을 때만
  const py = scene === "home" ? 900 : Math.min(horizon + 230, 930);
  if (people === 1) parts.push(person(500 + (r() - 0.5) * 200, py, 1.3, pal.accent));
  if (people === 2) {
    const px = 420 + (r() - 0.5) * 160;
    parts.push(person(px, py, 1.3, pal.accent), person(px + 130, py, 1.2, accent2 === pal.accent ? "#9aad8b" : accent2));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient>
<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .35 0 0 0 0 .27 0 0 0 0 .2 0 0 0 .09 0"/></filter></defs>
<rect width="1000" height="1000" fill="${PAPER}"/><rect width="1000" height="1000" fill="url(#s)"/>
${parts.join("\n")}
<rect width="1000" height="1000" filter="url(#g)"/>
</svg>`;
}

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
