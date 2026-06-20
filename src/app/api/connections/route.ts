import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  disconnectGoogleAccount,
  getConnectionStatus,
  listGoogleAccounts,
} from "@/lib/oauth-tokens";
import { removeScannedEmailsForAccount } from "@/lib/scan-service";
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
    const providerAccountId = new URL(request.url).searchParams.get("providerAccountId");

    if (!providerAccountId) {
      return NextResponse.json({ error: "providerAccountId is required" }, { status: 400 });
    }

    const accounts = await listGoogleAccounts(session.user.id);
    if (!accounts.some((account) => account.providerAccountId === providerAccountId)) {
      return NextResponse.json({ error: "Gmail account not found" }, { status: 404 });
    }

    await disconnectGoogleAccount(session.user.id, providerAccountId);
    await removeScannedEmailsForAccount(session.user.id, providerAccountId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 400 },
    );
  }
}
