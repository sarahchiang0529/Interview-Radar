import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getConnectionStatus } from "@/lib/oauth-tokens";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await auth();
    requireSession(session);
    const connections = await getConnectionStatus(session.user.id);
    return NextResponse.json(connections);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    requireSession(session);
    const { provider } = (await request.json()) as { provider: "gmail" | "outlook" };
    const oauthProvider = provider === "gmail" ? "google" : "microsoft-entra-id";

    await getDb()
      .delete(schema.accounts)
      .where(
        and(
          eq(schema.accounts.userId, session.user.id),
          eq(schema.accounts.provider, oauthProvider),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 400 },
    );
  }
}
