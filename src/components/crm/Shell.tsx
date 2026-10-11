"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser, ROLE_LABELS } from "@/lib/adora-agenda/client";

const NAV_ITEMS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/contactos", label: "Contactos" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/actividades", label: "Actividades" },
  { href: "/configuracion", label: "Configuración", adminOnly: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="crm-shell">
      <aside className="crm-sidebar">
        <div className="crm-sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset served as-is from /public */}
          <img src="/logo-adora-white.png" alt="Adora Nail Salon" className="brand-logo" />
          <div className="crm-sidebar-brand-text">
            <span className="crm-sidebar-title">Adora</span>
            <span className="brand-tagline">CRM</span>
          </div>
        </div>
        <nav className="crm-nav">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "administrador").map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`crm-nav-link ${active ? "active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="crm-sidebar-footer">
          {user && (
            <div className="crm-current-user">
              <span className="row-title">{user.name}</span>
              <span className="row-sub">{ROLE_LABELS[user.role]}</span>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="crm-main">{children}</main>
    </div>
  );
}
