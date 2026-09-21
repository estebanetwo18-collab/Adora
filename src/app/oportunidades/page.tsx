import type { Metadata } from "next";
import { Oportunidades } from "@/components/crm/Oportunidades";
import { Shell } from "@/components/crm/Shell";

export const metadata: Metadata = {
  title: "Oportunidades",
  robots: { index: false, follow: false },
};

export default function OportunidadesPage() {
  return (
    <Shell>
      <Oportunidades />
    </Shell>
  );
}
