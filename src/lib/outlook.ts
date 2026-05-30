import { getAccessToken } from "@/lib/oauth-tokens";
import { classifyRawEmail } from "@/lib/email-mapper";

type GraphMessage = {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  webLink?: string;
};

type GraphListResponse = {
  value?: GraphMessage[];
};

const INTERVIEW_HINT =
  /interview|schedule|recruiter|calendly|phone screen|final interview|hiring manager|availability/i;

export async function fetchOutlookInterviewEmails(userId: string) {
  const accessToken = await getAccessToken(userId, "outlook");

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages?$top=60&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,body,webLink",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Outlook list failed: ${text}`);
  }

  const data = (await response.json()) as GraphListResponse;
  const messages = (data.value ?? []).filter((message) => {
    const haystack = `${message.subject ?? ""}\n${message.bodyPreview ?? ""}\n${message.body?.content ?? ""}`;
    return INTERVIEW_HINT.test(haystack);
  });

  return messages.slice(0, 40).map((message) => {
    const body =
      message.body?.contentType === "html"
        ? (message.body.content ?? "").replace(/<[^>]+>/g, " ")
        : (message.body?.content ?? message.bodyPreview ?? "");

    return classifyRawEmail({
      id: message.id,
      provider: "outlook",
      subject: message.subject ?? "(No subject)",
      sender: message.from?.emailAddress?.name ?? "Unknown",
      senderEmail: message.from?.emailAddress?.address ?? "unknown@outlook.com",
      receivedAt: message.receivedDateTime ?? new Date().toISOString(),
      body: body.trim(),
      webLink: message.webLink,
    });
  });
}

export async function createOutlookCalendarEvent(
  userId: string,
  email: {
    subject: string;
    sender: string;
    senderEmail: string;
    body: string;
    company?: string | null;
    role?: string | null;
    dateTimeISO?: string | null;
  },
) {
  const accessToken = await getAccessToken(userId, "outlook");

  let start: Date;
  if (email.dateTimeISO) {
    start = new Date(email.dateTimeISO);
  } else {
    start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: `Interview: ${email.company ?? "Company"}${email.role ? ` — ${email.role}` : ""}`,
      body: {
        contentType: "Text",
        content: `${email.subject}\n\nFrom: ${email.sender} <${email.senderEmail}>\n\n${email.body}`,
      },
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Outlook Calendar create failed: ${text}`);
  }

  const event = (await response.json()) as { id: string; webLink?: string };
  return {
    eventId: event.id,
    eventUrl:
      event.webLink ?? `https://outlook.office.com/calendar/item/${encodeURIComponent(event.id)}`,
  };
}
