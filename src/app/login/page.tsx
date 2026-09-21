import { LoginForm } from "@/components/adora-agenda/LoginForm";

export const metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served as-is from /public */}
          <img src="/logo-adora.jpg" alt="Adora Nail Salon" className="login-logo" />
          <span className="row-sub">CRM</span>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
