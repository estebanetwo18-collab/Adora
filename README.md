# Agenda Adora

Calendario de citas para Adora Nail Salon: agenda, edita y elimina citas,
clientas (con perfil e historial), equipo y servicios. Todo se guarda en
Redis y se sincroniza entre quienes tengan la página abierta.

Este proyecto es independiente del sitio web principal de Bold Agency —
vive en su propio repositorio y se despliega como su propio proyecto de
Vercel, con su propio dominio.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completá las variables de Redis, ver abajo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Base de datos

Usa [Upstash Redis](https://upstash.com) a través de la integración de
Redis del Vercel Marketplace (el producto "Vercel KV" está deprecado).
Sin `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` configuradas,
la página muestra un aviso explicando qué falta, en vez de romperse.

## Desplegar en Vercel

1. Importá este repositorio en [vercel.com/new](https://vercel.com/new) — se
   detecta como proyecto Next.js sin tocar nada.
2. Storage → Marketplace → Redis (Upstash) → conectalo a este proyecto.
3. Deployments → el más reciente → **Redeploy**, para que tome las
   variables que se acaban de agregar.

## Estructura

- `src/app/page.tsx` — la página (calendario + modales).
- `src/components/adora-agenda/AgendaApp.tsx` — toda la interfaz y su estado.
- `src/app/api/adora-agenda/**` — rutas API (citas, clientas, equipo, servicios).
- `src/lib/adora-agenda/` — tipos, validación (zod) y acceso a Redis.
