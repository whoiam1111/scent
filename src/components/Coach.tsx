"use client";

import { useCallback, useEffect, useState } from "react";
import { AREAS, scoreHeart } from "@/lib/heart";
import type { HeartRow } from "@/lib/heartStore";
import { SCENTS } from "@/lib/scent";

// 코칭존 상담사 화면: 참가자가 알려 준 상담 번호로 결과지를 찾는다.
export default function Coach() {
  const [rows, setRows] = useState<HeartRow[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/coach", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setRows(j.rows);
      setError("");
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
    if (!confirm(`상담 번호 ${r.code} 결과를 지울까요? 되돌릴 수 없어요.`)) return;
    await fetch(`/api/coach?id=${r.id}`, { method: "DELETE" });
    setOpenId(null);
    load();
  };

  const shown = rows.filter((r) => r.code.includes(q.trim()) || r.name.includes(q.trim()));
  const open = rows.find((r) => r.id === openId) ?? null;

  // 목록 → 줄을 누르면 상세 결과지, '목록으로'로 돌아온다
  if (open)
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10">
        <button type="button" onClick={() => setOpenId(null)} className="-ml-2 inline-flex min-h-12 items-center gap-2 px-2 text-lg text-mute active:text-brown">
          <span aria-hidden>←</span> 목록으로
        </button>
        <div className="mt-4">
          <Sheet row={open} onDelete={() => remove(open)} />
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold">코칭존 · 핵심감정 결과지</h1>
        <button type="button" className="btn-text" onClick={load}>
          새로고침
        </button>
      </header>
      {error && <p className="mt-4 text-apricot-deep">{error}</p>}

      <label htmlFor="q" className="sr-only">
        이름 또는 상담 번호로 찾기
      </label>
      <input id="q" maxLength={20} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 또는 상담 번호로 찾기" className="field mt-6 max-w-md" />
      <p className="mt-3 text-mute">
        {shown.length}명{q.trim() && ` (전체 ${rows.length}명)`} · 15초마다 자동으로 새로고침돼요
      </p>

      <table className="mt-4 w-full border-collapse text-left text-lg">
        <thead className="border-b-2 border-brown text-base text-mute">
          <tr>
            <th className="py-3 font-normal">이름</th>
            <th className="py-3 font-normal">번호</th>
            <th className="py-3 font-normal">가장 높은 핵심감정</th>
            <th className="py-3 text-right font-normal">시각</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const sc = scoreHeart(new Set(r.checks));
            const top = sc.filter((x) => x.ratio === sc[0].ratio && x.ratio > 0);
            return (
              <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-line active:bg-cream">
                <td className="py-4">
                  {/* 키보드·스크린리더용 진입점 */}
                  <button type="button" onClick={() => setOpenId(r.id)} className="font-bold underline-offset-4 hover:underline">
                    {r.name}
                  </button>
                </td>
                <td className="py-4 tracking-widest text-mute">{r.code}</td>
                <td className="py-4">{top.map((x) => x.type.name).join(" · ") || "-"}</td>
                <td className="py-4 text-right text-mute">{new Date(r.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {shown.length === 0 && <p className="mt-8 text-center text-lg text-mute">{rows.length ? "찾는 결과가 없어요." : "아직 들어온 결과가 없어요."}</p>}
    </div>
  );
}

function Sheet({ row, onDelete }: { row: HeartRow; onDelete: () => void }) {
  const scores = scoreHeart(new Set(row.checks));
  const top = scores.filter((x) => x.ratio === scores[0].ratio);
  return (
    <article className="rounded-[2px] border border-line bg-paper p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-lg text-mute">
          <b className="font-serif text-2xl text-brown">{row.name}</b> · 상담 번호 <b className="text-brown tracking-widest">{row.code}</b> · {new Date(row.created_at).toLocaleString("ko-KR")}
        </p>
        <button type="button" className="btn-text" onClick={onDelete}>
          결과 지우기
        </button>
      </div>
      <h2 className="mt-4 font-serif text-4xl font-bold">{top.map((x) => x.type.name).join(" · ")}</h2>
      <p className="mt-2 text-mute">체크 {row.checks.length}개 · 비율 = 고른 문항 / 그 유형 전체 문항</p>

      <ol className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {scores.map((x) => (
          <li key={x.type.id}>
            <div className="flex justify-between">
              <span className={x.ratio === scores[0].ratio ? "font-bold" : ""}>{x.type.name}</span>
              <span className="text-mute">
                {x.picked.length}/{x.total} · {Math.round(x.ratio * 100)}%
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-line">
              <div className="h-2.5 rounded-full bg-apricot-deep" style={{ width: `${Math.round(x.ratio * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>

      {scores.slice(0, 3).map((x) => (
        <section key={x.type.id} className="mt-8 border-t border-line pt-6">
          <h3 className="font-serif text-2xl font-bold">{x.type.name}</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {AREAS.map((a) => (
              <div key={a}>
                <dt className="text-sm text-mute">{a}</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {x.type.items[a].map((it) => (
                    <span key={it} className={`rounded-full px-3 py-1 text-sm ${x.picked.includes(it) ? "bg-brown text-ivory" : "bg-cream text-mute"}`}>
                      {it}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-mute">
            추천 향: {(["top", "middle", "base"] as const).map((n) => SCENTS[x.type.name][n]).join(" · ")}
          </p>
        </section>
      ))}
    </article>
  );
}
