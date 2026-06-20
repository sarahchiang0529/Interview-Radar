"use server";

import { signIn } from "@/lib/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function linkGoogleAccount() {
  await signIn("google", {
    redirectTo: "/dashboard",
    authorizationParams: {
      prompt: "select_account consent",
      access_type: "offline",
    },
  });
}
