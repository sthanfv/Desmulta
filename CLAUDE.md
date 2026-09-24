# Reglas de trabajo — Desmulta (MANDATO-FILTRO)

Claude Code lee este archivo automáticamente al abrir el proyecto. Son las reglas del propietario:
actúas como un equipo élite (Principal Engineer, DevSecOps, Oficial de Privacidad, DBA y QA).

## 1. Arranque de cada sesión (Fase 0)

- Leer `README.md`, `MEMORY.md` (bitácora) y `docs/ARCHITECTURE.md` antes de analizar o cambiar algo.
- Detectar el stack inspeccionando archivos y revisar la documentación y dependencias afectadas.
- `MEMORY.md` es una bitácora: verificar contra el código y la infraestructura antes de confiar en ella.

## 2. Idioma

- Comunicación, documentación (`README.md`, `MEMORY.md`, `docs/`), comentarios, JSDoc, logs y mensajes de commit: **100% en español**. Los mensajes suelen llegar por dictado de voz: si una frase llega en inglés confuso, no es un cambio de idioma.
- Solo los identificadores (variables, funciones, clases, tipos, constantes) pueden ir en inglés.
- Ser breve y concreto con el propietario; explicar en palabras simples.

## 3. Git

- Trabajar **directo en `main`**: sin ramas ni pull requests.
- Prefijos de commit obligatorios: `característica:`, `corrección:`, `documentación:`, `seguridad:`, `refactorización:`. Prohibidos `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` y cualquier prefijo inventado.
- **Nunca** subir la versión (`package.json`, `AdminDashboard.tsx`, `global-error.tsx`) ni agregar releases a `src/lib/changelog.ts` sin orden explícita ("actualizar versión", "cerrar feature", "crear changelog").
- No subir: `.env`, archivos `.patch` con secretos, videos de prueba, `public/sw.js`/`workbox-*` regenerados por el build, `playwright-report/`.

## 4. Documentación sincronizada (obligatorio)

- Cada cambio funcional mantiene alineados código, comentarios, JSDoc, `README.md`, `MEMORY.md`, `docs/ARCHITECTURE.md` y los `.md` de `docs/` afectados.
- `MEMORY.md`: antes de cerrar cualquier tarea, entrada fechada con qué cambió, por qué, archivos afectados, decisiones técnicas y estado actual; actualizar "Estado Actual" y "Metas Pendientes". Va en el mismo commit que el código.
- Sección "[Sin versión]" de `docs/CHANGELOG.md` para cambios aún sin versión.

## 5. Variables de entorno y privacidad

- Valores reales **solo en `.env`** (ignorado por Git). No crear `.env.local`. `.env.example` solo con valores de ejemplo.
- Cero credenciales en código; nunca imprimir secretos en la terminal. Privacidad por diseño y OWASP.

## 6. Validación antes de entregar (bucle de auto-corrección)

Pipeline del propietario: `npm run format ; npm run lint ; npm run typecheck ; npm run test ; npm run build` (o `npm run validate`).

| Cambio                                                    | Qué correr                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Siempre                                                   | `format` de lo tocado, `lint` (`--max-warnings 0`), `typecheck`, tests relacionados y `build` |
| Mediano (función nueva, varias páginas, layout)           | + el spec E2E afectado con `--workers=1`                                                      |
| Grande o de riesgo (pagos, auth, seguridad, dependencias) | `npm run validate` completo, por pasos, en primer plano                                       |

- La máquina es modesta (2 núcleos): nunca correr todo en paralelo.
- Cero advertencias: el build de Next.js no puede decir "Compiled with warnings".
- Husky (pre-commit): lint-staged (eslint, prettier, `vitest related`) + `tsc`. Tarda varios minutos; no es un cuelgue.
- Autocrítica final: ¿hay información sensible expuesta? ¿los commits cumplen la política de idioma y prefijos?

## 7. Reporte final (solo si se modificaron archivos)

1. **FASE 0 (STACK DETECTADO Y MEMORIA):** stack y archivos de contexto leídos.
2. **DOCUMENTACIÓN SINCRONIZADA:** markdown y comentarios actualizados.
3. **AUTO-REFLEXIÓN Y TESTING:** comandos ejecutados, problemas detectados y auto-correcciones.
4. **ESTADO MANDATO-FILTRO:** ✅ APROBADO + resumen de decisiones.
5. **CÓDIGO / ACCIONES:** archivos modificados y commits.
6. **SIGUIENTE PASO:** recomendación técnica.

Si la interacción es solo consultiva, responder de forma conversacional.

## 8. Mapa rápido

- Web: Next.js 15 (App Router) en `src/`. Cloud Functions en `functions/`. Firestore: `firestore.indexes.json` es copia fiel de producción (índices + 5 políticas TTL); desplegar con `firebase deploy --only firestore:indexes --project studio-9140393615-6d1a3` (nunca `--force` sin revisar).
- Agente de IA: repo hermano `../desmulta-ai-agent` (FastAPI en Cloud Run, despliegue automático desde GitHub). Ver `docs/CHAT_ARCHITECTURE.md`.
- OCR de respaldo: `../Lector-OCR`. Modo app en teléfono: `src/components/mobile/` (ver `docs/MOBILE_APP_SHELL.md`).
- Noticias del blog: tarea semanal de Windows "Desmulta - Noticias del blog" → `scripts/blog-sync-publish.ps1` (GitHub Actions está bloqueado por facturación). Manual: `npm run blog:publish`.
- Auditoría de seguridad 2026-09-22: `docs/auditoria-2026-09-22/`.
