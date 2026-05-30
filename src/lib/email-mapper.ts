import { buildSourceUrl, classify, type Provider, type ScannedEmail } from "@/lib/interview-radar";
import type { ScannedEmailRow } from "@/lib/db/schema";

export function rowToScannedEmail(row: ScannedEmailRow): ScannedEmail {
  return {
    id: row.id,
    provider: row.provider,
    subject: row.subject,
    sender: row.sender,
    senderEmail: row.senderEmail,
    receivedAt: row.receivedAt.toISOString(),
    body: row.body,
    company: row.company ?? undefined,
    role: row.role ?? undefined,
    interviewType: row.interviewType ?? undefined,
    dateTime: row.dateTime ?? undefined,
    dateTimeISO: row.dateTimeISO ?? undefined,
    meetingLink: row.meetingLink ?? undefined,
    confidence: Number(row.confidence),
    status: row.status,
    reason: row.reason,
    evidence: row.evidence ?? [],
    sourceUrl: row.sourceUrl,
    calendarEventUrl: row.calendarEventUrl ?? undefined,
  };
}

export function classifyRawEmail(input: {
  id: string;
  provider: Provider;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedAt: string;
  body: string;
  company?: string;
  role?: string;
  interviewType?: string;
  webLink?: string;
}): Omit<ScannedEmail, "id"> & { externalId: string } {
  const cls = classify({
    id: input.id,
    provider: input.provider,
    subject: input.subject,
    sender: input.sender,
    senderEmail: input.senderEmail,
    receivedAt: input.receivedAt,
    body: input.body,
    company: input.company,
    role: input.role,
    interviewType: input.interviewType,
    sourceUrl: "",
  });

  return {
    externalId: input.id,
    provider: input.provider,
    subject: input.subject,
    sender: input.sender,
    senderEmail: input.senderEmail,
    receivedAt: input.receivedAt,
    body: input.body,
    company: input.company,
    role: input.role,
    interviewType: input.interviewType,
    ...cls,
    sourceUrl: buildSourceUrl(input.provider, input.id, input.webLink),
  };
}
