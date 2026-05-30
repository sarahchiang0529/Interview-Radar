"use server";

import { signIn } from "@/lib/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signInWithMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
}
