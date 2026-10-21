"use client";

import DiaryCard, { THEMES } from "@/components/DiaryCard";
import { buildIllustration } from "@/lib/illustration";

const memory = "바다에서 친구와 노을을 봤다. 아무 말도 안 했다.";
const emotions = ["편안함", "그리움"];
const title = "해 질 무렵, 바다";
const text = "바다에서 친구와 노을을 봤다.\n그 순간의 편안함과 그리움을 오래 간직하고 싶다.";
const createdAt = "2026-10-21T09:00:00.000Z";
const illustration = buildIllustration(memory, emotions);

// 키링 PNG는 이 카드를 그대로 찍으므로 카드만 본다
export default function Preview() {
  return (
    <div className="grid gap-x-8 gap-y-16 p-8 md:grid-cols-2 xl:grid-cols-3">
      {THEMES.map(([theme, name]) => (
        <section key={theme}>
          <h2 className="mb-3 text-lg">{name}</h2>
          <DiaryCard theme={theme} title={title} text={text} illustration={illustration} createdAt={createdAt} emotions={emotions} />
        </section>
      ))}
    </div>
  );
}
