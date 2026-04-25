import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("mizan_session")?.value;
  const { pathname } = request.nextUrl;

  if ((pathname.startsWith("/client") || pathname.startsWith("/lawyer")) && !token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/lawyer/:path*"]
};
