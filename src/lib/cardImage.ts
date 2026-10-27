import { toCanvas } from "html-to-image";

// 키링 인쇄용 PNG: 화면의 그림 일기 카드를 그대로 찍는다 (카드와 키링이 늘 같은 모양·비율).
// 가로 1500px. 투명이 아니면 카드 밖(둥근 모서리)을 페이지 바탕색으로 채운다.
export const KEYRING_WIDTH = 1500;
const PAGE = "#e8e1d6"; // 입장권 홈과 같은 색

// 카드 PNG에 넣을 글꼴: 카드에 쓰인 글꼴 중, 카드 글자가 들어 있는 조각(unicode-range)만 넣는다.
// 라이브러리 기본(getFontEmbedCSS)은 사이트의 모든 글꼴 조각(약 900개, 50MB)을 매번 넣어서 키링 만들기가 느렸다
const fontData = new Map<string, Promise<string>>(); // 글꼴 파일 주소 → data URL (한 번만 받는다)
const toDataUrl = (url: string) => {
  if (!fontData.has(url)) {
    const p = fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`font ${r.status}`))))
      .then((b) => new Promise<string>((res, rej) => Object.assign(new FileReader(), { onload: (e: ProgressEvent<FileReader>) => res(e.target!.result as string), onerror: rej }).readAsDataURL(b)));
    p.catch(() => fontData.delete(url)); // 실패하면 다음에 다시 받는다
    fontData.set(url, p);
  }
  return fontData.get(url)!;
};
const unquote = (f: string) => f.trim().replace(/^["']|["']$/g, "");
// "U+AC00-D7A3, U+3131" 같은 범위에 카드 글자가 하나라도 있는지
export const covers = (range: string, codes: number[]) =>
  !range ||
  range.split(",").some((part) => {
    const [lo, hi = lo] = part.trim().replace(/^U\+/i, "").split("-");
    const a = parseInt(lo.replace(/\?/g, "0"), 16);
    const b = parseInt(hi.replace(/\?/g, "F"), 16); // U+4?? → 400–4FF
    return codes.some((c) => c >= a && c <= b);
  });

// "400", "bold", "100 900" 같은 굵기 값에 쓰인 굵기가 들어 있는지
export const weightMatches = (value: string, used: Set<number>) => {
  const [lo, hi = lo] = (value || "400").trim().split(/\s+/).map((w) => (w === "normal" ? 400 : w === "bold" ? 700 : Number(w)));
  return [...used].some((w) => w >= lo && w <= hi);
};

async function fontEmbedCSS(card: HTMLElement) {
  // 글자가 직접 들어 있는 요소만 본다: 글꼴별로 쓰인 굵기와 글자를 모은다 (대체 글꼴도 포함 — 영문 라벨 글꼴에 없는 한글은 다음 글꼴로 그린다)
  const need = new Map<string, { weights: Set<number>; codes: Set<number> }>();
  for (const e of [card, ...card.querySelectorAll<HTMLElement>("*")]) {
    const text = [...e.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("");
    if (!text.trim()) continue;
    const cs = getComputedStyle(e);
    for (const fam of cs.fontFamily.split(",").map(unquote)) {
      const n = need.get(fam) ?? { weights: new Set(), codes: new Set() };
      n.weights.add(Number(cs.fontWeight) || 400);
      for (const ch of text) n.codes.add(ch.codePointAt(0)!);
      need.set(fam, n);
    }
  }
  const byFamily = new Map<string, CSSFontFaceRule[]>();
  for (const sheet of document.styleSheets) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // 다른 도메인 스타일시트는 읽을 수 없다 (글꼴은 next/font로 같은 도메인)
    }
    for (const r of list) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = unquote(r.style.getPropertyValue("font-family"));
      const n = need.get(fam);
      if (n && covers(r.style.getPropertyValue("unicode-range"), [...n.codes])) byFamily.set(fam, [...(byFamily.get(fam) ?? []), r]);
    }
  }
  // 쓰인 굵기의 파일만. 맞는 굵기가 없으면(예: 굵기 하나뿐인 손글씨) 브라우저가 가까운 것을 고르니 모두 넣는다
  const rules = [...byFamily].flatMap(([fam, rs]) => {
    const used = need.get(fam)!.weights;
    const hit = rs.filter((r) => weightMatches(r.style.getPropertyValue("font-weight"), used));
    return hit.length ? hit : rs;
  });
  const css = await Promise.all(
    rules.map(async (r) => {
      const m = r.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) return r.cssText; // local() 대체 글꼴
      const url = new URL(m[1], r.parentStyleSheet?.href ?? location.href).href;
      return r.cssText.replace(m[0], `url(${await toDataUrl(url)})`);
    }),
  );
  return css.join("\n");
}

export async function cardToPng(card: HTMLElement, transparent: boolean, width = KEYRING_WIDTH): Promise<Blob> {
  await document.fonts.ready;
  // backgroundColor 옵션은 카드 자체의 바탕을 덮어써서 쓰지 않고, 아래에서 따로 깐다
  const opts = { fontEmbedCSS: await fontEmbedCSS(card), pixelRatio: width / card.offsetWidth, style: { rotate: "none", transform: "none", margin: "0" } }; // 폴라로이드 기울기는 화면용
  // shortcut: Safari는 첫 렌더에서 그림이 빠지는 일이 있어 Safari에서만 한 번 더 찍는다. 라이브러리가 고치면 제거
  if (/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)) await toCanvas(card, opts);
  const shot = await toCanvas(card, opts);
  const out = document.createElement("canvas");
  out.width = shot.width;
  out.height = shot.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("canvas");
  if (!transparent) {
    ctx.fillStyle = PAGE;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.drawImage(shot, 0, 0);
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}
