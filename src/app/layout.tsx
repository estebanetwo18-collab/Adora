import type { Metadata } from "next";
import { Bodoni_Moda, Quicksand, Lilita_One, Montserrat } from "next/font/google";
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

export const metadata: Metadata = {
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
        className={`adora-agenda ${bodoniModa.variable} ${quicksand.variable} ${lilitaOne.variable} ${montserrat.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
