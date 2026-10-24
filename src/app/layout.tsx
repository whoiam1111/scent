import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost, Mrs_Saint_Delafield, Nanum_Pen_Script, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// 본문·제목: 가는 명조
const serif = Noto_Serif_KR({ variable: "--font-noto-serif", weight: ["300", "400", "500", "700"], subsets: ["latin"], preload: false });
// 영문 장식: 이탤릭 세리프
const display = Cormorant_Garamond({ variable: "--font-cormorant", weight: ["400", "500"], style: ["normal", "italic"], subsets: ["latin"] });
// 대문자 라벨·버튼
const label = Jost({ variable: "--font-jost", weight: ["300", "400", "500"], subsets: ["latin"] });
const script = Mrs_Saint_Delafield({ variable: "--font-script-src", weight: "400", subsets: ["latin"] });
// 그림일기장의 손글씨·고딕 선택지
const pen = Nanum_Pen_Script({ variable: "--font-pen-src", weight: "400", subsets: ["latin"], preload: false });
const sans = Noto_Sans_KR({ variable: "--font-noto", weight: ["400", "500", "700"], subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "마음의 조각 — 기억 그림 일기",
  description: "기억에 남은 순간과 그때의 감정으로 나만의 그림 일기를 만드는 팝업 체험",
};

// 태블릿 키오스크: 확대 없이 화면에 맞춘다
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#2b2926" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${serif.variable} ${display.variable} ${label.variable} ${script.variable} ${sans.variable} ${pen.variable}`}>
      <body>{children}</body>
    </html>
  );
}
