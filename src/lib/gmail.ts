import { getAccessToken } from "@/lib/oauth-tokens";
import { classifyRawEmail } from "@/lib/email-mapper";

type GmailHeader = { name: string; value: string };

type GmailMessageList = {
  messages?: Array<{ id: string }>;
};

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
  };
};

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function extractBody(message: GmailMessage): string {
  const payload = message.payload;
  if (!payload) return message.snippet ?? "";

  const walk = (parts: GmailPart[] | undefined): string => {
    if (!parts) return "";
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      const nested = walk(part.parts);
      if (nested) return nested;
    }
    for (const part of parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, " ");
      }
    }
    return "";
  };

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  const fromParts = walk(payload.parts);
  if (fromParts) return fromParts.trim();

  return message.snippet ?? "";
}

function parseSender(from: string) {
  const match = from.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return { sender: match[1].trim().replace(/^"|"$/g, ""), senderEmail: match[2].trim() };
  }
  return { sender: from, senderEmail: from };
}

export async function fetchGmailInterviewEmails(userId: string) {
  const accessToken = await getAccessToken(userId, "gmail");
  const query = encodeURIComponent(
    'newer_than:30d (interview OR schedule OR recruiter OR calendly OR "phone screen" OR "final interview")',
  );

  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=40`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!listResponse.ok) {
    const text = await listResponse.text();
    throw new Error(`Gmail list failed: ${text}`);
  }

  const list = (await listResponse.json()) as GmailMessageList;
  const ids = list.messages?.map((m) => m.id) ?? [];

  const emails = await Promise.all(
    ids.map(async (id) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) return null;
      const message = (await response.json()) as GmailMessage;
      const subject = header(message.payload?.headers, "Subject");
      const from = header(message.payload?.headers, "From");
      const date = header(message.payload?.headers, "Date");
      const { sender, senderEmail } = parseSender(from);
      const body = extractBody(message);

      return classifyRawEmail({
        id: message.id,
        provider: "gmail",
        subject,
        sender,
        senderEmail,
        receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        body,
      });
    }),
  );

  return emails.filter((email): email is NonNullable<typeof email> => email !== null);
}

export async function createGoogleCalendarEvent(
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
  const accessToken = await getAccessToken(userId, "gmail");

  let start: Date;
  if (email.dateTimeISO) {
    start = new Date(email.dateTimeISO);
  } else {
    start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: `Interview: ${email.company ?? "Company"}${email.role ? ` — ${email.role}` : ""}`,
      description: `${email.subject}\n\nFrom: ${email.sender} <${email.senderEmail}>\n\n${email.body}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar create failed: ${text}`);
  }

  const event = (await response.json()) as { id: string; htmlLink?: string };
  return {
    eventId: event.id,
    eventUrl: event.htmlLink ?? `https://calendar.google.com/calendar/event?eid=${event.id}`,
  };
}
