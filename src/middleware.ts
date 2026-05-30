import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/auth/signin" && request.method === "GET") {
    const signInUrl = new URL("/signin", request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      signInUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/auth/signin",
};
