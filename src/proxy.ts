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
  "/manufacturing",
  "/hr",
  "/projects",
  "/documents",
  "/notifications",
  "/admin",
  "/onboarding",
  "/company",
  "/settings",
];

// Routes only for unauthenticated users — active logged-in users get
// redirected away from these, UNLESS they have a forcePasswordReset pending.
const authOnlyRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify",
  "/unverified",
  "/banned",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const status = req.auth?.user?.status;
  const forceReset = (req.auth?.user as { forcePasswordReset?: boolean } | undefined)
    ?.forcePasswordReset;

  const isProtected = protectedRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  );
  const isAuthOnlyRoute = authOnlyRoutes.some(
    (route) => nextUrl.pathname === route
  );
  const isResetPasswordRoute = nextUrl.pathname === "/reset-password";

  // 1. Unauthenticated users cannot access protected routes
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Banned users → /banned (always, except when already there)
  if (isLoggedIn && status === "banned" && nextUrl.pathname !== "/banned") {
    return NextResponse.redirect(new URL("/banned", nextUrl.origin));
  }

  // 3. Unverified users cannot access protected routes → /unverified
  if (isLoggedIn && status === "unverified" && isProtected) {
    return NextResponse.redirect(new URL("/unverified", nextUrl.origin));
  }

  // 4. Force-password-reset: must visit /reset-password before accessing app
  //    Let them stay on /reset-password; redirect away from everything else protected.
  if (isLoggedIn && forceReset && isProtected) {
    return NextResponse.redirect(
      new URL("/reset-password?force=1", nextUrl.origin)
    );
  }

  // 5. /reset-password: let forceReset users in; send everyone else to dashboard
  if (isResetPasswordRoute && isLoggedIn && !forceReset) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  // 6. Auth-only pages: send active logged-in users to dashboard
  if (isAuthOnlyRoute && isLoggedIn && !forceReset) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|brand-kit/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|js|json|txt|xml|css|woff2?)$).*)",
  ],
};
