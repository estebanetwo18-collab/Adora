import type { Metadata } from "next";
import { Configuracion } from "@/components/crm/Configuracion";
import { Shell } from "@/components/crm/Shell";

export const metadata: Metadata = {
  title: "Configuración",
  robots: { index: false, follow: false },
};

export default function ConfiguracionPage() {
  return (
    <Shell>
      <Configuracion />
    </Shell>
  );
}
