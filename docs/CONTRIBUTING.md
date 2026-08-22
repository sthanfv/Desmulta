# Guía de Contribución — Desmulta

> **REGLA DE ORO:** Todo cambio de código que altere lógica de negocio, seguridad o flujos de notificación **DEBE** actualizar el archivo `.md` correspondiente en `docs/` en el mismo commit. Sin excepción.

---

## 📋 Qué actualizar en docs/ según el tipo de cambio

| Cambias esto...                                 | Actualiza este archivo                                             |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| Flujo de notificaciones (email, push, Telegram) | `docs/architecture.md` sección 3 + `docs/MEMORY.md`                |
| Seguridad (rate limit, auth, validación, rules) | `docs/architecture.md` sección 4 + `docs/CHANGELOG.md`             |
| Cloud Functions (triggers, lógica)              | `docs/architecture.md` sección 5 + `docs/TELEGRAM_CRM_PIPELINE.md` |
| Variables de entorno                            | `docs/architecture.md` sección 6                                   |
| Kanban / Panel admin                            | `docs/admin-manual.md`                                             |
| Portal VIP / SIMIT                              | `docs/architecture.md` + `docs/MEMORY.md`                          |
| Bug fix importante                              | `docs/CHANGELOG.md` bajo `[version actual]`                        |
| Nueva feature                                   | `docs/CHANGELOG.md` + `docs/MEMORY.md` (nueva sesión)              |
| Cualquier cambio                                | `docs/CHANGELOG.md` siempre                                        |

---

## 1. Prerrequisitos

- Node.js v20 LTS
- Variables de entorno configuradas (ver `docs/architecture.md` sección 6)
- Leer `docs/architecture.md` y `docs/MEMORY.md` completos antes del primer cambio

---

## 2. Flujo de trabajo

```
rama-feature → cambios código → actualizar docs/ → tests → PR → merge
```

1. **Crea una rama:**
   - `feature/descripcion` — nueva funcionalidad
   - `fix/descripcion` — corrección de bugs
   - `security/descripcion` — parche de seguridad
   - `docs/descripcion` — solo documentación
   - `chore/descripcion` — mantenimiento

2. **Haz el cambio** y actualiza `docs/` en el mismo commit.

3. **Suite completa antes del PR:**

   ```bash
   npm run format && npm run lint && npm run typecheck && npm run test -- --run && npm run build
   ```

4. **PRs rechazados si:** No hay docs actualizada · Tests fallan · Build roto.

---

## 3. Commits (Conventional Commits)

```
<tipo>(<alcance>): <descripción en español>
```

| Tipo       | Cuándo                            |
| ---------- | --------------------------------- |
| `feat`     | Nueva funcionalidad               |
| `fix`      | Corrección de bug                 |
| `security` | Parche de seguridad / hardening   |
| `docs`     | Solo archivos `.md` o comentarios |
| `perf`     | Mejora de rendimiento             |
| `refactor` | Cambio sin alterar comportamiento |
| `test`     | Añadir o corregir tests           |
| `chore`    | Deps, configs, CI                 |

**Ejemplos:**

```
feat(vip): agregar validación de propiedad en endpoint web-push
fix(push): corregir early return que bloqueaba push en usuarios SIMIT
security(rate-limit): migrar VIP auth de Map a Firestore
docs(architecture): actualizar diagrama de flujo de notificaciones
```

---

## 4. Checklist antes de hacer merge

- [ ] Tests pasan (`npm run test -- --run`)
- [ ] Build sin errores (`npm run build`)
- [ ] `docs/CHANGELOG.md` actualizado con el cambio
- [ ] Si cambió arquitectura: `docs/architecture.md` actualizado
- [ ] Si cambió el CRM/Telegram: `docs/TELEGRAM_CRM_PIPELINE.md` actualizado
- [ ] Si cambió el panel admin: `docs/admin-manual.md` actualizado
- [ ] Si es un cambio de sesión importante: `docs/MEMORY.md` tiene nueva entrada
- [ ] Variables de entorno nuevas documentadas en `docs/architecture.md` sección 6
- [ ] Sin `console.log` de debug en producción
- [ ] Sin `TODO` sin issue asociado

## ?? Flujo DevSecOps (Husky & Testing Aislado)

1. **Pre-commit:** Al hacer git commit, el sistema \lint-staged\ correra formateo y un testeo aislado (\itest related\) UNICAMENTE en los archivos que acabas de modificar. Esto acelera tu trabajo a ~14 segundos.
2. **Pre-push:** Todos los tests pesados o monoliticos fueron delegados al sistema CI/CD en la nube para no bloquear tu maquina local.
3. Esta ESTRICTAMENTE PROHIBIDO usar las banderas \--no-verify\ para saltar las revisiones de pre-commit.
