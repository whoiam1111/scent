"use client";

import { useCallback, useEffect, useState } from "react";
import { AREAS, scoreHeart, type HeartScore } from "@/lib/heart";
import type { HeartRow, Program } from "@/lib/heartStore";
import { NOTES, SCENTS } from "@/lib/scent";

// 코칭존 상담사 화면: 참가자가 알려 준 이름으로 찾는다. 목록에서 누르면 결과지로 넘어가고 '목록'으로 돌아온다.

type Filter = "all" | "keyring";
const time = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
const topOf = (sc: HeartScore[]) => sc.filter((x) => x.ratio === sc[0].ratio && x.ratio > 0);
// 한글 라벨: 영문 대문자용 .label보다 자간을 좁힌다
const LABEL = "font-label text-xs tracking-[0.06em] text-mute";
// 참가자에게 보여 준 향. 저장된 것이 없으면(예전 결과·scent 칸 없는 DB) 같은 규칙으로 다시 계산한다
const scentOf = (r: HeartRow) => {
  if (r.scent) return r.scent;
  const top = scoreHeart(new Set(r.checks))[0];
  return top.ratio > 0 ? { type: top.type.name, ...SCENTS[top.type.name] } : null;
};

export default function Coach() {
  const [rows, setRows] = useState<HeartRow[]>([]);
  const [error, setError] = useState("");
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/coach", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setRows(j.rows);
      setError("");
      setSyncedAt(new Date());
    } catch (e) {
      setError((e as Error).message || "목록을 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const remove = async (r: HeartRow) => {
    if (!confirm(`${r.name}님의 결과와 키링 이미지를 지울까요? 되돌릴 수 없어요.`)) return;
    await fetch(`/api/coach?id=${r.id}`, { method: "DELETE" });
    setOpenId(null);
    load();
  };

  const term = q.trim();
  const shown = rows.filter((r) => (filter === "all" || r.keyring_at) && r.name.includes(term));
  const open = rows.find((r) => r.id === openId) ?? null;

  // 요약 숫자
  // 렌더 중에 new Date()를 부르면 미리 렌더링이 막혀서, 마지막으로 불러온 시각의 날짜로 센다
  const today = syncedAt?.toDateString();
  const todayCount = rows.filter((r) => new Date(r.created_at).toDateString() === today).length;
  const keyringCount = rows.filter((r) => r.keyring_at).length;
  const tally = new Map<string, number>();
  for (const r of rows) for (const x of topOf(scoreHeart(new Set(r.checks)))) tally.set(x.type.name, (tally.get(x.type.name) ?? 0) + 1);
  const common = [...tally].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="bg-ink text-ivory print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <p className="flex items-baseline gap-3">
            <span className="display text-xl whitespace-nowrap">마음의 조각</span>
            <span className="label !text-ivory/60 max-sm:hidden">Coaching Console</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 font-label text-xs tracking-[0.12em] text-ivory/70" role="status">
              <span className={`size-2 rounded-full ${error ? "bg-gold-light" : "bg-[#9fbf8f]"}`} aria-hidden />
              <span className="max-sm:sr-only">{error ? "연결 끊김" : syncedAt ? `동기화 ${syncedAt.toLocaleTimeString("ko-KR")}` : "불러오는 중"}</span>
            </span>
            <button type="button" className="btn-text whitespace-nowrap !text-ivory" onClick={load}>
              새로고침
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        {error && <p className="mb-4 border-l-2 border-gold py-1 pl-4 text-gold print:hidden">{error} · 15초 뒤 다시 시도해요.</p>}

        {open ? (
          <Sheet row={open} onBack={() => setOpenId(null)} onDelete={() => remove(open)} onSaved={load} />
        ) : (
          <>
        <dl className="grid grid-cols-2 border border-line bg-paper sm:grid-cols-4 print:hidden">
          <Stat label="오늘 참여" value={todayCount} unit="명" />
          <Stat label="보관 중" value={rows.length} unit="명" />
          <Stat label="키링 이미지" value={keyringCount} unit="건" />
          <Stat label="가장 많은 핵심감정" text={common ? `${common[0]} · ${common[1]}명` : "-"} />
        </dl>

        <section aria-label="참가자 목록" className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="q" className="sr-only">
              이름으로 찾기
            </label>
            <input id="q" maxLength={20} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름으로 찾기" className="field max-w-sm !py-3 !text-lg" inputMode="search" autoComplete="off" />
            <div role="radiogroup" aria-label="보기" className="grid w-72 grid-cols-2 border border-line">
              {(
                [
                  ["all", `전체 ${rows.length}`],
                  ["keyring", `키링 있음 ${keyringCount}`],
                ] as [Filter, string][]
              ).map(([id, name]) => (
                <button key={id} type="button" role="radio" aria-checked={filter === id} onClick={() => setFilter(id)} className={`min-h-11 font-label text-sm tracking-[0.08em] ${filter === id ? "bg-ink text-ivory" : "bg-paper text-mute"}`}>
                  {name}
                </button>
              ))}
            </div>

          </div>
            <ul className="mt-4 border-t border-line">
              {shown.map((r) => {
                const top = topOf(scoreHeart(new Set(r.checks)));
                const sc = scentOf(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className="grid w-full grid-cols-[minmax(6rem,12rem)_1fr_auto_auto] items-center gap-x-5 border-b border-line bg-paper px-5 py-4 text-left transition-colors hover:bg-cream/60 max-sm:grid-cols-[1fr_auto]"
                    >
                      <span className="truncate text-lg font-bold">{r.name}</span>
                      <span className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                        <span className="block truncate text-mute">{top.map((x) => x.type.name).join(" · ") || "체크 없음"}</span>
                        {sc && <span className="block truncate text-sm">향 {sc.top} · {sc.middle} · {sc.base}</span>}
                      </span>
                      <span className="flex gap-1.5 font-label text-xs tracking-[0.08em] max-sm:hidden">
                        <span className={`px-2 ${r.followup ? "bg-ink text-ivory" : "invisible"}`}>{r.followup?.program === "reading" ? "독서" : "코칭"} 신청</span>
                        <span className={`px-2 ${r.keyring_at ? "bg-apricot text-gold" : "invisible"}`}>키링</span>
                      </span>
                      <span className="flex items-center gap-3 font-label text-sm text-mute tabular-nums">
                        {time(r.created_at)}
                        <span aria-hidden>›</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {shown.length === 0 && <p className="py-10 text-center text-mute">{rows.length ? "찾는 결과가 없어요." : "아직 들어온 결과가 없어요."}</p>}
        </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, text }: { label: string; value?: number; unit?: string; text?: string }) {
  return (
    <div className="border-line px-5 py-4 not-last:border-r max-sm:nth-2:border-r-0 max-sm:nth-[-n+2]:border-b">
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-1">
        {text ? (
          <span className="block truncate text-lg font-bold">{text}</span>
        ) : (
          <>
            <span className="disp-en text-4xl leading-none tabular-nums">{value}</span>
            <span className="ml-1 text-sm text-mute">{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}

function Sheet({ row, onBack, onDelete, onSaved }: { row: HeartRow; onBack: () => void; onDelete: () => void; onSaved: () => void }) {
  const scores = scoreHeart(new Set(row.checks));
  const top = scores.filter((x) => x.ratio === scores[0].ratio);
  const max = scores[0].ratio || 1;
  const img = `/api/coach/keyring?id=${row.id}`;
  const sc = scentOf(row);

  return (
    <article className="border border-line bg-paper print:border-0">
      {/* 결과지 머리: 번호·이름·시각과 할 일 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 print:px-0">
        <button type="button" onClick={onBack} className="btn-text -ml-2 print:hidden">
          ← 목록
        </button>
        <p className="mr-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-2xl font-bold">{row.name}</span>
          <span className="font-label text-sm text-mute">{new Date(row.created_at).toLocaleString("ko-KR")}</span>
        </p>
        <div className="flex gap-2 print:hidden">
          <button type="button" className="btn-soft min-h-11 px-4 text-sm" onClick={() => window.print()}>
            인쇄
          </button>
          <button type="button" className="btn-soft min-h-11 border-gold px-4 text-sm text-gold hover:border-gold hover:bg-gold" onClick={onDelete}>
            삭제
          </button>
        </div>
      </div>

      <div className="grid gap-px bg-line xl:grid-cols-[1fr_17rem]">
        <div className="bg-paper px-6 py-6 print:px-0">
          {/* 요약 */}
          <p className={LABEL}>핵심감정</p>
          <h2 className="display mt-2 text-[clamp(2rem,3.6vw,2.8rem)] font-normal">{top.map((x) => x.type.name).join(" · ")}</h2>
          <p className="mt-1 text-mute">
            체크 {row.checks.length}개 · {Math.round(scores[0].ratio * 100)}% ({scores[0].picked.length}/{scores[0].total}문항)
          </p>

          {/* 조향 레시피: 참가자 화면에 보여 준 그대로 */}
          {sc && (
            <section className="mt-6 border border-ink px-5 py-4 break-inside-avoid">
              <h3 className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold">조향 레시피</span>
                <span className={LABEL}>{sc.type} 기준 · 참가자에게 안내한 향</span>
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["탑", sc.top],
                    ["미들", sc.middle],
                    ["베이스", sc.base],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="border-t border-line pt-2">
                    <dt className={LABEL}>{k}</dt>
                    <dd className="mt-1 text-xl font-bold">{v}</dd>
                    {NOTES[v] && <dd className="text-sm text-mute">{NOTES[v]}</dd>}
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* 유형별 분포: 가장 높은 유형을 막대 끝으로 맞춰 차이가 잘 보이게 */}
          <h3 className={`${LABEL} mt-8 border-b border-line pb-2`}>유형별 분포</h3>
          <ol className="mt-3 flex flex-col gap-2">
            {scores.filter((x) => x.ratio > 0).map((x, i) => (
              <li key={x.type.id} className="grid grid-cols-[1.5rem_7rem_1fr_5.5rem] items-center gap-3 text-base">
                <span className="disp-en text-lg text-mute tabular-nums">{i + 1}</span>
                <span className={`truncate ${x.ratio === scores[0].ratio ? "font-bold" : ""}`}>{x.type.name}</span>
                <span className="h-2 bg-line">
                  <span className="block h-2" style={{ width: `${(x.ratio / max) * 100}%`, background: x.ratio === scores[0].ratio ? "var(--color-gold)" : "var(--color-mute)" }} />
                </span>
                <span className="text-right font-label text-sm text-mute tabular-nums">
                  {Math.round(x.ratio * 100)}% · {x.picked.length}/{x.total}
                </span>
              </li>
            ))}
          </ol>
          {scores.some((x) => x.ratio === 0) && (
            <p className="mt-3 text-sm text-mute">
              0% · {scores.filter((x) => x.ratio === 0).map((x) => x.type.name).join(", ")}
            </p>
          )}

          {/* 상위 3 유형: 영역별로 고른 문항과 고르지 않은 문항 */}
          {scores.slice(0, 3).filter((x) => x.ratio > 0).map((x, i) => (
            <section key={x.type.id} className="mt-8 border-t border-line pt-5 break-inside-avoid">
              <h3 className="flex items-baseline gap-3">
                <span className="disp-en text-2xl text-gold">0{i + 1}</span>
                <span className="text-xl font-bold">{x.type.name}</span>
                <span className="font-label text-sm text-mute">{Math.round(x.ratio * 100)}%</span>
              </h3>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                {AREAS.map((a) => (
                  <div key={a}>
                    <dt className={LABEL}>{a}</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {x.type.items[a].map((it) => (
                        <span key={it} className={`border px-2.5 py-0.5 text-sm ${x.picked.includes(it) ? "border-ink bg-ink text-ivory" : "border-line text-mute"}`}>
                          {it}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm">
                <span className={`${LABEL} mr-2`}>추천 향</span>
                {(["top", "middle", "base"] as const).map((n) => SCENTS[x.type.name][n]).join(" · ")}
              </p>
            </section>
          ))}

          <FollowUpForm key={row.id} row={row} type={top.map((x) => x.type.name).join(" · ")} scent={sc ? `${sc.top} · ${sc.middle} · ${sc.base}` : null} onSaved={onSaved} />
        </div>

        {/* 키링 */}
        <aside className="bg-paper px-6 py-6 print:hidden">
          <p className={LABEL}>키링 이미지</p>
          {row.keyring_at ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- 참가자가 저장한 키링 PNG */}
              <img src={img} alt={`${row.name}님의 키링 이미지`} className="mt-3 w-full border border-line" />
              <p className="mt-2 font-label text-xs text-mute">저장 {time(row.keyring_at)}</p>
              <a className="btn-main mt-3 min-h-12 w-full px-4 text-sm" href={img} download={`키링-${row.name}-${time(row.created_at).replace(/\D/g, "")}.png`}>
                PNG 내려받기
              </a>
            </>
          ) : (
            <p className="mt-3 border border-dashed border-line px-4 py-8 text-center text-sm text-mute">참가자가 아직 키링 이미지를 저장하지 않았어요.</p>
          )}
        </aside>
      </div>
    </article>
  );
}

// 후속지: 툴즈 6회 자기이해 코칭 신청. 코칭존 패드에서 참가자가 직접 희망 일정을 달력에서 골라 신청한다
const MAX_SLOTS = 3;
const KITS = [
  ["6도형 검사", "심층 성향 파악"],
  ["인생그래프", "삶의 궤적 시각화"],
  ["성격유형 검사", "성격 유형 분석"],
  ["성격유형 검사(신)", "성격 유형 분석"],
  ["애착유형 검사", "대인관계 패턴 및 정서적 유대 분석"],
  ["핵심감정 검사", "내면 감정 파악"],
  ["회복탄력성 검사", "자기조절·대인관계·긍정성 분석"],
] as const;
const TIMES = Array.from({ length: 21 }, (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`); // 10:00~20:00
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = "일월화수목금토";
const dayText = (date: string) => {
  const d = new Date(`${date}T00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
};

function FollowUpForm({ row, type, scent, onSaved }: { row: HeartRow; type: string; scent: string | null; onSaved: () => void }) {
  const saved = row.followup;
  const [slots, setSlots] = useState(() => (saved?.slots ?? []).map((s) => ({ date: s.slice(0, 10), time: s.slice(11) })));
  const [program, setProgram] = useState<Program>(saved?.program ?? "coaching");
  const [phone, setPhone] = useState(saved?.phone ?? "");
  const [agreed, setAgreed] = useState<boolean | null>(saved ? true : null);
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({});

  const toggle = (date: string) =>
    setSlots((ss) => (ss.some((s) => s.date === date) ? ss.filter((s) => s.date !== date) : ss.length < MAX_SLOTS ? [...ss, { date, time: "" }].sort((a, b) => a.date.localeCompare(b.date)) : ss));
  const phoneOk = /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone.trim());
  const slotsOk = program === "reading" || (slots.length > 0 && slots.every((s) => s.time));
  const ready = slotsOk && phoneOk && agreed === true;

  const submit = async () => {
    setState({ busy: true });
    try {
      const res = await fetch(`/api/coach/followup?id=${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program, phone: phone.trim(), slots: slots.map((s) => `${s.date}T${s.time}`), agreed: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error);
      setState({ done: true });
      onSaved();
    } catch (e) {
      setState({ error: (e as Error).message || "신청을 저장하지 못했어요." });
    }
  };

  return (
    <section className="mt-10 border-t-2 border-ink pt-6 print:break-before-page print:mt-0 print:border-t-0">
      <p className={LABEL}>툴즈 6회 자기이해 코칭 · 후속 프로그램 신청</p>

      {/* 같은 10, 다른 공식 */}
      <div className="mt-4 border border-line bg-ivory px-5 py-5 break-inside-avoid">
        <p className="text-lg">같은 10이라는 답을 얻더라도</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["누군가는", "5 + 5"],
            ["누군가는", "2 × 5"],
            ["누군가는", "20 ÷ 2"],
          ].map(([who, f]) => (
            <li key={f} className="border-t border-line pt-2">
              <span className="text-sm text-mute">{who}</span>
              <span className="disp-en ml-2 text-2xl tabular-nums">{f}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-lg">로 답을 찾습니다.</p>
      </div>

      <h3 className="display mt-6 text-[clamp(1.6rem,3vw,2.2rem)] font-normal">정답을 아는 것에서, 나만의 답을 만드는 것으로</h3>
      <div className="mt-4 flex flex-col gap-3 text-lg leading-relaxed">
        <p>
          AI는 우리에게 정답을 빠르게 알려줄 수 있지만, 정작 내가 어떤 경험과 감정, 생각을 거쳐 지금의 내가 되었는지, 그리고 앞으로 어떤 방식으로 살아가야 할지는 대신 결정해 줄
          수 없어요.
        </p>
        <p>
          오늘 검사에서 나온 핵심감정{type ? <b>({type})</b> : null}도 마찬가지예요. 단순히 내가 어떤 감정을 가지고 있다는 결과를 아는 것에서 끝나는 게 아니라,
        </p>
        <ul className="ml-5 list-disc">
          <li>나는 왜 이런 감정을 자주 느끼는지</li>
          <li>이런 감정이 나의 선택과 관계에 어떤 영향을 주는지</li>
          <li>내가 진정으로 원하는 삶은 무엇인지</li>
        </ul>
        <p>이런 것들을 알아가는 과정이 필요하거든요.</p>
        <p>
          그래서 툴즈에서는 오늘의 체험을 일회성으로 끝내지 않고, <b>6회의 자기이해 코칭 프로그램</b>으로 이어갈 수 있는 기회를 드려요. 오늘은 나를 표현하는 향
          {scent ? `(${scent})` : ""}을 만들었다면, 앞으로의 6회는 나라는 사람을 조금 더 깊이 이해하고, 나만의 삶의 공식을 찾아가는 시간이에요.
        </p>
      </div>

      {/* 오늘 한 것 → 앞으로의 6회 */}
      <ol className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-4 break-inside-avoid">
        {[
          ["STEP 1", "핵심감정 검사", "나의 현재 발견"],
          ["STEP 2", "소중한 추억 찾기", "나의 경험 발견"],
          ["STEP 3", "퍼스널 향수 제작", "나를 감각으로 표현"],
        ].map(([n, t, d]) => (
          <li key={n} className="bg-paper px-4 py-3">
            <span className="font-label text-xs tracking-[0.08em] text-mute">{n} · 오늘 완료</span>
            <span className="mt-1 block font-bold">{t}</span>
            <span className="block text-sm text-mute">{d}</span>
          </li>
        ))}
        <li className="bg-ink px-4 py-3 text-ivory">
          <span className="font-label text-xs tracking-[0.08em] text-ivory/70">STEP 4 · 6회 코칭</span>
          <span className="mt-1 block font-bold">나만의 공식 발견</span>
          <span className="block text-sm text-ivory/70">향으로 표현하는 것을 넘어, 나를 이해하는 과정으로</span>
        </li>
      </ol>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {["핵심감정과 반복되는 행동 패턴 탐색", "나의 생각과 감정의 원인 이해", "나만의 가치관과 삶의 방향 정립"].map((t) => (
          <li key={t} className="border-l-2 border-gold pl-3">
            {t}
          </li>
        ))}
      </ul>

      {/* 6회 동안 쓰는 검사 키트 */}
      <div className="mt-6 break-inside-avoid">
        <p className={LABEL}>6회 동안 함께하는 검사 키트</p>
        <ol className="mt-2 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {KITS.map(([t, d], i) => (
            <li key={t} className="bg-paper px-4 py-3">
              <span className="disp-en text-sm text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="ml-2 font-bold">{t}</span>
              <span className="block text-sm text-mute">{d}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="display mt-8 text-center text-[clamp(1.3rem,2.4vw,1.7rem)] leading-snug font-normal">
        정답을 아는 것에서 끝나지 않고, 나만의 답을 만들어 가는 것.
        <br />
        이번 기회에 나 자신을 알아가는 6번의 시간을 경험해 보시는 건 어떠세요?
      </p>

      {/* 신청: 패드에서 직접 */}
      <div className="mt-8 border border-ink bg-paper px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xl font-bold">후속 프로그램 신청</h3>
          {saved && <span className="bg-ink px-2 py-0.5 font-label text-xs tracking-[0.08em] text-ivory">신청됨 · {new Date(saved.at).toLocaleString("ko-KR")}</span>}
        </div>

        <div role="radiogroup" aria-label="신청할 프로그램" className="mt-4 grid gap-px border border-ink bg-ink sm:grid-cols-2">
          {(
            [
              ["coaching", "6회 자기이해 코칭", "툴즈 · 검사 키트와 함께 나만의 공식 찾기"],
              ["reading", "독서 인문학 강의", "코칭 대신 · 툴즈 × 로고스스튜디오"],
            ] as [Program, string, string][]
          ).map(([id, t, d]) => (
            <button key={id} type="button" role="radio" aria-checked={program === id} onClick={() => setProgram(id)} className={`min-h-16 px-5 py-3 text-left ${program === id ? "bg-ink text-ivory" : "bg-paper"}`}>
              <span className="block text-lg font-bold">{t}</span>
              <span className={`block text-sm ${program === id ? "text-ivory/70" : "text-mute"}`}>{d}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <p className={LABEL}>이름</p>
            <p className="mt-1 border-b border-ink pb-2 text-lg">{row.name}</p>
          </div>
          <div>
            <label htmlFor="fu-phone" className={LABEL}>
              연락처
            </label>
            <input id="fu-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" maxLength={13} placeholder="010-0000-0000" className="field mt-1 !text-lg" />
          </div>
        </div>

        {program === "reading" ? (
          <p className="mt-6 border-l-2 border-gold py-1 pl-4 leading-relaxed">
            툴즈와 로고스스튜디오가 함께하는 <b>독서 인문학 강의</b>예요. 책을 함께 읽고 나누며 나와 삶을 돌아보는 시간이에요. 강의 일정과 내용은 적어 주신 연락처로 안내드려요.
          </p>
        ) : (
          <>
        <p className={`${LABEL} mt-6`}>
          희망 일정 · 달력에서 가능한 날을 {MAX_SLOTS}개까지 누르고 시간을 골라 주세요 ({slots.length}/{MAX_SLOTS})
        </p>
        <div className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Calendar picked={slots.map((s) => s.date)} full={slots.length >= MAX_SLOTS} onToggle={toggle} />
          <ol className="flex flex-col gap-2">
            {slots.map((s, i) => (
              <li key={s.date} className="flex flex-wrap items-center gap-3 border border-line px-4 py-3">
                <span className="disp-en text-xl text-gold">{i + 1}</span>
                <span className="min-w-36 text-lg font-bold">{dayText(s.date)}</span>
                <label className="sr-only" htmlFor={`fu-t-${s.date}`}>
                  {dayText(s.date)} 시간
                </label>
                <select
                  id={`fu-t-${s.date}`}
                  value={s.time}
                  onChange={(e) => setSlots((ss) => ss.map((x) => (x.date === s.date ? { ...x, time: e.target.value } : x)))}
                  className={`field !w-auto min-h-11 !py-2 !text-lg ${s.time ? "" : "!border-gold"}`}
                >
                  <option value="">시간 선택</option>
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-text ml-auto print:hidden" onClick={() => toggle(s.date)}>
                  빼기
                </button>
              </li>
            ))}
            {slots.length === 0 && <li className="border border-dashed border-line px-4 py-6 text-center text-mute">아직 고른 날이 없어요.</li>}
          </ol>
        </div>
          </>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <p className="font-bold">신청 시 주의사항</p>
          <p className="mt-1 leading-relaxed">
            프로그램은 신청 인원에 맞춰 저희가 비용을 미리 지불하고 준비해요. 예약한 일정에 꼭 참석해 주시고, 부득이한 사정이 생기면 미리 알려 주세요. 함께하는 시간을 위해
            책임감 있게 참여해 주시면 감사하겠습니다.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-lg">
            <span id="fu-agree">위 신청 시 주의사항 안내를 받았습니다.</span>
            <div role="radiogroup" aria-labelledby="fu-agree" className="grid w-40 grid-cols-2 border border-line">
              {(["Y", "N"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={agreed === (v === "Y")}
                  onClick={() => setAgreed(v === "Y")}
                  className={`min-h-12 font-bold ${agreed === (v === "Y") ? "bg-ink text-ivory" : "bg-paper text-mute"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {agreed === false && <p className="mt-2 text-gold">주의사항에 동의해야 신청할 수 있어요.</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-4 print:hidden">
          {state.error && <p className="mr-auto text-gold">{state.error}</p>}
          {state.done && <p className="mr-auto">✓ 신청이 저장됐어요.</p>}
          {!ready && !state.error && !state.done && (
            <p className="mr-auto text-sm text-mute">{!phoneOk ? "연락처를 적어 주세요." : !slotsOk ? (slots.length === 0 ? "희망 날짜를 골라 주세요." : "고른 날마다 시간을 골라 주세요.") : "주의사항 안내에 Y를 눌러 주세요."}</p>
          )}
          <button type="button" className="btn-main min-h-14 px-8 text-lg" disabled={!ready || state.busy} onClick={submit}>
            {state.busy ? "저장 중…" : saved ? "신청 내용 고치기" : "신청하기"}
          </button>
        </div>
      </div>
    </section>
  );
}

// 패드에서 손가락으로 누르기 좋은 달력. 오늘 이전은 막고, 다 고르면 고른 날만 다시 눌러 뺄 수 있다
function Calendar({ picked, full, onToggle }: { picked: string[]; full: boolean; onToggle: (date: string) => void }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = ymd(new Date());
  const y = month.getFullYear();
  const m = month.getMonth();
  const cells = [...Array<null>(month.getDay()).fill(null), ...Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => ymd(new Date(y, m, i + 1)))];
  const isThisMonth = ymd(month).slice(0, 7) === today.slice(0, 7);

  return (
    <div className="border border-line print:hidden">
      <div className="flex items-center justify-between border-b border-line px-2">
        <button type="button" className="btn-text min-h-12 px-4 disabled:opacity-30" disabled={isThisMonth} onClick={() => setMonth(new Date(y, m - 1, 1))} aria-label="이전 달">
          ‹
        </button>
        <span className="text-lg font-bold">
          {y}년 {m + 1}월
        </span>
        <button type="button" className="btn-text min-h-12 px-4" onClick={() => setMonth(new Date(y, m + 1, 1))} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {[...WEEK].map((w, i) => (
          <span key={w} className={`py-1.5 font-label text-xs ${i === 0 ? "text-gold" : "text-mute"}`}>
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const on = picked.includes(d);
          const off = d < today || (full && !on);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              aria-label={dayText(d)}
              disabled={off}
              onClick={() => onToggle(d)}
              className={`m-0.5 min-h-12 text-lg tabular-nums transition-colors ${on ? "bg-ink font-bold text-ivory" : off ? "text-line" : "hover:bg-cream/60"} ${d === today && !on ? "underline underline-offset-4" : ""}`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

