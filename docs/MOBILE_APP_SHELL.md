# 📱 Modo app en teléfono (MobileAppShell)

> Creado: 2026-09-24. En pantallas menores a 768 px Desmulta se comporta como una app nativa,
> sin instalación (la PWA sigue siendo opcional). En escritorio no se muestra nada de esto.

## Piezas

| Archivo                                               | Qué hace                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/components/mobile/app-shell.ts`                  | Lógica pura: rutas incluidas/excluidas, pestaña activa, títulos, acciones Consultar/Asistente, vibración |
| `src/components/mobile/MobileAppShell.tsx`            | Barra de pestañas, barras superiores, paneles Consultar y Más, transición de pantalla                    |
| `src/components/mobile/MobileQuickActions.tsx`        | Accesos rápidos del Inicio (Consultar gratis, Subir foto, Calculadora, Asistente IA)                     |
| `src/app/globals.css` (bloque "Modo app en teléfono") | Espacio para las barras, oculta cabeceras de escritorio, animación                                       |
| `src/tests/mobile-app-shell.test.tsx`                 | Pruebas de todo lo anterior                                                                              |

Se monta una sola vez en `src/app/layout.tsx`.

## Pestañas

- **Inicio** → `/` (si ya estás en Inicio, sube al principio).
- **Mi caso** → `/estado` (también se resalta en `/seguir/[id]`).
- **Consultar** (botón central) → panel con dos opciones: formulario completo o foto del comparendo + teléfono. En Inicio abre el modal con el evento `open-consultation-modal`; en otra página navega a `/?action=consultar&modo=full|simit`, que `HomeClient` lee al montar.
- **Asistente** → chat a pantalla completa. Evento `open-chat-assistant` en Inicio o `/?action=asistente` desde otra página (el chat vive en Inicio).
- **Más** → calculadora, plantillas, guía legal, FAQ, servicios, referidos, WhatsApp, modo claro/oscuro, privacidad y términos.

## Barras superiores

- **Inicio:** marca DESMULTA; al bajar más de 20 px se recoge y queda solo el escudo (igual que la cabecera de escritorio).
- **Páginas internas:** flecha atrás + título (`titleFor`). Sin historial previo, la flecha lleva a Inicio. El título es texto, no `h1`: cada página conserva su único `h1`.

## Cómo convive con el escritorio

- La carcasa es `md:hidden` y marca la página con `[data-app-shell]`. El CSS usa `body:has([data-app-shell])` para, solo en teléfono:
  - dejar espacio abajo para la barra de pestañas;
  - ocultar los elementos marcados con `data-desktop-header` (cabecera de Inicio y cabeceras propias de las páginas internas);
  - dejar espacio arriba en páginas internas (`[data-app-topbar='inner']`).
- Las páginas internas usan `pt-6 md:pt-36`: en escritorio el espacio es el de siempre.
- `viewportFit: 'cover'` en el layout: sin eso `env(safe-area-inset-*)` vale 0 y las barras quedan bajo el notch.

## Rutas excluidas

`/admin`, `/acceso-panel`, `/vip`, `/documentos`, `/api-docs`, `/test-flujo`, `/logout`, `/geo-bloqueado`, `/offline`, `/_escudo-simit`. Para excluir otra, agregarla a `EXCLUDED_PREFIXES` en `app-shell.ts`.

## Agregar una página interna

1. Si la página tiene cabecera propia, añadir `data-desktop-header` al `<header>` y usar `pt-6 md:pt-XX` en el contenedor principal.
2. Agregar su título en `TITLES` (`app-shell.ts`) y un caso en el test.

## Decisiones

- **SEO mobile-first:** no se oculta contenido en teléfono; solo se reorganiza (Google indexa la versión móvil).
- **Transición solo de opacidad:** un `transform` sobre `#main-content` convertiría a ese contenedor en referencia de los elementos `position: fixed` de su interior mientras dura la animación.
- **Vibración:** `navigator.vibrate` (solo Android; en iOS no hace nada).
