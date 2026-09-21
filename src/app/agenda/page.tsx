import type { Metadata } from "next";
import { AgendaApp } from "@/components/adora-agenda/AgendaApp";
import { Shell } from "@/components/crm/Shell";

export const metadata: Metadata = {
  title: "Agenda",
  robots: { index: false, follow: false },
};

export default function AgendaPage() {
  return (
    <Shell>
      <AgendaApp />
    </Shell>
  );
}
