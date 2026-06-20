import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

export type GoogleAccountConnection = {
  providerAccountId: string;
  email: string | null;
  connected: boolean;
};

export async function listGoogleAccounts(userId: string): Promise<GoogleAccountConnection[]> {
  const accounts = await getDb()
    .select()
    .from(schema.accounts)
    .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.provider, "google")));

  return accounts.map((account) => ({
    providerAccountId: account.providerAccountId,
    email: account.accountEmail,
    connected: Boolean(account.access_token),
  }));
}

async function getGoogleAccount(userId: string, providerAccountId: string) {
  const [account] = await getDb()
    .select()
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.userId, userId),
        eq(schema.accounts.provider, "google"),
        eq(schema.accounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);
  return account;
}

export async function getAccessToken(userId: string, providerAccountId: string) {
  const account = await getGoogleAccount(userId, providerAccountId);
  if (!account?.access_token) {
    throw new Error("Gmail is not connected");
  }

  const expiresAt = account.expires_at ? account.expires_at * 1000 : 0;
  if (expiresAt > Date.now() + 60_000) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error("Gmail token expired — reconnect this account");
  }

  return refreshGoogleToken(userId, providerAccountId, account.refresh_token);
}

async function refreshGoogleToken(
  userId: string,
  providerAccountId: string,
  refreshToken: string,
) {
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

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok) {
    if (body.error === "invalid_grant") {
      await disconnectGoogleAccount(userId, providerAccountId);
      const label = await getAccountLabel(userId, providerAccountId);
      throw new Error(`${label} access expired — add that Gmail account again`);
    }

    throw new Error("Failed to refresh Google token — try reconnecting this Gmail account");
  }

  await getDb()
    .update(schema.accounts)
    .set({
      access_token: body.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600),
      refresh_token: body.refresh_token ?? refreshToken,
    })
    .where(
      and(
        eq(schema.accounts.userId, userId),
        eq(schema.accounts.provider, "google"),
        eq(schema.accounts.providerAccountId, providerAccountId),
      ),
    );

  return body.access_token!;
}

export async function syncGoogleAccountEmail(providerAccountId: string, email: string) {
  await getDb()
    .update(schema.accounts)
    .set({ accountEmail: email })
    .where(
      and(
        eq(schema.accounts.provider, "google"),
        eq(schema.accounts.providerAccountId, providerAccountId),
      ),
    );
}

export async function resolveGoogleAccountEmail(userId: string, providerAccountId: string) {
  const account = await getGoogleAccount(userId, providerAccountId);
  if (account?.accountEmail) {
    return account.accountEmail;
  }

  const accessToken = await getAccessToken(userId, providerAccountId);
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return null;
  }

  const profile = (await response.json()) as { email?: string };
  if (profile.email) {
    await syncGoogleAccountEmail(providerAccountId, profile.email);
    return profile.email;
  }

  return null;
}

export async function disconnectGoogleAccount(userId: string, providerAccountId: string) {
  await getDb()
    .delete(schema.accounts)
    .where(
      and(
        eq(schema.accounts.userId, userId),
        eq(schema.accounts.provider, "google"),
        eq(schema.accounts.providerAccountId, providerAccountId),
      ),
    );
}

async function getAccountLabel(userId: string, providerAccountId: string) {
  const account = await getGoogleAccount(userId, providerAccountId);
  return account?.accountEmail ?? "Gmail account";
}

export async function getConnectionStatus(userId: string) {
  const accounts = await listGoogleAccounts(userId);
  return {
    accounts,
    gmail: accounts.some((account) => account.connected),
  };
}
