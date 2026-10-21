import { NextResponse, type NextRequest } from "next/server";

// 코칭존 화면·API는 상담사 비밀번호(Basic 인증)로 연다.
// 비밀번호를 정하지 않으면 개발 중에는 그냥 열고, 배포 환경에서는 이름·결과가 공개되지 않게 닫는다.
export function proxy(req: NextRequest) {
  const pass = process.env.COACH_PASSWORD;
  if (!pass && process.env.NODE_ENV !== "production") return NextResponse.next();
  const [scheme, encoded] = req.headers.get("authorization")?.split(" ") ?? [];
  const given = scheme === "Basic" && encoded ? atob(encoded).split(":").slice(1).join(":") : null;
  if (pass && given === pass) return NextResponse.next();
  return new NextResponse(pass ? "상담사 비밀번호가 필요해요." : "COACH_PASSWORD가 설정되지 않았어요.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="coach", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const config = { matcher: ["/coach/:path*", "/api/coach/:path*"] };
