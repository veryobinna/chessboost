import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GUEST_COOKIE, verifyGuestToken } from "@/lib/guest";
import type { User } from "@prisma/client";

// Resolve the current user from the signed guest cookie, creating the guest
// User row on first sight. Middleware guarantees the cookie exists, so this
// returns null only if the cookie was tampered with or stripped.
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = await verifyGuestToken(store.get(GUEST_COOKIE)?.value);
  if (!token) return null;

  return prisma.user.upsert({
    where: { guestToken: token },
    update: {},
    create: { guestToken: token, isGuest: true },
  });
}
