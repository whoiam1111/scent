// 기억 탐색 분기·단서 문장·데모 일기 규칙 점검: node scripts/selftest.mjs
import assert from "node:assert/strict";
import { categories, nextStep, summarize } from "../src/lib/explore.ts";
import { demoDiary, detectScene } from "../src/lib/diary.ts";
import { AREAS, areaItems, heartPages, heartTypes, itemKey, PAGE_SIZE, scoreHeart } from "../src/lib/heart.ts";
import { NOTES, SCENTS } from "../src/lib/scent.ts";

const people = categories.find((c) => c.id === "people");
assert.equal(nextStep(people, "start", { start: "친구와 함께했던 시간" }), "scene");
assert.equal(nextStep(people, "start", { start: "직접 적어 볼게요" }), "free");
assert.equal(nextStep(people, "start", { start: "특정한 사람이 떠오르지는 않아요" }), "when");
assert.equal(nextStep(people, "start", {}), "when"); // 건너뛰기
assert.equal(nextStep(people, "feeling", {}), "summary");

const clue = summarize(people, { start: "친구와 함께했던 시간", scene: "함께 웃고 떠들던 장면", when: "몇 년 전", feeling: "따뜻함" });
assert.equal(clue, "몇 년 전, 친구와 함께했던 시간, 함께 웃고 떠들던 장면이 떠오르는 것 같아요. 떠올리면 따뜻함이 먼저 느껴지는 장면일까요?");
assert.match(summarize(people, {}), /어렴풋이 떠오르는 것 같아요/);
assert.match(summarize(people, { free: "비 오는 날 우산을 같이 쓴 기억이다." }), /^“비 오는 날 우산을 같이 쓴 기억이다” 같은 장면이 떠오르는 것 같아요.$/);

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

console.log("selftest ok");
