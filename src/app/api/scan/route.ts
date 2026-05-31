import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { listScannedEmails, scanInboxes } from "@/lib/scan-service";
import { requireSession } from "@/lib/session";

const bodySchema = z.object({
  provider: z.literal("gmail").optional(),
});

export async function GET() {
  try {
    const session = await auth();
    requireSession(session);
    const emails = await listScannedEmails(session.user.id);
    return NextResponse.json({ emails });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    requireSession(session);
    bodySchema.parse(await request.json().catch(() => ({})));
    const result = await scanInboxes(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 400 },
    );
  }
}
