import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { addEmailToCalendar } from "@/lib/scan-service";
import { requireSession } from "@/lib/session";

const bodySchema = z.object({
  emailId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    requireSession(session);
    const body = bodySchema.parse(await request.json());
    const email = await addEmailToCalendar(session.user.id, body.emailId);
    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create calendar event" },
      { status: 400 },
    );
  }
}
