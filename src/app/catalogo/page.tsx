import type { Metadata } from "next";
import { CatalogoPage } from "@/components/catalogo/CatalogoPage";
import "./catalogo.css";

const TITLE = "Catálogo de servicios — Adora Nail Salon";
const DESCRIPTION =
  "Cejas y pestañas, manicure, pedicure y coffee menu — precios, duración estimada y reserva directa por WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: ["/logo-adora.jpg"],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo-adora.jpg"],
  },
};

export default function CatalogoRoute() {
  return <CatalogoPage />;
}
