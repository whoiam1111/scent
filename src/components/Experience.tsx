"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { categories, feelingToEmotion, nextStep, summarize, UNSURE, whenOptions, type Answers, type Category, type StepId } from "@/lib/explore";
import { demoDiary, detectScene, EMOTIONS, type SceneHints } from "@/lib/diary";
import { buildIllustration } from "@/lib/illustration";
import { renderKeyring, type Theme } from "@/lib/keyring";
import DiaryCard, { ALIGNS, BGS, FONTS, THEMES, type DiaryAlign, type DiaryBg, type DiaryFont } from "@/components/DiaryCard";
import { heartPages, itemKey, scoreHeart } from "@/lib/heart";
import { NOTES, SCENTS } from "@/lib/scent";

type Screen = "start" | "write" | "cats" | "questions" | "step" | "summary" | "none" | "today" | "emotion" | "heart" | "heartArea" | "heartResult" | "generating" | "error" | "result";
type GenerationMode = "ai" | "demo" | "demo-fallback";

// 참가자 한 명의 체험 상태. 서버에 저장하지 않고, 다시하기를 누르면 통째로 비운다.
type State = {
  mode: "memory" | "today";
  participantName: string;
  memoryText: string;
  selectedEmotions: string[];
  customEmotion: string;
  memoryExplorationCategory: string | null;
  memoryExplorationQuestion: string | null;
  memoryExplorationAnswers: Answers;
  exploreHistory: StepId[];
  confirmedMemorySummary: string | null;
  suggestedEmotion: string | null;
  heartChecks: string[];
  heartCode: string | null;
  diaryTitle: string;
  diaryText: string;
  illustration: string;
  createdAt: string | null;
  generationMode: GenerationMode | null;
};

const initial: State = {
  mode: "memory",
  participantName: "",
  memoryText: "",
  selectedEmotions: [],
  customEmotion: "",
  memoryExplorationCategory: null,
  memoryExplorationQuestion: null,
  memoryExplorationAnswers: {},
  exploreHistory: [],
  confirmedMemorySummary: null,
  suggestedEmotion: null,
  heartChecks: [],
  heartCode: null,
  diaryTitle: "",
  diaryText: "",
  illustration: "",
  createdAt: null,
  generationMode: null,
};

const TIMEOUT_MS = 30_000;
const IDLE_MS = 4 * 60_000;
const loadingLines = ["기억 속 장면을 정리하고 있어요.", "그날의 감정을 담고 있어요.", "당신만의 그림 일기를 만들고 있어요."];

const stepQuestion: Record<Exclude<StepId, "start">, string> = {
  scene: "어떤 장면이 가장 가까운가요?",
  free: "떠오르는 장면을 짧게 적어 보세요.",
  when: "그 장면은 언제쯤이었나요?",
  feeling: "그 순간을 떠올렸을 때 가장 먼저 드는 느낌은 무엇인가요?",
};

const todayPrompts = ["오늘 이곳에 오는 길에 본 것", "요즘 자주 하는 생각", "지금 듣고 싶은 노래", "앞으로 만들고 싶은 순간"];

