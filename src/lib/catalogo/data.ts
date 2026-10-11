// Data for the public /catalogo page. Prices and service names come verbatim
// from Adora's own menu renders — never edit those without checking the
// source images in public/catalogo/. Durations are proposed estimates (the
// business hasn't confirmed exact times), explicitly labeled as such in the
// UI; every duration stays under 150 min (2h30) per the brief, and
// "elaborado" variants are always longer than "sencillo"/"básico" ones.

export type Complexity = "baja" | "media" | "alta";

export type CatalogService = {
  id: string;
  name: string;
  price: number; // colones
  note?: string; // what's included, e.g. the lifting de cejas bundle
  durationMin: number;
  durationMax: number;
  complexity: Complexity;
};

export type CatalogCategory = {
  id: string;
  label: string;
  tagline: string;
  image: { src: string; alt: string };
  services: CatalogService[];
};

export const CATEGORIES: CatalogCategory[] = [
  {
    id: "cejas-pestanas",
    label: "Cejas y pestañas",
    tagline: "Mirada definida, de forma natural o con más intensidad — vos elegís.",
    image: { src: "/catalogo/cejas-pestanas.jpg", alt: "Menú de servicios de cejas y pestañas de Adora" },
    services: [
      { id: "bigote", name: "Depilación de bigote", price: 5000, durationMin: 15, durationMax: 20, complexity: "baja" },
      { id: "cejas", name: "Depilación de cejas", price: 12000, durationMin: 20, durationMax: 30, complexity: "baja" },
      {
        id: "lifting-cejas",
        name: "Lifting de cejas",
        note: "Incluye lifting, diseño, tinte y depilación",
        price: 18000,
        durationMin: 45,
        durationMax: 60,
        complexity: "media",
      },
      { id: "lifting-pestanas", name: "Lifting de pestañas", price: 25000, durationMin: 60, durationMax: 75, complexity: "media" },
      {
        id: "lifting-pestanas-koreano",
        name: "Lifting de pestañas koreano",
        price: 28000,
        durationMin: 75,
        durationMax: 90,
        complexity: "alta",
      },
    ],
  },
  {
    id: "pedicure",
    label: "Pedicure",
    tagline: "Pies consentidos, con el acabado que prefieras: seco, spa o jelly.",
    image: { src: "/catalogo/pedicure.jpg", alt: "Menú de servicios de pedicure de Adora" },
    services: [
      { id: "ped-esmaltado", name: "Esmaltado semipermanente", price: 12000, durationMin: 45, durationMax: 60, complexity: "baja" },
      { id: "ped-seco", name: "Pedi en seco", price: 18000, durationMin: 60, durationMax: 75, complexity: "media" },
      { id: "ped-jelly", name: "Jelly Spa", price: 25000, durationMin: 75, durationMax: 90, complexity: "media" },
      { id: "ped-spa", name: "Pedi Spa", price: 22000, durationMin: 75, durationMax: 90, complexity: "media" },
      { id: "ped-retiro", name: "Retiro de otro salón", price: 3500, durationMin: 15, durationMax: 20, complexity: "baja" },
    ],
  },
  {
    id: "manicure",
    label: "Manicure",
    tagline: "Builder Gel, Gel X, Polygel o Luminary — con el diseño que imagines.",
    image: { src: "/catalogo/manicure.jpg", alt: "Menú de servicios de manicure de Adora" },
    services: [
      { id: "man-builder-sencillo", name: "Builder Gel, diseño sencillo", price: 18000, durationMin: 90, durationMax: 105, complexity: "media" },
      { id: "man-builder-basico", name: "Builder Gel, diseño básico", price: 20000, durationMin: 105, durationMax: 120, complexity: "media" },
      { id: "man-builder-elaborado", name: "Builder Gel, diseño elaborado", price: 22000, durationMin: 120, durationMax: 150, complexity: "alta" },
      { id: "man-gelx-elaborado", name: "Gel X, diseño elaborado", price: 24000, durationMin: 120, durationMax: 150, complexity: "alta" },
      { id: "man-gelx-basico", name: "Gel X, diseño básico", price: 22000, durationMin: 105, durationMax: 120, complexity: "media" },
      { id: "man-gelx-sencillo", name: "Gel X, diseño sencillo", price: 20000, durationMin: 90, durationMax: 105, complexity: "media" },
      { id: "man-polygel", name: "Polygel", price: 22000, durationMin: 105, durationMax: 120, complexity: "media" },
      { id: "man-luminary-sencillo", name: "Luminary, diseño sencillo", price: 17000, durationMin: 75, durationMax: 90, complexity: "baja" },
      { id: "man-luminary-basico", name: "Luminary, diseño básico", price: 19000, durationMin: 90, durationMax: 105, complexity: "media" },
      { id: "man-luminary-elaborado", name: "Luminary, diseño elaborado", price: 21000, durationMin: 120, durationMax: 150, complexity: "alta" },
      { id: "man-spa", name: "Manicure Spa", price: 10000, durationMin: 45, durationMax: 60, complexity: "baja" },
      { id: "man-retiro", name: "Retiro de otro salón", price: 3500, durationMin: 15, durationMax: 20, complexity: "baja" },
    ],
  },
];

