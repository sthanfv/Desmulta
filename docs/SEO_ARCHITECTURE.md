# Arquitectura SEO - Desmulta

## 1. Visión General

Este documento detalla la estrategia de optimización para motores de búsqueda (SEO) integrada de forma nativa en la arquitectura Next.js (App Router) de Desmulta. Todo el sistema está diseñado para maximizar el posicionamiento orgánico a **costo cero**, basándose en _Server-Side Generation_ (SSG), metadatos estructurados (JSON-LD) y optimización de _Core Web Vitals_.

## 2. Generación Dinámica de Rutas (SSG)

Desmulta utiliza generación de rutas estáticas para atrapar búsquedas locales (Long-Tail SEO).

- **Ruta:** `src/app/multas/[ciudad]/page.tsx`
- **Ruta:** `src/app/servicios/[ciudad]/page.tsx`

Estas rutas permiten que cuando un usuario en Google busque "Fotomultas en Medellín" o "Impugnar comparendo en Bogotá", el sistema ya tenga un archivo HTML estático compilado y ultra-rápido listo para ser servido por el CDN de Vercel.

### 2.1. Cero JavaScript Bloqueante

Para asegurar que los Googlebots lean todo el contenido sin renderizar JavaScript:

1. El contenido principal es renderizado en Servidor (`Server Components`).
2. Las interacciones están delegadas a un `Client Component` (`<HomeClient />`), el cual se "hidrata" posteriormente.
3. Se evita el uso de `headers()` dinámicos en la raíz para permitir que la ruta completa pueda ser cacheada (SSG puro).

## 3. Schema.org y JSON-LD

Para habilitar los _Rich Snippets_ (Resultados Enriquecidos) en la página de resultados de Google (SERP), inyectamos un script JSON-LD directamente en `<head>`:

- **`@type: LegalService`:** Informa a Google que Desmulta es una organización legal (abogados/trámites).
- **`@type: FAQPage`:** Habilita que las preguntas frecuentes aparezcan como menús desplegables debajo del link azul en Google.
- **`@type: BreadcrumbList`:** Estructura la jerarquía de navegación.

_Ubicación del código:_ `src/app/page.tsx`

## 4. Metadata Dinámica (OpenGraph & Twitter Cards)

En `src/app/layout.tsx` se encuentra el objeto global `export const metadata: Metadata`.

- Define automáticamente imágenes compartibles (`og-image.png`).
- Aplica etiquetas canónicas (`canonical`) para evitar que Google penalice por "Contenido Duplicado" si la web se abre desde dominios alternos (ej. los dominios `.vercel.app`).
- Restringe la indexación al dominio en producción (`desmulta.online`).

## 5. Mapas de Sitio y Rastreo

- **`src/app/sitemap.ts`:** Genera dinámicamente un archivo XML en `desmulta.online/sitemap.xml` que lista todas las páginas (incluyendo el blog y las rutas de ciudades).
- **`src/app/robots.ts`:** Autoriza a los rastreadores (`Googlebot`, `Bingbot`) a indexar la página.

## 6. Política de Rendimiento Móvil (Mobile-First)

Google prioriza webs móviles (`Mobile-First Indexing`). Por lo tanto, en Desmulta:

- Las animaciones pesadas de JavaScript (como `framer-motion` en `MeshBackground.tsx`) están **bloqueadas en dispositivos móviles** vía CSS puro (`md:hidden`).
- Esto garantiza 60 FPS al hacer _scroll_ en celulares Android de gama baja, previniendo abandonos por _Scroll Jank_, mejorando el indicador LCP (Largest Contentful Paint) y bajando la tasa de rebote.

---

> **MANDATO-FILTRO (Advertencia para Desarrolladores):**
> Nunca agregues componentes interactivos puros (Client Components) que descarguen librerías pesadas en el árbol superior de la web si no usan `next/dynamic`. Todo recurso pesado (como el motor OCR) DEBE ser cargado en diferido (Lazy Load) para no penalizar el SEO.
