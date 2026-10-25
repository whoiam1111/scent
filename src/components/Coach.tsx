"use client";

import { useCallback, useEffect, useState } from "react";
import { AREAS, scoreHeart, type HeartScore } from "@/lib/heart";
import type { HeartRow } from "@/lib/heartStore";
import { SCENTS } from "@/lib/scent";

// 코칭존 상담사 화면: 참가자가 알려 준 이름으로 찾는다. 목록에서 누르면 결과지로 넘어가고 '목록'으로 돌아온다.

type Filter = "all" | "keyring";
const time = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
const topOf = (sc: HeartScore[]) => sc.filter((x) => x.ratio === sc[0].ratio && x.ratio > 0);
// 한글 라벨: 영문 대문자용 .label보다 자간을 좁힌다
const LABEL = "font-label text-xs tracking-[0.06em] text-mute";

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
          <Sheet row={open} onBack={() => setOpenId(null)} onDelete={() => remove(open)} />
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
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className="grid w-full grid-cols-[minmax(6rem,12rem)_1fr_auto_auto] items-center gap-x-5 border-b border-line bg-paper px-5 py-4 text-left transition-colors hover:bg-cream/60 max-sm:grid-cols-[1fr_auto]"
                    >
                      <span className="truncate text-lg font-bold">{r.name}</span>
                      <span className="truncate text-mute max-sm:col-span-2 max-sm:row-start-2">{top.map((x) => x.type.name).join(" · ") || "체크 없음"}</span>
                      <span className={`px-2 font-label text-xs tracking-[0.08em] max-sm:hidden ${r.keyring_at ? "bg-apricot text-gold" : "invisible"}`}>키링</span>
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

function Sheet({ row, onBack, onDelete }: { row: HeartRow; onBack: () => void; onDelete: () => void }) {
  const scores = scoreHeart(new Set(row.checks));
  const top = scores.filter((x) => x.ratio === scores[0].ratio);
  const max = scores[0].ratio || 1;
  const img = `/api/coach/keyring?id=${row.id}`;

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
