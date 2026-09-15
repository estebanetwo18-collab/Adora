import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { AgendaApp } from "@/components/adora-agenda/AgendaApp";
import "./agenda.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agenda Adora",
  description: "Calendario de citas de Adora Nail Salon: agenda, edita y elimina citas, clientas, equipo y servicios en tiempo real.",
  robots: { index: false, follow: false },
};

export default function AdoraAgendaPage() {
  return (
    <div className={`adora-agenda ${fraunces.variable} ${manrope.variable}`}>
      <AgendaApp />
    </div>
  );
}
