import { notFound } from "next/navigation";
import Preview from "@/components/Preview";

// 개발용: 그림 일기·키링 6종을 예시 데이터로 한 번에 본다. 배포 환경에서는 열리지 않는다.
export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Preview />;
}
