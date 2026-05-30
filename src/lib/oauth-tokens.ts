import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

export type OAuthProvider = "google" | "microsoft-entra-id";

const PROVIDER_MAP = {
  gmail: "google",
  outlook: "microsoft-entra-id",
} as const;

export type MailProvider = keyof typeof PROVIDER_MAP;

export function oauthProviderFor(mailProvider: MailProvider): OAuthProvider {
  return PROVIDER_MAP[mailProvider];
}

export async function getAccountForProvider(userId: string, mailProvider: MailProvider) {
  const provider = oauthProviderFor(mailProvider);
  const [account] = await getDb()
    .select()
    .from(schema.accounts)
    .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.provider, provider)))
    .limit(1);
  return account;
}

export async function getAccessToken(userId: string, mailProvider: MailProvider) {
  const account = await getAccountForProvider(userId, mailProvider);
  if (!account?.access_token) {
    throw new Error(`${mailProvider} is not connected`);
  }

  const expiresAt = account.expires_at ? account.expires_at * 1000 : 0;
  if (expiresAt > Date.now() + 60_000) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error(`${mailProvider} token expired — reconnect your account`);
  }

  if (mailProvider === "gmail") {
    return refreshGoogleToken(userId, account.refresh_token);
  }

  return refreshMicrosoftToken(userId, account.refresh_token);
}

async function refreshGoogleToken(userId: string, refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google token");
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  await getDb()
    .update(schema.accounts)
    .set({
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token ?? refreshToken,
    })
    .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.provider, "google")));

  return data.access_token;
}

async function refreshMicrosoftToken(userId: string, refreshToken: string) {
  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "Mail.Read",
        "Calendars.ReadWrite",
      ].join(" "),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Microsoft token");
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  await getDb()
    .update(schema.accounts)
    .set({
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token ?? refreshToken,
    })
    .where(
      and(eq(schema.accounts.userId, userId), eq(schema.accounts.provider, "microsoft-entra-id")),
    );

  return data.access_token;
}

export async function getConnectionStatus(userId: string) {
  const [gmail, outlook] = await Promise.all([
    getAccountForProvider(userId, "gmail"),
    getAccountForProvider(userId, "outlook"),
  ]);

  return {
    gmail: Boolean(gmail?.access_token),
    outlook: Boolean(outlook?.access_token),
  };
}
