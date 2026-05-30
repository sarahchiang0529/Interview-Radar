import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — InterviewRadar",
  description:
    "Scan Gmail and Outlook for interview emails and add confirmed interviews to your calendar.",
};

export default async function DashboardPage() {
  const session = await auth();

  return <DashboardClient signedIn={Boolean(session?.user?.id)} userName={session?.user?.name} />;
}
