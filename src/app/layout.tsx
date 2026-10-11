import type { Metadata } from "next";
import { Bodoni_Moda, Quicksand, Lilita_One, Montserrat, Poppins, Fraunces } from "next/font/google";
import "./globals.css";
import "./agenda.css";

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const lilitaOne = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// Catálogo page only: Poppins for all body copy, Fraunces for titles — the
// closest free match we could find for the client's reference title font
// (a premium "beauty branding" display face not available on Google Fonts;
// see the catalogo.css comment above the title rules).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  weight: "variable",
  display: "swap",
});

// Vercel sets VERCEL_PROJECT_PRODUCTION_URL automatically; set
// NEXT_PUBLIC_SITE_URL yourself once a custom domain is attached so social
// previews (og:image, twitter:image) resolve to the right host.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CRM Adora",
    template: "%s — CRM Adora",
  },
  description: "Plataforma interna de Adora Nail Salon: clientes, prospectos, oportunidades, actividades y agenda de citas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        className={`adora-agenda ${bodoniModa.variable} ${quicksand.variable} ${lilitaOne.variable} ${montserrat.variable} ${poppins.variable} ${fraunces.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
