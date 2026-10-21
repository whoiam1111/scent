import { getFontEmbedCSS, toCanvas } from "html-to-image";

// 키링 인쇄용 PNG: 화면의 그림 일기 카드를 그대로 찍는다 (카드와 키링이 늘 같은 모양·비율).
// 가로 1500px. 투명이 아니면 카드 밖(둥근 모서리)을 페이지 바탕색으로 채운다.
export const KEYRING_WIDTH = 1500;
const PAGE = "#e8e1d6"; // 입장권 홈과 같은 색

// 카드에 쓰인 글꼴 조합마다 글꼴 파일을 한 번만 읽어 둔다 (글씨체를 바꾸면 새 조합)
const fontCSS = new Map<string, Promise<string>>();
const familiesIn = (el: HTMLElement) => [...new Set([el, ...el.querySelectorAll("*")].map((e) => getComputedStyle(e).fontFamily))].sort().join("|");

export async function cardToPng(card: HTMLElement, transparent: boolean): Promise<Blob> {
  await document.fonts.ready;
  const key = familiesIn(card);
  if (!fontCSS.has(key)) fontCSS.set(key, getFontEmbedCSS(card));
  // backgroundColor 옵션은 카드 자체의 바탕을 덮어써서 쓰지 않고, 아래에서 따로 깐다
  const opts = { fontEmbedCSS: await fontCSS.get(key), pixelRatio: KEYRING_WIDTH / card.offsetWidth, style: { rotate: "none", transform: "none", margin: "0" } }; // 폴라로이드 기울기는 화면용
  // shortcut: Safari는 첫 렌더에서 그림이 빠지는 일이 있어 한 번 더 찍는다. 라이브러리가 고치면 제거
  await toCanvas(card, opts);
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
