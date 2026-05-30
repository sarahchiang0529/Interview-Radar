import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in — InterviewRadar",
  description: "Sign in to access your private interview inbox dashboard.",
};

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <SignInForm />;
}
