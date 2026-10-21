import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Nanum_Pen_Script, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const serif = Gowun_Batang({ variable: "--font-gowun", weight: ["400", "700"], subsets: ["latin"], preload: false });
// 그림일기장·폴라로이드의 손글씨
const pen = Nanum_Pen_Script({ variable: "--font-pen-src", weight: "400", subsets: ["latin"], preload: false });
const sans = Noto_Sans_KR({ variable: "--font-noto", weight: ["400", "500", "700"], subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "마음의 조각 — 기억 그림 일기",
  description: "기억에 남은 순간과 그때의 감정으로 나만의 그림 일기를 만드는 팝업 체험",
};

// 태블릿 키오스크: 확대 없이 화면에 맞춘다
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#faf6ee" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${serif.variable} ${sans.variable} ${pen.variable}`}>
      <body>{children}</body>
    </html>
  );
}
