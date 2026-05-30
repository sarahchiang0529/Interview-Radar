import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { fetchGmailInterviewEmails, createGoogleCalendarEvent } from "@/lib/gmail";
import { fetchOutlookInterviewEmails, createOutlookCalendarEvent } from "@/lib/outlook";
import { rowToScannedEmail } from "@/lib/email-mapper";
import type { Provider, ScannedEmail } from "@/lib/interview-radar";
import { getConnectionStatus } from "@/lib/oauth-tokens";

type ScanTarget = Provider | "all";

export async function listScannedEmails(userId: string): Promise<ScannedEmail[]> {
  const rows = await getDb()
    .select()
    .from(schema.scannedEmails)
    .where(eq(schema.scannedEmails.userId, userId))
    .orderBy(desc(schema.scannedEmails.receivedAt));

  return rows.map(rowToScannedEmail);
}

async function upsertScannedEmail(
  userId: string,
  email: Awaited<ReturnType<typeof fetchGmailInterviewEmails>>[number],
) {
  const [existing] = await getDb()
    .select()
    .from(schema.scannedEmails)
    .where(
      and(
        eq(schema.scannedEmails.userId, userId),
        eq(schema.scannedEmails.provider, email.provider),
        eq(schema.scannedEmails.externalId, email.externalId),
      ),
    )
    .limit(1);

  const values = {
    userId,
    externalId: email.externalId,
    provider: email.provider,
    subject: email.subject,
    sender: email.sender,
    senderEmail: email.senderEmail,
    receivedAt: new Date(email.receivedAt),
    body: email.body,
    company: email.company ?? null,
    role: email.role ?? null,
    interviewType: email.interviewType ?? null,
    dateTime: email.dateTime ?? null,
    dateTimeISO: email.dateTimeISO ?? null,
    meetingLink: email.meetingLink ?? null,
    confidence: String(email.confidence),
    status: existing?.status === "added" ? existing.status : email.status,
    reason: email.reason,
    evidence: email.evidence,
    sourceUrl: email.sourceUrl,
    calendarEventId: existing?.calendarEventId ?? null,
    calendarEventUrl: existing?.calendarEventUrl ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await getDb()
      .update(schema.scannedEmails)
      .set(values)
      .where(eq(schema.scannedEmails.id, existing.id));
    return;
  }

  await getDb().insert(schema.scannedEmails).values(values);
}

export async function scanInboxes(userId: string, target: ScanTarget) {
  const connections = await getConnectionStatus(userId);
  const scanned: string[] = [];

  if ((target === "gmail" || target === "all") && connections.gmail) {
    const emails = await fetchGmailInterviewEmails(userId);
    for (const email of emails) {
      await upsertScannedEmail(userId, email);
    }
    scanned.push("gmail");
  }

  if ((target === "outlook" || target === "all") && connections.outlook) {
    const emails = await fetchOutlookInterviewEmails(userId);
    for (const email of emails) {
      await upsertScannedEmail(userId, email);
    }
    scanned.push("outlook");
  }

  if (target === "gmail" && !connections.gmail) {
    throw new Error("Connect Gmail before scanning");
  }
  if (target === "outlook" && !connections.outlook) {
    throw new Error("Connect Outlook before scanning");
  }
  if (target === "all" && !connections.gmail && !connections.outlook) {
    throw new Error("Connect Gmail or Outlook before scanning");
  }

  return {
    scanned,
    emails: await listScannedEmails(userId),
  };
}

export async function addEmailToCalendar(userId: string, emailId: string) {
  const [email] = await getDb()
    .select()
    .from(schema.scannedEmails)
    .where(and(eq(schema.scannedEmails.userId, userId), eq(schema.scannedEmails.id, emailId)))
    .limit(1);

  if (!email) {
    throw new Error("Email not found");
  }

  if (email.status !== "ready") {
    throw new Error("Only ready emails can be added to calendar");
  }

  const event =
    email.provider === "gmail"
      ? await createGoogleCalendarEvent(userId, email)
      : await createOutlookCalendarEvent(userId, email);

  await getDb()
    .update(schema.scannedEmails)
    .set({
      status: "added",
      calendarEventId: event.eventId,
      calendarEventUrl: event.eventUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.scannedEmails.id, email.id));

  return rowToScannedEmail({
    ...email,
    status: "added",
    calendarEventId: event.eventId,
    calendarEventUrl: event.eventUrl,
    updatedAt: new Date(),
  });
}

export { getConnectionStatus };
