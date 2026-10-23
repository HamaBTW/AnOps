import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/", "/crm", "/sales", "/finance", "/inventory", "/purchasing", "/hr", "/projects", "/documents", "/notifications", "/admin"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isProtected = protectedRoutes.some((route) => nextUrl.pathname === route || (route !== "/" && nextUrl.pathname.startsWith(route + "/")));
  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register") || nextUrl.pathname.startsWith("/forgot-password");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
