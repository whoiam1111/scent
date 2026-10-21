"use client";

import { useEffect, useState } from "react";
import DiaryCard, { THEMES } from "@/components/DiaryCard";
import { buildIllustration } from "@/lib/illustration";
import { renderKeyring } from "@/lib/keyring";

const memory = "바다에서 친구와 노을을 봤다. 아무 말도 안 했다.";
const emotions = ["편안함", "그리움"];
const title = "해 질 무렵, 바다";
const text = "바다에서 친구와 노을을 봤다.\n그 순간의 편안함과 그리움을 오래 간직하고 싶다.";
const createdAt = "2026-10-21T09:00:00.000Z";
const illustration = buildIllustration(memory, emotions);

export default function Preview() {
  const [pngs, setPngs] = useState<Record<string, string>>({});
  useEffect(() => {
    for (const [theme] of THEMES)
      for (const transparent of [false, true])
        renderKeyring({ theme, svg: illustration, title, line: text.split("\n")[0], emotions, date: new Date(createdAt), transparent }).then((b) =>
          setPngs((p) => ({ ...p, [`${theme}-${transparent}`]: URL.createObjectURL(b) })),
        );
  }, []);
  return (
    <div className="grid gap-x-8 gap-y-16 p-8 md:grid-cols-[28rem_1fr]">
      {THEMES.map(([theme, name]) => (
        <section key={theme} className="contents">
          <div>
            <h2 className="mb-3 text-lg">{name}</h2>
            <DiaryCard theme={theme} title={title} text={text} illustration={illustration} createdAt={createdAt} emotions={emotions} />
          </div>
          <div className="flex flex-wrap items-start gap-4 pt-10">
            {[false, true].map((t) => (
              <div key={String(t)} className="w-72 bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- 생성한 PNG */}
                {pngs[`${theme}-${t}`] && <img src={pngs[`${theme}-${t}`]} alt={`${name} 키링${t ? " (투명)" : ""}`} className="w-full" />}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