export default function Experience() {
  const [screen, setScreen] = useState<Screen>("start");
  const [s, setS] = useState<State>(initial);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("친구와 밤늦게까지 이야기했던 날.");
  const set = (patch: Partial<State>) => setS((p) => ({ ...p, ...patch }));
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    fetch("/api/diary")
      .then((r) => r.json())
      .then((j) => setAiEnabled(Boolean(j.ai)))
      .catch(() => setAiEnabled(false));
  }, []);

  const reset = useCallback(() => {
    setS(initial);
    setError("");
    setConfirmReset(false);
    setPrompt("친구와 밤늦게까지 이야기했던 날.");
    setScreen("start");
    window.scrollTo(0, 0);
  }, []);

  const cat = categories.find((c) => c.id === s.memoryExplorationCategory) ?? null;
  const emotionsForDiary = s.selectedEmotions.map((e) => (e === "기타" ? s.customEmotion.trim() || "기타" : e));

  // ── 그림 일기 생성 ──
  const abortRef = useRef<AbortController | null>(null);
  const finish = (title: string, text: string, hints: SceneHints, mode: GenerationMode) => {
    set({
      diaryTitle: title,
      diaryText: text,
      illustration: buildIllustration(s.memoryText || title, emotionsForDiary, hints),
      createdAt: new Date().toISOString(),
      generationMode: mode,
    });
    go("result");
  };

  const generateDemo = (mode: GenerationMode) => {
    if (!s.memoryText.trim()) {
      // 기억 없이 '오늘의 마음'으로 참여 — 지어낸 과거 대신 지금 여기의 사실만 쓴다
      const feel = emotionsForDiary.join(", ");
      return finish(`오늘의 ${emotionsForDiary[0]}`, `오늘, 마음의 조각을 찾으러 이곳에 왔다.\n지금 내 마음은 ${feel}에 가깝다.`, { scene: "field", sky: "day", people: 0 }, mode);
    }
    const d = demoDiary(s.memoryText, emotionsForDiary);
    finish(d.title, d.text, detectScene(s.memoryText), mode);
  };

  const generate = async () => {
    go("generating");
    setError("");
    if (!s.memoryText.trim()) return setTimeout(() => generateDemo("demo"), 1200);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory: s.memoryText, emotions: emotionsForDiary }),
        signal: ctrl.signal,
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.title) throw new Error(j?.error ?? "그림 일기를 만들지 못했어요.");
      finish(j.title, j.text, j.hints, j.mode === "ai" ? "ai" : "demo");
    } catch (e) {
      if (ctrl.signal.aborted && abortRef.current !== ctrl) return; // 사용자가 취소함
      setError(ctrl.signal.aborted ? "시간이 너무 오래 걸리고 있어요." : (e as Error).message);
      go("error");
    } finally {
      clearTimeout(timer);
    }
  };

  const cancelGenerate = () => {
    const c = abortRef.current;
    abortRef.current = null;
    c?.abort();
    go("emotion");
  };

  // ── 기억 탐색 ──
  const answers = s.memoryExplorationAnswers;
  const currentStep = s.exploreHistory[s.exploreHistory.length - 1];

  const answer = (step: StepId, value: string | undefined) => {
    if (!cat) return;
    const nextAnswers: Answers = { ...answers, [step]: value };
    // 첫 답이 바뀌면 그에 딸린 장면·직접 적기 답은 무효
    if (step === "start" && answers.start !== value) {
      delete nextAnswers.scene;
      delete nextAnswers.free;
    }
    if (value === undefined) delete nextAnswers[step];
    const n = nextStep(cat, step, nextAnswers);
    set({ memoryExplorationAnswers: nextAnswers, exploreHistory: n === "summary" ? s.exploreHistory : [...s.exploreHistory, n] });
    if (n === "summary") {
      set({ confirmedMemorySummary: summarize(cat, nextAnswers) });
      go("summary");
    }
  };

  const exploreBack = () => {
    if (s.exploreHistory.length <= 1) return go("questions");
    set({ exploreHistory: s.exploreHistory.slice(0, -1) });
  };

  const editStep = (step: StepId) => {
    const i = s.exploreHistory.indexOf(step);
    set({ exploreHistory: s.exploreHistory.slice(0, i + 1) });
    go("step");
  };

  const pickCategory = (c: Category) => {
    set({ memoryExplorationCategory: c.id, memoryExplorationQuestion: null, memoryExplorationAnswers: {}, exploreHistory: [] });
    go("questions");
  };

  const useSummary = () => {
    const feeling = answers.feeling && answers.feeling !== UNSURE ? feelingToEmotion[answers.feeling] : null;
    set({
      memoryText: s.confirmedMemorySummary ?? "",
      suggestedEmotion: feeling,
      selectedEmotions: feeling && s.selectedEmotions.length === 0 ? [feeling] : s.selectedEmotions,
    });
    go("write");
  };

  // ── 감정 ──
  const [emotionHint, setEmotionHint] = useState("");
  const toggleEmotion = (e: string) => {
    setEmotionHint("");
    if (s.selectedEmotions.includes(e)) return set({ selectedEmotions: s.selectedEmotions.filter((x) => x !== e) });
    if (s.selectedEmotions.length >= 2) return setEmotionHint("감정은 2개까지 고를 수 있어요. 하나를 해제하고 다시 골라 주세요.");
    set({ selectedEmotions: [...s.selectedEmotions, e] });
  };
  // ── 핵심감정 체크리스트 (선택, 그림 일기에는 쓰지 않는다) ──
  const [areaIdx, setAreaIdx] = useState(0); // heartPages 쪽 번호
  const page = heartPages[areaIdx];
  const toggleCheck = (key: string) =>
    set({ heartChecks: s.heartChecks.includes(key) ? s.heartChecks.filter((k) => k !== key) : [...s.heartChecks, key], heartCode: null });

  const emotionReady = s.selectedEmotions.length > 0 && (!s.selectedEmotions.includes("기타") || s.customEmotion.trim().length > 0);

  // ── 자리를 비운 참가자 보호: 오래 조작이 없으면 확인 후 초기화 ──
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (screen === "start") return;
    let t = setTimeout(() => setIdle(true), IDLE_MS);
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), IDLE_MS);
    };
    const evs = ["pointerdown", "keydown", "scroll"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [screen]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* 검은 띠 머리글: 첫 화면에서는 아래 검은 면과 이어진다 */}
      <header className="bg-ink text-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-10">
          {screen !== "start" && (
            <>
              <button type="button" onClick={() => setConfirmReset(true)} className="display text-xl" aria-label="마음의 조각 — 처음 화면">
                마음의 조각
              </button>
              <button type="button" onClick={() => setConfirmReset(true)} className="btn-text text-gold-light">
                처음부터 다시하기
              </button>
            </>
          )}
        </div>
      </header>

      <div className={`mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-10 ${screen === "start" ? "" : "pb-10"}`}>
      <main key={screen + (currentStep ?? "")} className="fade-in flex flex-1 flex-col">
        {screen === "start" && (
          <section className="relative left-1/2 flex w-screen flex-1 -translate-x-1/2 flex-col items-center justify-center bg-ink px-5 pt-6 pb-12 text-center text-paper">
            <p className="text-xs tracking-[0.42em] text-gold-light">MEMORY · EMOTION · SCENT</p>
            <h1 className="display mt-7 text-[clamp(3rem,7vw,5.6rem)] leading-none font-medium tracking-[-0.03em]">마음의 조각</h1>
            <span className="mt-8 h-px w-12 bg-gold-light/70" aria-hidden />
            <p className="display mt-8 text-[clamp(1.3rem,2.4vw,1.75rem)] leading-snug font-medium text-paper/85">당신에게 남아 있는 순간은 무엇인가요?</p>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-paper/50">기억 하나와 그때의 감정으로 그림 일기를 만들고, 나만의 향과 키링으로 간직해요.</p>
            <form
              className="mt-12 flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (s.participantName.trim()) go("write");
              }}
            >
              <label className="flex flex-1 flex-col text-left">
                <span className="text-xs tracking-[0.2em] text-paper/50">이름 또는 닉네임</span>
                <input id="pname" value={s.participantName} maxLength={20} onChange={(e) => set({ participantName: e.target.value })} placeholder="예: 마음이" className="mt-2 border-b border-paper/30 bg-transparent py-3 text-xl text-paper placeholder:text-paper/25 focus:border-gold-light focus:outline-none" autoComplete="off" enterKeyHint="go" />
              </label>
              <button type="submit" className="btn-main border border-gold-light bg-gold-light text-ink active:bg-gold disabled:border-paper/20 disabled:bg-transparent disabled:text-paper/35 disabled:opacity-100 sm:w-44" disabled={!s.participantName.trim()}>
                시작하기 →
              </button>
            </form>
            <ol className="mt-14 flex gap-6 text-sm tracking-[0.12em] text-paper/45 sm:gap-10">
              {["기억", "감정", "향과 키링"].map((t, i) => (
                <li key={t}>
                  <span className="mr-2 text-gold-light">0{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <div className="mt-8 w-full max-w-lg [&_summary]:text-paper/45">
              <Privacy ai={aiEnabled} />
            </div>
          </section>
        )}

        {screen === "write" && (
          <Split
            left={
              <>
                <h1 className="display text-[clamp(2rem,4.4vw,3.2rem)]">
                  {s.mode === "today" ? "지금, 이 순간을 적어 볼까요?" : "지금도 문득 떠오르는 순간이 있나요?"}
                </h1>
                <p className="mt-5 text-xl leading-relaxed text-mute">
                  {s.confirmedMemorySummary ? "탐색에서 찾은 단서예요. 마음에 남아 있는 부분만 남기고 자유롭게 고쳐 써 주세요." : "행복했던 순간도, 아쉬웠던 순간도 괜찮아요. 작은 장면 하나만 떠올려도 충분해요."}
                </p>
                <p className="mt-6 text-base text-mute">이름, 연락처처럼 나를 알아볼 수 있는 정보는 적지 않아도 돼요.</p>
              </>
            }
            right={
              <div className="flex flex-col gap-4">
                <label htmlFor="memory" className="sr-only">
                  기억 적기
                </label>
                <textarea
                  id="memory"
                  rows={6}
                  maxLength={600}
                  value={s.memoryText}
                  onChange={(e) => set({ memoryText: e.target.value })}
                  placeholder={prompt}
                  className="field resize-none"
                />
                <p className="-mt-2 text-right text-sm text-mute">{s.memoryText.length} / 600</p>
                <button
                  type="button"
                  className="btn-main w-full"
                  onClick={() => (s.memoryText.trim() ? go("emotion") : document.getElementById("memory")?.focus())}
                >
                  {s.mode === "today" ? "이대로 계속하기" : s.memoryText.trim() ? "이 기억으로 계속하기" : "기억이 떠올라요"}
                </button>
                {s.mode === "memory" && (
                  <button type="button" className="btn-soft w-full" onClick={() => go("cats")}>
                    잘 기억나지 않아요. 함께 떠올려 볼까요?
                  </button>
                )}
                {s.mode === "today" && (
                  <button type="button" className="btn-soft w-full" onClick={() => go("today")}>
                    이전으로
                  </button>
                )}
              </div>
            }
          />
        )}

        {screen === "cats" && (
          <section>
            <BackButton onClick={() => go("write")} />
            <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">괜찮아요. 천천히 떠올려 봐요.</h1>
            <p className="mt-4 max-w-3xl text-xl leading-relaxed text-mute">특별한 사건이 아니어도 괜찮아요. 평범한 하루의 작은 순간도 나에게는 의미 있는 기억일 수 있어요.</p>
            <Note>아래에서 마음이 가는 것만 골라 보세요. 정답은 없고, 모든 질문에 답할 필요도 없어요.</Note>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c, i) => (
                <li key={c.id}>
                  <button type="button" onClick={() => pickCategory(c)} className="flex h-full min-h-36 w-full flex-col justify-between rounded-[2px] border border-line bg-paper p-6 text-left active:bg-cream">
                    <span className="display text-2xl text-apricot-deep">{String.fromCharCode(65 + i)}</span>
                    <span>
                      <span className="display block text-2xl">{c.title}</span>
                      <span className="mt-1 block text-mute">{c.desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {screen === "questions" && cat && (
          <Split
            left={
              <>
                <BackButton onClick={() => go("cats")} />
                <p className="mt-4 text-lg text-sage-deep">{cat.title}</p>
                <h1 className="mt-3 display text-[clamp(1.8rem,4vw,2.8rem)]">마음이 가는 질문 하나를 골라 보세요.</h1>
                <Note>답하기 어려우면 다른 주제를 골라도 괜찮아요.</Note>
              </>
            }
            right={
              <div className="flex flex-col gap-3">
                {cat.questions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="choice"
                    aria-pressed={s.memoryExplorationQuestion === q}
                    onClick={() => {
                      set({ memoryExplorationQuestion: q, exploreHistory: ["start"] });
                      go("step");
                    }}
                  >
                    {q}
                  </button>
                ))}
                <button type="button" className="btn-text self-start" onClick={() => go("cats")}>
                  다른 주제 보기
                </button>
              </div>
            }
          />
        )}

        {screen === "step" && cat && currentStep && (
          <Split
            left={
              <>
                <BackButton onClick={exploreBack} />
                <Progress total={4} at={Math.min(s.exploreHistory.length, 4)} />
                <p className="mt-6 text-lg text-sage-deep">{currentStep === "start" ? cat.startQuestion : s.memoryExplorationQuestion}</p>
                <h1 className="mt-3 display text-[clamp(1.8rem,4vw,2.8rem)]">
                  {currentStep === "start" ? s.memoryExplorationQuestion : stepQuestion[currentStep]}
                </h1>
                <Note>답하지 않아도 괜찮아요. 넘기고 다음으로 가도 돼요.</Note>
              </>
            }
            right={<StepOptions cat={cat} step={currentStep} answers={answers} onAnswer={answer} />}
          />
        )}

        {screen === "summary" && cat && (
          <Split
            left={
              <>
                <BackButton onClick={() => go("step")} />
                <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">이런 장면이 떠오르나요?</h1>
                <p className="mt-4 text-xl leading-relaxed text-mute">고른 답을 모아 본 단서예요. 정답이 아니니, 마음에 남아 있는 부분만 남기고 자유롭게 고쳐 주세요.</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {s.exploreHistory.map((st) => {
                    const v = st === "start" ? answers.start : answers[st];
                    return (
                      <li key={st}>
                        <button type="button" onClick={() => editStep(st)} className="min-h-12 rounded-full border-2 border-line bg-white/70 px-4 text-base active:bg-cream">
                          {v ?? "건너뜀"} <span className="text-mute">· 바꾸기</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            }
            right={
              <div className="flex flex-col gap-3">
                <label htmlFor="clue" className="text-lg font-medium">
                  혹시 이런 장면에 가까울까요?
                </label>
                <textarea id="clue" rows={5} value={s.confirmedMemorySummary ?? ""} onChange={(e) => set({ confirmedMemorySummary: e.target.value })} className="field resize-none" />
                <button type="button" className="btn-main w-full" disabled={!s.confirmedMemorySummary?.trim()} onClick={useSummary}>
                  이 장면을 바탕으로 기억 적기
                </button>
                <button type="button" className="btn-soft w-full" onClick={() => go("cats")}>
                  다른 질문으로 탐색하기
                </button>
                <button type="button" className="btn-text self-center" onClick={() => go("none")}>
                  기억이 떠오르지 않아요
                </button>
              </div>
            }
          />
        )}

        {screen === "none" && (
          <Split
            left={
              <>
                <h1 className="display text-[clamp(2rem,4.4vw,3.2rem)]">떠오르지 않아도 괜찮아요.</h1>
                <p className="mt-5 text-xl leading-relaxed text-mute">기억은 애쓴다고 바로 나오지 않을 때가 많아요. 지금의 마음으로 그림 일기를 만들 수도 있고, 처음부터 천천히 다시 생각해 볼 수도 있어요.</p>
              </>
            }
            right={
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="btn-main w-full"
                  onClick={() => {
                    set({ mode: "today", memoryText: "", confirmedMemorySummary: null, suggestedEmotion: null });
                    go("today");
                  }}
                >
                  다른 방식으로 참여하기
                </button>
                <button
                  type="button"
                  className="btn-soft w-full"
                  onClick={() => {
                    set({ memoryExplorationCategory: null, memoryExplorationAnswers: {}, exploreHistory: [], confirmedMemorySummary: null, memoryText: "" });
                    go("write");
                  }}
                >
                  처음부터 다시 생각해 보기
                </button>
              </div>
            }
          />
        )}

        {screen === "today" && (
          <Split
            left={
              <>
                <BackButton onClick={() => go("none")} />
                <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">지난 기억 대신, 오늘의 마음으로.</h1>
                <p className="mt-5 text-xl leading-relaxed text-mute">꼭 과거의 일이 아니어도 괜찮아요. 아래 중 하나를 골라 짧게 적어 보거나, 적지 않고 감정만 골라도 그림 일기를 만들 수 있어요.</p>
              </>
            }
            right={
              <div className="flex flex-col gap-3">
                {todayPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="choice"
                    onClick={() => {
                      set({ memoryText: "" });
                      setPrompt(`${p}…`);
                      go("write");
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn-soft mt-2 w-full"
                  onClick={() => {
                    set({ memoryText: "" });
                    go("emotion");
                  }}
                >
                  적지 않고 감정만 고를게요
                </button>
              </div>
            }
          />
        )}

        {screen === "emotion" && (
          <section>
            <BackButton onClick={() => go(s.mode === "today" && !s.memoryText ? "today" : "write")} />
            <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">
              {s.mode === "today" ? "지금의 나는 어떤 감정에 가까운가요?" : "그 순간의 나는 어떤 감정에 가까웠나요?"}
            </h1>
            <p className="mt-4 text-xl text-mute">가장 가까운 감정을 1~2개 골라 주세요. 여러 감정이 섞여 있어도 괜찮아요.</p>
            {s.suggestedEmotion && <Note>탐색에서 고른 느낌을 미리 표시해 두었어요. 자유롭게 바꿔도 돼요.</Note>}
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {EMOTIONS.map((e) => {
                const on = s.selectedEmotions.includes(e);
                return (
                  <li key={e}>
                    <button type="button" aria-pressed={on} onClick={() => toggleEmotion(e)} className="choice justify-between">
                      {e}
                      <span aria-hidden className={`ml-2 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm ${on ? "border-brown bg-brown text-ivory" : "border-line"}`}>
                        {on ? s.selectedEmotions.indexOf(e) + 1 : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {s.selectedEmotions.includes("기타") && (
              <div className="mt-4 max-w-md">
                <label htmlFor="custom" className="text-lg">
                  어떤 감정인가요?
                </label>
                <input id="custom" value={s.customEmotion} maxLength={10} onChange={(e) => set({ customEmotion: e.target.value })} placeholder="예: 뭉클함" className="field mt-2" />
              </div>
            )}
            <p role="status" className="mt-4 min-h-7 text-apricot-deep">
              {emotionHint}
            </p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:items-end">
              <button type="button" className="btn-main w-full sm:w-80" disabled={!emotionReady} onClick={() => go("heart")}>
                다음
              </button>
              {!emotionReady && <p className="text-mute">감정을 하나 이상 골라 주세요.</p>}
            </div>
          </section>
        )}

        {screen === "heart" && (
          <Split
            left={
              <>
                <BackButton onClick={() => go("emotion")} />
                <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">내 마음의 바탕을 살펴볼까요?</h1>
                <p className="mt-5 text-xl leading-relaxed text-mute">대인관계, 가족관계, 일과 공부, 나의 감정 네 영역에서 요즘의 나와 닮은 문장을 골라요. 3분쯤 걸리고, 마치면 지금 마음에 어울리는 향 조합을 추천해 드려요.</p>
                <Note>진단이 아닌 참고용이에요. 고른 문장은 AI로 보내지 않고 그림 일기에도 들어가지 않으며, 코칭존 상담을 위해 상담사에게 전달돼요.</Note>
              </>
            }
            right={
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="btn-main w-full"
                  onClick={() => {
                    setAreaIdx(0);
                    go("heartArea");
                  }}
                >
                  시작하기
                </button>
              </div>
            }
          />
        )}

        {screen === "heartArea" && (
          <section key={areaIdx}>
            <BackButton onClick={() => (areaIdx === 0 ? go("heart") : (setAreaIdx(areaIdx - 1), window.scrollTo(0, 0)))} />
            <div className="mt-4 h-2 max-w-md rounded-full bg-line" aria-label={`${heartPages.length}쪽 중 ${areaIdx + 1}쪽`}>
              <div className="h-2 rounded-full bg-apricot-deep transition-[width]" style={{ width: `${((areaIdx + 1) / heartPages.length) * 100}%` }} />
            </div>
            <p className="mt-6 text-lg text-sage-deep">
              {page.area} {page.part} / {page.parts}
              <span className="text-mute"> · 전체 {areaIdx + 1} / {heartPages.length}</span>
            </p>
            <h1 className="mt-2 display text-[clamp(1.8rem,4vw,2.6rem)]">
              {page.area === "나의 감정" ? "나에게 해당하는 모습을 모두 골라 주세요." : `${page.area}에서 요즘의 나와 닮은 문장을 모두 골라 주세요.`}
            </h1>
            <p className="mt-3 text-lg text-mute">깊이 고민하지 말고 마음이 가는 대로 골라요. 하나도 없으면 그냥 넘어가도 괜찮아요.</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {page.items.map((x) => {
                const k = itemKey(page.area, x);
                return (
                  <li key={k}>
                    <button type="button" aria-pressed={s.heartChecks.includes(k)} onClick={() => toggleCheck(k)} className="choice min-h-16">
                      {x}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-end sm:gap-6">
              <p className="text-mute">이 쪽에서 {page.items.filter((x) => s.heartChecks.includes(itemKey(page.area, x))).length}개 골랐어요</p>
              <button
                type="button"
                className="btn-main w-full sm:w-80"
                onClick={() => {
                  if (areaIdx < heartPages.length - 1) {
                    setAreaIdx(areaIdx + 1);
                    window.scrollTo(0, 0);
                  } else go("heartResult");
                }}
              >
                {areaIdx < heartPages.length - 1 ? (heartPages[areaIdx + 1].area !== page.area ? `다음: ${heartPages[areaIdx + 1].area}` : "다음") : "결과 보기"}
              </button>
            </div>
          </section>
        )}

        {screen === "heartResult" && (
          <ScentResult
            name={s.participantName.trim()}
            checks={s.heartChecks}
            code={s.heartCode}
            onSaved={(heartCode) => set({ heartCode })}
            onBack={() => go("heartArea")}
            onRetry={() => {
              set({ heartChecks: [], heartCode: null });
              setAreaIdx(0);
              go("heartArea");
            }}
            onNext={generate}
          />
        )}

        {screen === "generating" && <Generating onCancel={cancelGenerate} />}

        {screen === "error" && (
          <section className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center text-center">
            <h1 className="display text-3xl">그림 일기를 만들지 못했어요.</h1>
            <p className="mt-4 text-xl text-mute">{error} 입력한 내용은 그대로 남아 있어요.</p>
            <div className="mt-10 flex w-full flex-col gap-3">
              <button type="button" className="btn-main w-full" onClick={generate}>
                다시 시도하기
              </button>
              <button type="button" className="btn-soft w-full" onClick={() => generateDemo("demo-fallback")}>
                데모 방식으로 만들기
              </button>
              <p className="text-base text-mute">데모 방식은 AI 없이, 적은 문장을 그대로 엮고 미리 준비한 일러스트로 그림을 그려요.</p>
              <button type="button" className="btn-text self-center" onClick={() => go("emotion")}>
                이전으로
              </button>
            </div>
          </section>
        )}

        {screen === "result" && <Result s={s} emotions={emotionsForDiary} onRedo={() => go(s.mode === "today" && !s.memoryText ? "emotion" : "write")} onRestart={() => setConfirmReset(true)} />}
      </main>
      </div>

      {(confirmReset || idle) && (
        <Dialog
          title={idle ? "아직 체험 중이신가요?" : "처음부터 다시할까요?"}
          body={idle ? "한동안 움직임이 없어요. 다음 참가자를 위해 30초 뒤 처음 화면으로 돌아가고, 적은 내용은 지워져요." : "지금까지 적은 기억과 감정, 만든 그림 일기가 모두 지워져요."}
          confirm={idle ? "처음으로" : "처음부터 다시하기"}
          cancel={idle ? "계속할게요" : "아니요, 계속할게요"}
          autoConfirmMs={idle ? 30_000 : undefined}
          onConfirm={() => {
            setIdle(false);
            reset();
          }}
          onCancel={() => {
            setIdle(false);
            setConfirmReset(false);
          }}
        />
      )}
    </div>
  );
}

function Split({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <section className="grid flex-1 content-center gap-10 py-6 lg:grid-cols-2 lg:gap-16 landscape:md:grid-cols-2 landscape:md:gap-14">
      <div>{left}</div>
      <div>{right}</div>
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-ml-2 inline-flex min-h-12 items-center gap-2 px-2 text-lg text-mute active:text-brown">
      <span aria-hidden>←</span> 이전
    </button>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 border-l-2 border-gold py-1 pl-4 text-lg leading-relaxed text-gold">{children}</p>;
}

function Progress({ total, at }: { total: number; at: number }) {
  return (
    <div className="mt-4 flex gap-2" aria-label={`${total}개 질문 중 ${at}번째`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 w-10 rounded-full ${i < at ? "bg-apricot-deep" : "bg-line"}`} />
      ))}
    </div>
  );
}

function StepOptions({ cat, step, answers, onAnswer }: { cat: Category; step: StepId; answers: Answers; onAnswer: (step: StepId, v: string | undefined) => void }) {
  const [free, setFree] = useState(answers.free ?? "");
  if (step === "free") {
    return (
      <div className="flex flex-col gap-3">
        <label htmlFor="free" className="sr-only">
          떠오르는 장면
        </label>
        <textarea id="free" rows={4} maxLength={200} value={free} onChange={(e) => setFree(e.target.value)} placeholder="예: 비 오는 날 우산을 같이 썼던 일" className="field resize-none" />
        <button type="button" className="btn-main w-full" disabled={!free.trim()} onClick={() => onAnswer("free", free.trim())}>
          다음
        </button>
        <button type="button" className="btn-text self-center" onClick={() => onAnswer("free", undefined)}>
          건너뛰기
        </button>
      </div>
    );
  }
  const scenes = cat.start.find((o) => o.label === answers.start)?.scenes ?? [];
  const opts = step === "start" ? cat.start.map((o) => o.label) : step === "scene" ? [...scenes, UNSURE] : step === "when" ? whenOptions : cat.feelings;
  return (
    <div className="flex flex-col gap-3">
      {opts.map((o) => (
        <button key={o} type="button" className="choice" aria-pressed={answers[step] === o} onClick={() => onAnswer(step, o)}>
          {o}
        </button>
      ))}
      <button type="button" className="btn-text self-center" onClick={() => onAnswer(step, undefined)}>
        답하지 않고 넘어가기
      </button>
    </div>
  );
}

function Generating({ onCancel }: { onCancel: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % loadingLines.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center" aria-busy="true">
      <Pieces spinning />
      <h1 className="mt-10 display text-[clamp(1.8rem,4vw,2.8rem)]">당신의 기억을 한 장에 담고 있어요.</h1>
      <p role="status" className="mt-4 min-h-8 text-xl text-mute">
        {loadingLines[i]}
      </p>
      <button type="button" className="btn-text mt-10" onClick={onCancel}>
        취소하고 돌아가기
      </button>
    </section>
  );
}

function Result({ s, emotions, onRedo, onRestart }: { s: State; emotions: string[]; onRedo: () => void; onRestart: () => void }) {
  const [transparent, setTransparent] = useState(false);
  const [theme, setTheme] = useState<Theme>("book");
  const [font, setFont] = useState<DiaryFont>("auto");
  const [align, setAlign] = useState<DiaryAlign>("auto");
  const [bg, setBg] = useState<DiaryBg>("auto");
  const [rendered, setRendered] = useState<{ url: string; key: string } | null>(null);
  const [pngError, setPngError] = useState(false);
  const shortLine = s.diaryText.split("\n")[0];
  const emotionKey = emotions.join("|");
  const renderKey = [theme, font, align, bg, s.illustration, s.diaryTitle, shortLine, emotionKey, transparent].join("\u0000");
  // 옵션을 바꾸면 새 이미지가 나올 때까지 이전(곧 해제될) 주소는 쓰지 않는다
  const png = rendered?.key === renderKey ? rendered : null;

  useEffect(() => {
    let url = "";
    let alive = true;
    const [, , fill, light] = BGS.find(([id]) => id === bg) ?? BGS[0];
    renderKeyring({ theme, font, align, bg: fill ? { fill, light } : null, svg: s.illustration, title: s.diaryTitle, line: shortLine, emotions: emotionKey.split("|"), date: new Date(s.createdAt ?? Date.now()), transparent })
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setRendered({ url, key: renderKey });
        setPngError(false);
      })
      .catch(() => alive && setPngError(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [theme, font, align, bg, s.illustration, s.diaryTitle, shortLine, emotionKey, transparent, s.createdAt, renderKey]);

  const download = () => {
    if (!png) return;
    const a = document.createElement("a");
    a.href = png.url;
    a.download = `마음의조각-${theme}-${new Date(s.createdAt ?? Date.now()).toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const label = s.generationMode === "ai" ? "문장: AI 생성 · 그림: 일러스트 템플릿" : s.generationMode === "demo-fallback" ? "데모 모드 (AI 생성 실패로 대체) · AI 미사용" : "데모 모드 · AI 미사용";

  return (
    <section className="grid gap-10 py-4 lg:grid-cols-[1.1fr_1fr] landscape:md:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="mx-auto mb-6 flex max-w-md flex-col gap-4">
          <Segmented label="디자인 — 키링도 같은 디자인으로 만들어져요" options={THEMES} value={theme} onChange={setTheme} cols={3} />
          <Segmented label="글씨체" options={FONTS} value={font} onChange={setFont} cols={4} />
          <Segmented label="정렬" options={ALIGNS} value={align} onChange={setAlign} cols={4} />
          <div role="radiogroup" aria-label="배경색">
            <p className="mb-2 text-base text-mute">배경색</p>
            <div className="flex flex-wrap gap-2.5">
              {BGS.map(([id, name, fill]) => (
                <button key={id} type="button" role="radio" aria-checked={bg === id} aria-label={name} title={name} onClick={() => setBg(id)} className={`size-12 rounded-full border border-ink/20 ring-offset-2 ring-offset-ivory ${bg === id ? "ring-2 ring-ink" : ""}`} style={{ background: fill || "conic-gradient(#e8b9a0, #c5d8de, #b4c1a5, #e8c3c0, #e8b9a0)" }}>
                  {id === "auto" && <span className="text-xs text-ink">기본</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DiaryCard theme={theme} font={font} align={align} bg={bg} title={s.diaryTitle} text={s.diaryText} illustration={s.illustration} createdAt={s.createdAt} emotions={emotions} />
        <p className="mt-4 text-center text-sm text-mute">{label}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="display text-2xl">키링 이미지</h2>
        <div className="mx-auto w-full max-w-xs rounded-3xl bg-[repeating-conic-gradient(#efe6d6_0_25%,#faf6ee_0_50%)] bg-[length:24px_24px] p-3">
          {png ? (
            // eslint-disable-next-line @next/next/no-img-element -- 생성한 PNG 미리보기 (길게 눌러 저장 가능)
            <img src={png.url} alt="키링용 정사각형 이미지 미리보기" className="w-full" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-mute">{pngError ? "이미지를 만들지 못했어요." : "만드는 중…"}</div>
          )}
        </div>
        <label className="flex min-h-12 items-center gap-3 self-center text-lg">
          <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="size-6 accent-[#5b4636]" />
          바깥 배경 투명하게
        </label>
        <button type="button" className="btn-main w-full" disabled={!png} onClick={download}>
          키링용 이미지 저장하기
        </button>
        <p className="text-center text-sm text-mute">1500×1500 PNG · 저장이 안 되면 위 이미지를 길게 눌러 저장하세요.</p>
        <button type="button" className="btn-soft w-full" onClick={onRedo}>
          그림 일기 다시 만들기
        </button>
        <button type="button" className="btn-text self-center" onClick={onRestart}>
          처음부터 다시하기
        </button>
      </div>
    </section>
  );
}

// 참가자에게는 핵심감정 이름 대신 향 조합만 보여준다. 결과지는 이름과 함께 코칭존 상담사에게 바로 간다.
function ScentResult({ name, checks, code, onSaved, onBack, onRetry, onNext }: { name: string; checks: string[]; code: string | null; onSaved: (code: string) => void; onBack: () => void; onRetry: () => void; onNext: () => void }) {
  const top = scoreHeart(new Set(checks))[0];
  const scent = top.ratio > 0 ? SCENTS[top.type.name] : null;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/heart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, checks }) });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.code) throw new Error(j?.error ?? "결과를 보내지 못했어요.");
      onSaved(j.code);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 결과가 나오면 바로 코칭존으로 보낸다 (같은 응답은 한 번만 — 개발 모드 이중 실행 대비)
  const sent = useRef("");
  useEffect(() => {
    const sig = checks.join("\n");
    if (!scent || code || sent.current === sig) return;
    sent.current = sig;
    setTimeout(send, 0);
  });

  return (
    <Split
      left={
        <>
          <BackButton onClick={onBack} />
          {scent ? (
            <>
              <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">지금 마음에 어울리는 향이에요.</h1>
              <ol className="mt-8 flex flex-col gap-3">
                {(
                  [
                    ["탑", "처음 스치는 향", scent.top],
                    ["미들", "마음을 감싸는 향", scent.middle],
                    ["베이스", "오래 남는 향", scent.base],
                  ] as const
                ).map(([n, d, note]) => (
                  <li key={n} className="flex items-center gap-5 rounded-[2px] border border-line bg-paper px-6 py-4">
                    <span className="w-16 shrink-0 text-sage-deep">
                      {n}
                      <span className="block text-xs text-mute">{d}</span>
                    </span>
                    <span>
                      <span className="block font-serif text-2xl font-bold">{note}</span>
                      <span className="text-mute">{NOTES[note]}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Note>향 조합은 체험을 위한 참고예요. 시향해 보고 마음에 드는 쪽으로 바꿔도 좋아요.</Note>
            </>
          ) : (
            <>
              <h1 className="mt-4 display text-[clamp(2rem,4.4vw,3.2rem)]">고른 문장이 없어서 향을 추천하지 못했어요.</h1>
              <p className="mt-5 text-xl leading-relaxed text-mute">조금이라도 닮았다고 느끼는 문장을 하나 이상 골라 주세요.</p>
            </>
          )}
        </>
      }
      right={
        <div className="flex flex-col gap-3">
          {scent && (
            <div className="mb-4 rounded-[2px] bg-cream/70 p-5" role="status">
              {code ? (
                <>
                  <p className="text-xl">{name}님, 체험을 마치면 코칭존으로 와 주세요.</p>
                  <p className="mt-2 text-lg text-mute">상담사에게 이름과 이 번호를 알려 주세요.</p>
                  <p className="display mt-3 text-6xl tracking-[0.2em]">{code}</p>
                </>
              ) : err ? (
                <>
                  <p className="text-lg text-apricot-deep">{err} 가까운 스태프에게 알려 주세요.</p>
                  <button type="button" className="btn-soft mt-3 w-full" disabled={busy} onClick={send}>
                    다시 보내기
                  </button>
                </>
              ) : (
                <p className="text-lg text-mute">코칭존으로 결과를 보내고 있어요…</p>
              )}
            </div>
          )}
          {/* 체크리스트는 필수 — 하나도 고르지 않았으면 다시 체크해야 넘어간다 */}
          {scent && (
            <button type="button" className="btn-main w-full" onClick={onNext}>
              그림 일기 만들기
            </button>
          )}
          <button type="button" className={scent ? "btn-text self-center" : "btn-main w-full"} onClick={onRetry}>
            처음부터 다시 체크하기
          </button>
        </div>
      }
    />
  );
}

function Segmented<T extends string>({ label, options, value, onChange, cols }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void; cols: number }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p className="mb-2 text-base text-mute">{label}</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map(([id, name]) => (
          <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)} className={`min-h-12 rounded-[2px] border px-2 text-base ${value === id ? "border-ink bg-ink text-paper" : "border-ink/30 bg-transparent active:bg-ink/5"}`}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dialog({ title, body, confirm, cancel, autoConfirmMs, onConfirm, onCancel }: { title: string; body: string; confirm: string; cancel: string; autoConfirmMs?: number; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef(onConfirm);
  useEffect(() => {
    confirmRef.current = onConfirm;
  });
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
    if (!autoConfirmMs) return;
    const t = setTimeout(() => confirmRef.current(), autoConfirmMs);
    return () => clearTimeout(t);
  }, [autoConfirmMs]);
  return (
    <dialog ref={ref} onCancel={onCancel} className="m-auto w-[min(92vw,30rem)] rounded-[2px] bg-paper p-8 text-brown backdrop:bg-brown/40">
      <h2 className="display text-2xl">{title}</h2>
      <p className="mt-3 text-lg leading-relaxed text-mute">{body}</p>
      <div className="mt-8 flex flex-col gap-3">
        <button type="button" className="btn-main w-full" onClick={onConfirm}>
          {confirm}
        </button>
        <button type="button" className="btn-soft w-full" onClick={onCancel} autoFocus>
          {cancel}
        </button>
      </div>
    </dialog>
  );
}

// 브랜드 상징: 흩어진 종이 조각들
function Pieces({ spinning = false }: { spinning?: boolean }) {
  const pieces = [
    ["#f2c4a7", "-6deg", "10%", "8%"],
    ["#a9b79a", "8deg", "48%", "2%"],
    ["#f3ead9", "-3deg", "28%", "40%"],
    ["#e4b98f", "12deg", "62%", "44%"],
  ];
  return (
    <div aria-hidden className={`relative mx-auto aspect-[5/3] w-full max-w-md ${spinning ? "motion-safe:animate-pulse" : ""}`}>
      {pieces.map(([c, r, l, t], i) => (
        <span key={i} className="absolute h-[46%] w-[34%] rounded-2xl shadow-[0_10px_20px_-14px_rgba(91,70,54,.6)]" style={{ background: c, rotate: r, left: l, top: t }} />
      ))}
    </div>
  );
}

function Privacy({ ai }: { ai: boolean }) {
  return (
    <details className="text-center text-base leading-relaxed text-mute">
      <summary className="btn-text cursor-pointer">개인정보와 이용 안내</summary>
      <div className="mt-2 bg-paper p-5 text-left">
        <p>· 연락처는 묻지 않아요. 적은 기억과 그림 일기는 이 기기에도, 서버에도 저장되지 않아요.</p>
        <p>· 적은 이름과 핵심감정 체크 결과는 코칭존 상담을 위해 저장되고, 정해진 기간 뒤 지워져요.</p>
        <p>· 마지막에 &lsquo;처음부터 다시하기&rsquo;를 누르면 모든 내용이 지워져요.</p>
        {ai && <p>· 그림 일기 문장을 만들 때 적은 기억과 감정이 AI 서비스(Anthropic)로 전송돼요. 이 앱은 따로 보관하지 않으며, 전송된 내용은 제공사의 정책에 따라 처리돼요.</p>}
        <p>· 이 체험은 심리 검사나 진단이 아니에요.</p>
      </div>
    </details>
  );
}
