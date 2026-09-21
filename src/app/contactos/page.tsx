import type { Metadata } from "next";
import { Contactos } from "@/components/crm/Contactos";
import { Shell } from "@/components/crm/Shell";

export const metadata: Metadata = {
  title: "Contactos",
  robots: { index: false, follow: false },
};

export default function ContactosPage() {
  return (
    <Shell>
      <Contactos />
    </Shell>
  );
}
