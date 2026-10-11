import Image from "next/image";
import { WaveDivider } from "./WaveDivider";
import { WhatsAppCta } from "./WhatsAppCta";
import {
  CATEGORIES,
  ALL_SERVICES,
  COFFEE_DRINKS,
  COFFEE_SNACKS,
  OPERATIONAL_INFO,
  COMPLEXITY_LABEL,
  WHATSAPP_GENERAL_MESSAGE,
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
  formatColones,
  formatDuration,
  whatsappLink,
  whatsappMessageForCategory,
  whatsappMessageForService,
} from "@/lib/catalogo/data";

const CATEGORY_ORDER = ["cejas-pestanas", "manicure", "pedicure"];
const orderedCategories = CATEGORY_ORDER.map((id) => CATEGORIES.find((c) => c.id === id)!).filter(Boolean);

const NAV_LINKS = [
  { href: "#cejas-pestanas", label: "Cejas y pestañas" },
  { href: "#manicure", label: "Manicure" },
  { href: "#pedicure", label: "Pedicure" },
  { href: "#duracion", label: "Duración" },
  { href: "#coffee", label: "Coffee menu" },
  { href: "#info", label: "Información" },
];

export function CatalogoPage() {
  return (
    <div className="adora-catalog">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <nav className="catalog-nav" aria-label="Navegación del catálogo">
        <div className="catalog-nav-inner">
          <a href="#top" className="catalog-nav-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static nav icon, not worth next/image overhead */}
            <img src="/logo-adora.jpg" alt="Adora Nail Salon" />
          </a>
          <div className="catalog-nav-links">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
          <a className="catalog-nav-cta" href="#reserva">
            Agendar
          </a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="hero-inner container">
          <Image src="/logo-adora.jpg" alt="Adora Nail Salon" width={168} height={168} className="hero-logo" priority />
          <h1>La experiencia Adora</h1>
          <p className="hero-sub">
            Cejas, pestañas, manos y pies cuidados con calma y buen gusto — y un café pensado para acompañar cada
            cita, no para rellenarla.
          </p>
          <div className="hero-ctas">
            <WhatsAppCta message={WHATSAPP_GENERAL_MESSAGE} label="Agendá tu cita por WhatsApp" />
            <a className="whatsapp-btn ghost" href="#cejas-pestanas">
              Ver servicios
            </a>
          </div>
        </div>
        <WaveDivider color="var(--bg)" flip />
      </header>

      <main id="contenido">
        <section className="intro container" id="experiencia">
          <span className="eyebrow">Beauty studio &amp; coffee experience</span>
          <h2>Cada cita, una pausa con intención</h2>
          <p>
            En Adora combinamos técnica cuidadosa con un espacio pensado para disfrutar el tiempo que te tomás para
            vos. Elegí tu servicio, confirmá por WhatsApp y llegá a relajarte — el resto lo tenemos listo.
          </p>
          <div className="category-pills">
            {orderedCategories.map((cat) => (
              <a key={cat.id} href={`#${cat.id}`}>
                {cat.label}
              </a>
            ))}
            <a href="#coffee">Coffee menu</a>
          </div>
        </section>

        {orderedCategories.map((cat) => (
          <section className="category-panel" id={cat.id} key={cat.id} aria-labelledby={`${cat.id}-heading`}>
            <WaveDivider color="var(--bg)" />
            <div className="category-panel-inner">
              <div className="category-media">
                <Image src={cat.image.src} alt={cat.image.alt} width={900} height={1600} sizes="(max-width: 860px) 90vw, 340px" />
              </div>
              <div>
                <div className="category-head">
                  <h2 id={`${cat.id}-heading`}>{cat.label}</h2>
                  <p>{cat.tagline}</p>
                </div>
                <div className="price-list">
                  {cat.services.map((s) => {
                    const href = whatsappLink(whatsappMessageForService(s.name));
                    const Row = href ? "a" : "div";
                    return (
                      <Row
                        className="price-row"
                        key={s.id}
                        {...(href ? { href, target: "_blank", rel: "noopener noreferrer", title: `Reservar ${s.name} por WhatsApp` } : {})}
                      >
                        <div className="price-row-text">
                          <span className="price-row-name">{s.name}</span>
                          {s.note && <span className="price-row-note">{s.note}</span>}
                        </div>
                        <span className="price-row-price">{formatColones(s.price)}</span>
                      </Row>
                    );
                  })}
                </div>
                <div className="category-cta">
                  <WhatsAppCta message={whatsappMessageForCategory(cat.label)} label={`Consultar disponibilidad — ${cat.label}`} />
                </div>
              </div>
            </div>
            <WaveDivider color="var(--bg)" flip />
          </section>
        ))}

        <section className="duration-section container" id="duracion">
          <span className="eyebrow">Para planificar tu visita</span>
          <h2>Duración estimada por servicio</h2>
          <p className="duration-note">
            Tiempos aproximados según la complejidad del diseño — pueden variar según la condición de la uña o si
            incluye retiro. Ningún servicio supera las 2 horas y 30 minutos.
          </p>
          <div className="table-scroll">
            <table className="duration-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Precio</th>
                  <th>Duración estimada</th>
                  <th>Complejidad</th>
                </tr>
              </thead>
              <tbody>
                {ALL_SERVICES.map((s) => (
                  <tr key={s.id}>
                    <td className="svc-name" data-label="Servicio">
                      {s.name}
                    </td>
                    <td data-label="Precio">{formatColones(s.price)}</td>
                    <td data-label="Duración estimada">{formatDuration(s.durationMin, s.durationMax)}</td>
                    <td data-label="Complejidad">
                      <span className={`complexity-pill ${s.complexity}`}>{COMPLEXITY_LABEL[s.complexity]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="coffee-section" id="coffee">
          <WaveDivider color="var(--bg)" />
          <div className="coffee-inner">
            <div className="coffee-media">
              <Image
                src="/catalogo/coffee-menu.jpg"
                alt="Menú de café y snacks de Adora: café negro, capuchino, caramel latte, matchas, salteñas, galleta y Coca-Cola"
                width={900}
                height={1600}
                sizes="(max-width: 860px) 90vw, 380px"
              />
            </div>
            <div>
              <div className="category-head">
                <h2>Coffee menu</h2>
                <p>Incluido en tu servicio — elegí tu bebida y snack favorito.</p>
              </div>
              <div className="coffee-list-group">
                <div className="coffee-list-label">Bebidas</div>
                <div className="coffee-list">
                  {COFFEE_DRINKS.map((d) => (
                    <span key={d.id}>{d.name}</span>
                  ))}
                </div>
              </div>
              <div className="coffee-list-group">
                <div className="coffee-list-label">Snacks</div>
                <div className="coffee-list">
                  {COFFEE_SNACKS.map((s) => (
                    <span key={s.id}>{s.name}</span>
                  ))}
                </div>
              </div>
              <p className="coffee-note">
                &ldquo;Disfrutá tu cita como una experiencia pensada con amor. Elegí tu bebida y snack favorito,
                incluido en tu servicio.&rdquo;
              </p>
            </div>
          </div>
          <WaveDivider color="var(--bg)" flip />
        </section>

        <section className="info-section container" id="info">
          <span className="eyebrow">Antes de tu cita</span>
          <h2>Información importante</h2>
          <div className="info-accordion">
            {OPERATIONAL_INFO.map((field) => (
              <details key={field.label}>
                <summary>
                  {field.label}
                  <span className="chevron" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <div className={`info-value ${field.value.startsWith("[") ? "pending" : ""}`}>{field.value}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta" id="reserva">
          <div className="container">
            <h2>¿Lista para tu próxima cita?</h2>
            <p>Escribinos por WhatsApp y coordinamos el servicio, la fecha y la hora que mejor te acomode.</p>
            <div className="final-cta-ctas">
              <WhatsAppCta message={WHATSAPP_GENERAL_MESSAGE} label="Agendá tu cita por WhatsApp" />
              <a className="whatsapp-btn ghost" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Seguinos en Instagram — {INSTAGRAM_HANDLE}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="catalog-footer">
        <p>Adora Nail Salon</p>
      </footer>
    </div>
  );
}
