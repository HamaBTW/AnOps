import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/server/auth/config";

const { auth } = NextAuth(authConfig);

const protectedRoutes = [
  "/dashboard",
  "/crm",
  "/sales",
  "/finance",
  "/inventory",
  "/purchasing",
  "/hr",
  "/projects",
  "/documents",
  "/notifications",
  "/admin",
];

const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/unverified",
  "/banned",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const status = req.auth?.user?.status;
  const isProtected = protectedRoutes.some(
    (route) => nextUrl.pathname === route || (route !== "/" && nextUrl.pathname.startsWith(route + "/"))
  );
  const isAuthRoute = authRoutes.some((route) => nextUrl.pathname === route);

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && status === "banned" && nextUrl.pathname !== "/banned") {
    return NextResponse.redirect(new URL("/banned", nextUrl.origin));
  }

  if (isLoggedIn && status === "unverified" && isProtected && nextUrl.pathname !== "/unverified") {
    return NextResponse.redirect(new URL("/unverified", nextUrl.origin));
  }

  if (isAuthRoute && isLoggedIn && status === "active") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand-kit/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|js|json|txt|xml|css|woff2?)$).*)"],
};
