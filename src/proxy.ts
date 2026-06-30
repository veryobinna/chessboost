import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE, generateGuestToken, signGuestToken } from "@/lib/guest";

// Ensure every visitor has a signed guest cookie before any page renders.
// The cookie is also written onto the *request* so the current render already
// sees it (no two-request delay before a session exists).
export async function proxy(req: NextRequest) {
  if (req.cookies.get(GUEST_COOKIE)) return NextResponse.next();

  const signed = await signGuestToken(generateGuestToken());
  req.cookies.set(GUEST_COOKIE, signed);

  const res = NextResponse.next({ request: req });
  res.cookies.set(GUEST_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
