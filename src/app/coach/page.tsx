import type { Metadata } from "next";
import Coach from "@/components/Coach";

export const metadata: Metadata = { title: "코칭존 — 마음의 조각", robots: { index: false } };

export default function CoachPage() {
  return <Coach />;
}
