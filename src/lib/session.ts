import type { Session } from "next-auth";

export function requireSession(
  session: Session | null,
): asserts session is Session & { user: { id: string } } {
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
}
