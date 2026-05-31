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

function extractBodies(message: GmailMessage): { text: string; html?: string } {
  const payload = message.payload;
  if (!payload) return { text: message.snippet ?? "" };

  let text = "";
  let html = "";

  const walk = (parts: GmailPart[] | undefined) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data && !text) {
        text = decodeBase64Url(part.body.data);
      }
      if (part.mimeType === "text/html" && part.body?.data && !html) {
        html = decodeBase64Url(part.body.data);
      }
      walk(part.parts);
    }
  };

  if (payload.body?.data) {
    text = decodeBase64Url(payload.body.data);
  }

  walk(payload.parts);

  if (!text && html) {
    text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!text) {
    text = message.snippet ?? "";
  }

  return { text: text.trim(), html: html || undefined };
}

function parseSender(from: string) {
  const match = from.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return { sender: match[1].trim().replace(/^"|"$/g, ""), senderEmail: match[2].trim() };
  }
  return { sender: from, senderEmail: from };
}

export async function fetchGmailInterviewEmails(userId: string) {
  const accessToken = await getAccessToken(userId);
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
      const { text, html } = extractBodies(message);

      return classifyRawEmail({
        id: message.id,
        provider: "gmail",
        subject,
        sender,
        senderEmail,
        receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        body: text,
        bodyHtml: html,
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
  const accessToken = await getAccessToken(userId);

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