export const ALL_SERVICES: (CatalogService & { categoryLabel: string })[] = CATEGORIES.flatMap((cat) =>
  cat.services.map((s) => ({ ...s, categoryLabel: cat.label })),
);

export type CoffeeItem = { id: string; name: string };

export const COFFEE_DRINKS: CoffeeItem[] = [
  { id: "cafe-negro", name: "Café negro" },
  { id: "capuchino", name: "Capuchino" },
  { id: "caramel-latte", name: "Caramel latte" },
  { id: "coconut-matcha", name: "Coconut matcha" },
  { id: "strawberry-matcha", name: "Strawberry matcha" },
  { id: "matcha-latte", name: "Matcha latte" },
];

export const COFFEE_SNACKS: CoffeeItem[] = [
  { id: "saltenas", name: "Salteñas" },
  { id: "galleta", name: "Galleta" },
  { id: "coca-cola", name: "Coca-Cola" },
];

// Set this once the business confirms a WhatsApp Business number (digits
// only, country code included — e.g. "50688887777"). Every CTA on the page
// falls back to a clearly-marked "pendiente de confirmar" state until then,
// instead of linking to a guessed number.
export const WHATSAPP_NUMBER = "";
export const PENDING_LABEL = "[PENDIENTE DE CONFIRMAR]";

export function whatsappLink(message: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_GENERAL_MESSAGE = "Hola, quiero agendar una cita en Adora.";

export function whatsappMessageForService(serviceName: string): string {
  return `Hola, quiero reservar ${serviceName}. ¿Qué disponibilidad tienen?`;
}

export function whatsappMessageForCategory(categoryLabel: string): string {
  return `Hola, quiero agendar un servicio de ${categoryLabel.toLowerCase()} en Adora.`;
}

export const COMPLEXITY_LABEL: Record<Complexity, string> = { baja: "Sencillo", media: "Intermedio", alta: "Elaborado" };

export function formatColones(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

export function formatDuration(min: number, max: number): string {
  if (min === max) return `${min} min`;
  if (max - min <= 5) return `${min} min aprox.`;
  return `${min}–${max} min`;
}

export type OperationalField = { label: string; value: string };

// None of this was provided — every value is the literal placeholder the
// brief asks for, not a guess. Fill these in from the real business info
// before this page goes live.
export const OPERATIONAL_INFO: OperationalField[] = [
  { label: "Horarios", value: PENDING_LABEL },
  { label: "Ubicación", value: PENDING_LABEL },
  { label: "WhatsApp", value: PENDING_LABEL },
  { label: "Instagram", value: PENDING_LABEL },
  { label: "Métodos de pago", value: PENDING_LABEL },
  { label: "Política de cancelación", value: PENDING_LABEL },
  { label: "Tolerancia de llegada", value: PENDING_LABEL },
  { label: "Reprogramación", value: PENDING_LABEL },
  { label: "Reservas", value: PENDING_LABEL },
  { label: "Retoques", value: PENDING_LABEL },
  { label: "Condiciones de los retiros", value: PENDING_LABEL },
];
