import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — InterviewRadar",
  description:
    "Scan Gmail for interview emails and add confirmed interviews to Google Calendar.",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  return <DashboardClient userName={session.user.name} />;
}
