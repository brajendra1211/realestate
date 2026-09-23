import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAgentRoute = pathname.startsWith("/agent");
  const isInvestorRoute = pathname.startsWith("/investor") && !pathname.startsWith("/investor/login") && !pathname.startsWith("/investor/verify");
  const isBuyerRoute = pathname.startsWith("/buyer") && !pathname.startsWith("/buyer/login") && !pathname.startsWith("/buyer/verify");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute && (!session || session.user.role !== "ADMIN")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAgentRoute && (!session || session.user.role !== "AGENT")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isInvestorRoute && (!session || session.user.role !== "INVESTOR")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isBuyerRoute && (!session || session.user.role !== "BUYER")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isDashboardRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/investor/:path*", "/buyer/:path*", "/dashboard/:path*"],
};
