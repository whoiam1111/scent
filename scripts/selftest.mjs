// 기억 탐색 분기·단서 문장·데모 일기 규칙 점검: node scripts/selftest.mjs
import assert from "node:assert/strict";
import { categories, nextStep, summarize } from "../src/lib/explore.ts";
import { demoDiary, detectScene, EMOTION_COLORS, EMOTIONS } from "../src/lib/diary.ts";
import { AREAS, areaItems, heartPages, heartTypes, itemKey, PAGE_SIZE, scoreHeart } from "../src/lib/heart.ts";
import { NOTES, SCENTS } from "../src/lib/scent.ts";
import { guessMate } from "../src/lib/figures.ts";
import { picturePrompt } from "../src/lib/picture.ts";

const people = categories.find((c) => c.id === "people");
assert.equal(nextStep(people, "start", { start: "친구와 함께했던 시간" }), "scene");
assert.equal(nextStep(people, "start", { start: "직접 적어 볼게요" }), "free");
assert.equal(nextStep(people, "start", {}), "when"); // 건너뛰기
assert.equal(nextStep(people, "feeling", {}), "summary");

const clue = summarize(people, { start: "친구와 함께했던 시간", scene: "함께 웃고 떠들던 장면", when: "몇 년 전", feeling: "따뜻함" });
assert.equal(clue, "몇 년 전 친구와 함께 웃고 떠들던 기억이 나요. 그때 마음이 따뜻해졌어요.");
assert.equal(summarize(people, {}), "사람과 함께한 순간이 떠올라요.");
assert.equal(summarize(people, { start: "직접 적어 볼게요", free: "비 오는 날 우산을 같이 쓴 기억이다.", when: "몇 달 전" }), "몇 달 전, 비 오는 날 우산을 같이 쓴 기억이다.");
const EMO = new Set(EMOTIONS);
for (const c of categories) {
  for (const f of c.feelings) { assert.ok(EMO.has(f), `${c.id}: ${f}`); assert.ok(!summarize(c, { feeling: f }).includes("undefined")); assert.match(summarize(c, { feeling: f }), /요\.$/); }
  for (const o of c.start) assert.ok(o.free || o.scenes?.length, `${c.id}: ${o.label}`); // '모르겠어요' 같은 빈 선택지는 두지 않는다
  for (const o of c.start) for (const sc of o.scenes ?? []) assert.doesNotMatch(summarize(c, { start: o.label, scene: sc, when: "몇 달 전" }), /  |undefined/);
}
for (const e of EMOTIONS) assert.ok(EMOTION_COLORS[e], e);
// 직접 적기 + 함께한 사람
assert.equal(summarize(people, { start: "직접 적어 볼게요", free: "비 오는 날 우산을 같이 썼다", who: "엄마", when: "몇 달 전", feeling: "따뜻함" }), "몇 달 전 엄마와 함께한 기억이에요. 비 오는 날 우산을 같이 썼다. 그때 마음이 따뜻해졌어요.");
assert.match(summarize(people, { start: "직접 적어 볼게요", free: "산책", who: "동생" }), /^동생과 함께한 기억이에요\. 산책\.$/);
assert.match(summarize(people, { start: "직접 적어 볼게요", free: "산책", who: "혼자" }), /^혼자 보낸 기억이에요\./);
// 직접 적은 장면·때·느낌
assert.equal(summarize(people, { start: "친구와 함께했던 시간", scene: "바닷가에서 조개를 줍던 장면.", when: "작년 여름", feeling: "뭉클함" }), "작년 여름 친구와 바닷가에서 조개를 줍던 기억이 나요. 그때 뭉클함을 느꼈어요.");
assert.match(summarize(people, { start: "친구와 함께했던 시간", scene: "함께 웃고 떠들던 장면", feeling: "기분 좋은 설레임" }), /설레임을 느꼈어요\.$/);
assert.equal(summarize(people, { start: "친구와 함께했던 시간", scene: "바다 수영", when: "몇 달 전" }), "몇 달 전, 바다 수영.");

const d = demoDiary("바다에서 친구와 노을을 봤다. 아무 말도 안 했다.", ["편안함", "그리움"]);
assert.equal(d.title, "해 질 무렵, 바다");
assert.equal(d.text, "바다에서 친구와 노을을 봤다.\n그 순간의 편안함과 그리움을 오래 간직하고 싶다.");
assert.deepEqual(detectScene("혼자 밤에 집에서 쉬었다"), { scene: "home", sky: "night", people: 1 });
assert.equal(heartTypes.length, 16);
assert.equal(new Set(areaItems("나의 감정")).size, areaItems("나의 감정").length); // 겹치는 문장은 칩 하나
const hs = scoreHeart(new Set([itemKey("대인관계", "거절을 못 한다"), itemKey("일과 공부", "혼자 다 한다"), itemKey("나의 감정", "집중력이 있다")]));
assert.equal(hs[0].type.name, "부담감"); // 2/6
assert.deepEqual(hs[0].picked, ["거절을 못 한다", "혼자 다 한다"]);
assert.ok(hs.find((x) => x.type.name === "경쟁심").picked.includes("집중력이 있다"));
assert.ok(heartTypes.every((h) => AREAS.reduce((n, a) => n + h.items[a].length, 0) === 6)); // 유형당 6문항
assert.equal(scoreHeart(new Set())[0].ratio, 0);
assert.equal(AREAS.length, 4);

for (const h of heartTypes) for (const n of Object.values(SCENTS[h.name])) assert.ok(NOTES[n], `${h.name} → ${n}`); // 모든 핵심감정에 향, 모든 향에 설명

for (const a of AREAS) assert.deepEqual(heartPages.filter((p) => p.area === a).flatMap((p) => p.items), areaItems(a)); // 쪽을 나눠도 빠지거나 겹치는 문항 없음
assert.ok(heartPages.every((p) => p.items.length >= PAGE_SIZE && p.items.length < PAGE_SIZE * 2));

// 그림 속 인물: 관계 말로 함께한 사람 미리 채우기
assert.deepEqual(guessMate("할머니와 엄마랑 시장에 갔다"), { word: "할머니", figure: { gender: "female", age: "senior" } });
assert.equal(guessMate("혼자 걸었다"), null);

// 그림 프롬프트: 장면·날씨·인물이 영어로, 얼굴 없이 뒷모습
const pp = picturePrompt({ hints: { scene: "sea", sky: "rain", people: 2 }, me: { gender: "female", age: "child" }, mate: { gender: "female", age: "middle" }, who: "엄마", emotions: ["그리움"], description: "a yellow umbrella" });
assert.ok(pp.startsWith("A delicate watercolor painting of exactly two people, a little Korean girl and a middle-aged Korean woman, mother, side by side and seen from behind, faces not visible, on a sandy east-coast beach with calm waves in South Korea, on a rainy day with wet reflections. a yellow umbrella."), pp);
assert.match(pp, /feels nostalgic/);
assert.ok(pp.length < 2000);
assert.match(pp, /watercolor/);
assert.match(picturePrompt({ hints: { scene: "sea", sky: "day", people: 1 }, me: { gender: "none", age: "" }, mate: { gender: "none", age: "" }, who: "", emotions: [], style: "photo" }), /A realistic candid photograph of a Korean person seen from behind/);
assert.doesNotMatch(picturePrompt({ hints: { scene: "field", sky: "day", people: 0 }, me: { gender: "none", age: "" }, mate: { gender: "none", age: "" }, who: "", emotions: ["기타"] }), /undefined|seen from behind/);

console.log("selftest ok");
