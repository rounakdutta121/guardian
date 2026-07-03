import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/splash",
  "/share",
];

const authRoutes = ["/login", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`) ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/share/")
  );

  const isPublicApi =
    pathname.startsWith("/api/auth") || pathname.startsWith("/api/share/");

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session && pathname.startsWith("/api/") && !isPublicApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!session && !isPublicRoute && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    session &&
    session.user.profileCompleted !== true &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/onboarding/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
