// 첫 화면 가운데의 향수병: 검은 면과 회베이지 면의 경계에 걸쳐 선다 (향을 만드는 체험의 상징)
export function Bottle() {
  return (
    <svg viewBox="0 0 200 260" className="h-[clamp(11rem,26vh,16rem)] w-auto drop-shadow-[0_24px_24px_rgba(13,12,11,.25)]" aria-hidden>
      <defs>
        <linearGradient id="cap" x1="0" x2="1">
          <stop offset="0" stopColor="#8b7651" />
          <stop offset=".45" stopColor="#d9c49a" />
          <stop offset="1" stopColor="#8b7651" />
        </linearGradient>
        <linearGradient id="juice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1bf9f" stopOpacity=".35" />
          <stop offset="1" stopColor="#d9a074" stopOpacity=".7" />
        </linearGradient>
      </defs>
      <rect x="68" y="6" width="64" height="54" rx="3" fill="url(#cap)" />
      <rect x="86" y="60" width="28" height="18" fill="#8b7651" />
      <rect x="24" y="78" width="152" height="172" rx="12" fill="#f6f2ea" fillOpacity=".92" stroke="#8b7651" strokeWidth="2" />
      <rect x="32" y="128" width="136" height="114" rx="7" fill="url(#juice)" />
      <rect x="58" y="150" width="84" height="52" fill="#f6f2ea" stroke="#8b7651" />
      <text x="100" y="181" textAnchor="middle" fontSize="12.5" fill="#0d0c0b" style={{ fontFamily: "var(--font-display)" }}>
        마음의 조각
      </text>
      <path d="M40 92 V232" stroke="#fff" strokeOpacity=".75" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
