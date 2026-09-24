# Reglas de trabajo — Desmulta

Claude Code lee este archivo automáticamente al abrir el proyecto. Aquí van las reglas del
propietario para que no tenga que repetirlas en cada conversación.

## Comunicación

- Responder siempre en **español**. Los mensajes suelen llegar por dictado de voz: si una frase llega en inglés confuso, no es un cambio de idioma; preguntar si no se entiende.
- Ser breve y concreto. Explicar en palabras simples qué se hizo y qué falta.

## Git

- Trabajar **directo en `main`**: sin ramas ni pull requests. Probar, commit y push a `main`.
- Mensajes de commit **siempre en español**.
- **Nunca** subir la versión (`package.json`, `AdminDashboard.tsx`, `global-error.tsx`) ni agregar releases a `src/lib/changelog.ts` sin orden explícita ("actualizar versión", "cerrar feature", "crear changelog").
- No subir: `.env`, archivos `.patch` con secretos, videos de prueba, `public/sw.js`/`workbox-*` regenerados por el build, `playwright-report/`.

## Documentación (obligatorio en cada tarea)

- `MEMORY.md` (raíz) es la **bitácora** del proyecto: agregar una entrada fechada con qué cambió, por qué, dónde y qué queda pendiente, y actualizar "Estado Actual" y "Metas Pendientes". Va en el mismo commit que el código.
- Actualizar los `.md` de `docs/` afectados (p. ej. `docs/CHAT_ARCHITECTURE.md`, `docs/MOBILE_APP_SHELL.md`) y la sección "[Sin versión]" de `docs/CHANGELOG.md`.

## Variables de entorno

- Los valores reales van **solo en `.env`** (ignorado por Git). No crear `.env.local`. `.env.example` solo lleva valores de ejemplo.
- Nunca imprimir secretos en la terminal ni escribirlos en el código.

## Validación proporcional (la máquina de desarrollo es modesta: 2 núcleos)

| Cambio                                                    | Qué correr                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Pequeño (estilos, textos, un componente)                  | `tsc`, `eslint` de los archivos tocados y sus tests; el hook de Husky lo repite al hacer commit |
| Mediano (función nueva, varias páginas, layout)           | Lo anterior + `npm run build` o solo el spec E2E afectado con `--workers=1`                     |
| Grande o de riesgo (pagos, auth, seguridad, dependencias) | `npm run validate` por pasos, en primer plano, nunca todo en paralelo                           |

- Cero advertencias: `eslint --max-warnings 0`, build de Next.js sin "Compiled with warnings".
- Husky (pre-commit): lint-staged (eslint, prettier, `vitest related`) + `tsc`. Tarda varios minutos; no es un cuelgue.
- Vercel compila en cada push a `main`.

## Mapa rápido

- Web: Next.js 15 (App Router) en `src/`. Cloud Functions en `functions/`.
- Agente de IA: repo hermano `../desmulta-ai-agent` (FastAPI en Cloud Run, despliegue automático desde GitHub). Ver `docs/CHAT_ARCHITECTURE.md`.
- OCR de respaldo: `../Lector-OCR`.
- Modo app en teléfono: `src/components/mobile/`. Ver `docs/MOBILE_APP_SHELL.md`.
- Auditoría de seguridad 2026-09-22: `docs/auditoria-2026-09-22/`.
