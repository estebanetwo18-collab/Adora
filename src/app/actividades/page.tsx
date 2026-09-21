import type { Metadata } from "next";
import { Actividades } from "@/components/crm/Actividades";
import { Shell } from "@/components/crm/Shell";

export const metadata: Metadata = {
  title: "Actividades",
  robots: { index: false, follow: false },
};

export default function ActividadesPage() {
  return (
    <Shell>
      <Actividades />
    </Shell>
  );
}
