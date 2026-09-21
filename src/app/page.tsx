import type { Metadata } from "next";
import { Dashboard } from "@/components/crm/Dashboard";
import { Shell } from "@/components/crm/Shell";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
