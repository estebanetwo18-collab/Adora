import { Bodoni_Moda, Quicksand, Lilita_One, Montserrat } from "next/font/google";
import "../agenda.css";
import { LoginForm } from "@/components/adora-agenda/LoginForm";

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

export const metadata = {
  title: "Ingresar — Agenda Adora",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className={`adora-agenda ${bodoniModa.variable} ${quicksand.variable} ${lilitaOne.variable} ${montserrat.variable}`}>
      <div className="login-page">
        <div className="card login-card">
          <div className="login-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served as-is from /public */}
            <img src="/logo-adora.jpg" alt="Adora Nail Salon" className="login-logo" />
            <span className="row-sub">Agenda</span>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
