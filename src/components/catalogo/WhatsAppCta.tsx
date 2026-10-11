import { PENDING_LABEL, whatsappLink } from "@/lib/catalogo/data";

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.37-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.6-2.84-1.23-4.7-4.1-4.84-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.08.99-2.37.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.3.02.49-.09.19-.14.3-.28.47-.14.16-.29.37-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.68-.79.86-1.07.19-.28.37-.23.63-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}

export function WhatsAppCta({
  message,
  label,
  variant = "solid",
  size = "default",
}: {
  message: string;
  label: string;
  variant?: "solid" | "ghost";
  size?: "default" | "small";
}) {
  const href = whatsappLink(message);
  const classes = `whatsapp-btn ${variant === "ghost" ? "ghost" : ""} ${size === "small" ? "small" : ""}`.trim();

  if (!href) {
    return (
      <div>
        <span className={classes} aria-disabled="true" role="button">
          <WhatsAppIcon />
          {label}
        </span>
        <p className="pending-note">WhatsApp: {PENDING_LABEL}</p>
      </div>
    );
  }

  return (
    <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
      <WhatsAppIcon />
      {label}
    </a>
  );
}
