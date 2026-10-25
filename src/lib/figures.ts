// 그림 속 인물(나, 함께한 사람)의 모습. 그림을 그리는 데만 쓰고 저장하거나 서버로 보내지 않는다.
export type Gender = "none" | "female" | "male";
export type Age = "" | "child" | "teen" | "adult" | "middle" | "senior";
export type Figure = { gender: Gender; age: Age };
// who: 함께한 사람 ("" = 아직 안 고름, "없음" = 나 혼자). note: 그림에 더 담고 싶은 것 (옷차림, 날씨, 물건 등). style: 생성형 그림의 화풍
export type PictureStyle = "watercolor" | "photo" | "cartoon";
export type Figures = { me: Figure; mate: Figure; who: string; note: string; style: PictureStyle };
export const PICTURE_STYLES: [PictureStyle, string][] = [
  ["watercolor", "수채화"],
  ["photo", "실사"],
  ["cartoon", "애니메이션"],
];

export const GENDERS: [Gender, string][] = [
  ["none", "정하지 않음"],
  ["female", "여성"],
  ["male", "남성"],
];
export const AGES: [Age, string][] = [
  ["", "정하지 않음"],
  ["child", "어린이"],
  ["teen", "10대"],
  ["adult", "20–30대"],
  ["middle", "40–50대"],
  ["senior", "60대 이상"],
];

export const blankFigure: Figure = { gender: "none", age: "" };

// 기억 글에 나온 관계 말로 함께한 사람의 모습을 미리 채운다 (참가자가 바꿀 수 있다)
// shortcut: 단순 포함 검사라 "엄마표"처럼 붙은 말도 잡는다. 오검출이 잦으면 조사까지 보고 판단
const MATES: [string, Gender, Age][] = [
  ["할머니", "female", "senior"],
  ["할아버지", "male", "senior"],
  ["엄마", "female", "middle"],
  ["어머니", "female", "middle"],
  ["아빠", "male", "middle"],
  ["아버지", "male", "middle"],
  ["여자친구", "female", ""],
  ["남자친구", "male", ""],
  ["아내", "female", ""],
  ["남편", "male", ""],
  ["언니", "female", ""],
  ["누나", "female", ""],
  ["오빠", "male", ""],
  ["아들", "male", ""],
  ["형제자매", "none", ""],
  ["친구", "none", ""],
  ["연인", "none", ""],
  ["동생", "none", ""],
];

// 고른 관계 말에 맞는 모습 (모르면 정하지 않음)
export const figureFor = (word: string): Figure => {
  const m = MATES.find(([w]) => w === word);
  return m ? { gender: m[1], age: m[2] } : blankFigure;
};

export function guessMate(memory: string): { word: string; figure: Figure } | null {
  const m = MATES.find(([w]) => memory.includes(w));
  return m ? { word: m[0], figure: { gender: m[1], age: m[2] } } : null;
}
