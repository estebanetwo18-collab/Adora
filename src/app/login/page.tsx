import { Fraunces, Manrope } from "next/font/google";
import "../agenda.css";
import { LoginForm } from "@/components/adora-agenda/LoginForm";

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

export const metadata = {
  title: "Ingresar — Agenda Adora",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className={`adora-agenda ${fraunces.variable} ${manrope.variable}`}>
      <div className="login-page">
        <div className="card login-card">
          <div className="login-brand">
            <div className="brand-mark" style={{ background: "var(--brand-brown)" }}>
              A
            </div>
            <span className="name" style={{ color: "var(--brand-brown)" }}>
              Adora
            </span>
            <span className="row-sub">Agenda · Nail Salon</span>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
