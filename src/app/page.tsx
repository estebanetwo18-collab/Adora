import type { Metadata } from "next";
import { Bodoni_Moda, Quicksand, Lilita_One, Montserrat } from "next/font/google";
import { AgendaApp } from "@/components/adora-agenda/AgendaApp";
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
  title: "Agenda Adora",
  description: "Calendario de citas de Adora Nail Salon: agenda, edita y elimina citas, clientas, equipo y servicios en tiempo real.",
  robots: { index: false, follow: false },
};

export default function AdoraAgendaPage() {
  return (
    <div className={`adora-agenda ${bodoniModa.variable} ${quicksand.variable} ${lilitaOne.variable} ${montserrat.variable}`}>
      <AgendaApp />
    </div>
  );
}
