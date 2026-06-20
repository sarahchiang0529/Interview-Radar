import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { fetchGmailInterviewEmails, createGoogleCalendarEvent, getGoogleCalendarEvent, buildGoogleCalendarEventUrl } from "@/lib/gmail";
import { rowToScannedEmail } from "@/lib/email-mapper";
import type { ScannedEmail } from "@/lib/interview-radar";
import { getConnectionStatus, listGoogleAccounts, resolveGoogleAccountEmail } from "@/lib/oauth-tokens";

async function getAccountEmailMap(userId: string) {
  const accounts = await listGoogleAccounts(userId);
  return new Map(accounts.map((account) => [account.providerAccountId, account.email]));
}

export async function listScannedEmails(userId: string): Promise<ScannedEmail[]> {
  const rows = await getDb()
    .select()
    .from(schema.scannedEmails)
    .where(eq(schema.scannedEmails.userId, userId))
    .orderBy(desc(schema.scannedEmails.receivedAt));

  const accountEmails = await getAccountEmailMap(userId);

  return rows.map((row) =>
    rowToScannedEmail(row, accountEmails.get(row.providerAccountId) ?? null),
  );
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
        eq(schema.scannedEmails.providerAccountId, email.providerAccountId),
        eq(schema.scannedEmails.externalId, email.externalId),
      ),
    )
    .limit(1);

  const values = {
    userId,
    providerAccountId: email.providerAccountId,
    externalId: email.externalId,
    provider: email.provider,
    subject: email.subject,
    sender: email.sender,
    senderEmail: email.senderEmail,
    receivedAt: new Date(email.receivedAt),
    body: email.body,
    bodyHtml: email.bodyHtml ?? null,
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
    actionItems: email.actionItems,
    reviewNotes: email.reviewNotes,
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

export async function scanInboxes(userId: string, providerAccountId?: string) {
  const connections = await getConnectionStatus(userId);

  if (!connections.gmail) {
    throw new Error("Connect a Gmail account before scanning");
  }

  const accounts = providerAccountId
    ? connections.accounts.filter((account) => account.providerAccountId === providerAccountId)
    : connections.accounts.filter((account) => account.connected);

  if (accounts.length === 0) {
    throw new Error("No connected Gmail accounts to scan");
  }

  const errors: string[] = [];

  for (const account of accounts) {
    try {
      const emails = await fetchGmailInterviewEmails(
        userId,
        account.providerAccountId,
        account.email,
      );
      for (const email of emails) {
        await upsertScannedEmail(userId, email);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Scan failed");
    }
  }

  if (errors.length === accounts.length) {
    throw new Error(errors[0] ?? "Scan failed");
  }

  return {
    scanned: accounts.map((account) => account.providerAccountId),
    warnings: errors,
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

  if (email.provider !== "gmail") {
    throw new Error("Only Gmail emails can be added to calendar");
  }

  if (!email.providerAccountId) {
    throw new Error("This email is missing its Gmail account — scan again");
  }

  const event = await createGoogleCalendarEvent(userId, email.providerAccountId, email);

  await getDb()
    .update(schema.scannedEmails)
    .set({
      status: "added",
      calendarEventId: event.eventId,
      calendarEventUrl: event.eventUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.scannedEmails.id, email.id));

  const accountEmails = await getAccountEmailMap(userId);

  return rowToScannedEmail(
    {
      ...email,
      status: "added",
      calendarEventId: event.eventId,
      calendarEventUrl: event.eventUrl,
      updatedAt: new Date(),
    },
    accountEmails.get(email.providerAccountId) ?? null,
  );
}

export async function openOrRestoreCalendarEvent(userId: string, emailId: string) {
  const [email] = await getDb()
    .select()
    .from(schema.scannedEmails)
    .where(and(eq(schema.scannedEmails.userId, userId), eq(schema.scannedEmails.id, emailId)))
    .limit(1);

  if (!email) {
    throw new Error("Email not found");
  }

  if (email.status !== "added" || !email.calendarEventId) {
    throw new Error("No calendar event linked to this email");
  }

  if (!email.providerAccountId) {
    throw new Error("This email is missing its Gmail account — scan again");
  }

  const accountEmails = await getAccountEmailMap(userId);
  const calendarEmail = await resolveGoogleAccountEmail(userId, email.providerAccountId);
  const existing = await getGoogleCalendarEvent(
    userId,
    email.providerAccountId,
    email.calendarEventId,
  );

  if (existing && calendarEmail) {
    const eventUrl = buildGoogleCalendarEventUrl(existing.id, calendarEmail);

    if (eventUrl !== email.calendarEventUrl) {
      await getDb()
        .update(schema.scannedEmails)
        .set({ calendarEventUrl: eventUrl, updatedAt: new Date() })
        .where(eq(schema.scannedEmails.id, email.id));
    }

    return {
      eventUrl,
      recreated: false,
      email: rowToScannedEmail(
        { ...email, calendarEventUrl: eventUrl },
        accountEmails.get(email.providerAccountId) ?? calendarEmail,
      ),
    };
  }

  const event = await createGoogleCalendarEvent(userId, email.providerAccountId, email);

  await getDb()
    .update(schema.scannedEmails)
    .set({
      calendarEventId: event.eventId,
      calendarEventUrl: event.eventUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.scannedEmails.id, email.id));

  return {
    eventUrl: event.eventUrl,
    recreated: true,
    email: rowToScannedEmail(
      {
        ...email,
        calendarEventId: event.eventId,
        calendarEventUrl: event.eventUrl,
        updatedAt: new Date(),
      },
      accountEmails.get(email.providerAccountId) ?? null,
    ),
  };
}

export async function removeScannedEmailsForAccount(userId: string, providerAccountId: string) {
  await getDb()
    .delete(schema.scannedEmails)
    .where(
      and(
        eq(schema.scannedEmails.userId, userId),
        eq(schema.scannedEmails.providerAccountId, providerAccountId),
      ),
    );
}

export { getConnectionStatus, listGoogleAccounts };
