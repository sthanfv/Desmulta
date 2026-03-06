# Reporte Maestro de Calidad y Pruebas — Desmulta v5.9.1 🛡️✅

TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’.

---

## 1. Filosofía de Calidad (MANDATO-FILTRO)

En Desmulta, la calidad no es opcional. Nuestra suite de pruebas garantiza que cada despliegue cumpla con los estándares de seguridad OWASP, performance de élite y una UX sin fricciones.

---

## 2. Auditoría de Pruebas Unitarias (Vitest)

Utilizamos **Vitest** para la validación ultra-rápida de la lógica de negocio y seguridad.

**Estado Actual:**

- **Suites Ejecutadas:** 3 (`security.test.ts`, `validation.test.ts`, `rate-limit.test.ts`)
- **Tests Ejecutados:** 10
- **Tests Pasados:** 10 ✅
- **Detalle por Suite:**
  - **Security (4/4):** CSP, Anti-Clickjacking, HSTS, Aislamiento.
  - **Validation (5/5):** Zod Schema, Honeypot Anti-Bot, RegEx Placa Carro/Moto.
  - **Rate Limit (1/1):** Bloqueo anti-DDoS (Error 429) verificado en local.

---

## 3. Auditoría de Pruebas de Humo E2E (Playwright)

Utilizamos **Playwright** para simular el comportamiento real del usuario en el navegador y validar la integridad del embudo de conversión (Lead Funnel).

**Suite de Pruebas:** `src/tests/e2e/funnel-smoke.spec.ts`

**Capacidades Auditadas:**

1. **Navegación Crítica:** Validación de carga de la landing page principal.
2. **Interacción Humana:** Simulación de movimientos de cursor para bypass de detección de bots.
3. **Flujo de 2 Pasos:**
   - **Paso 1 (Viabilidad):** Selección de antigüedad, tipo de multa y estado coactivo.
   - **Paso 2 (Lead Generation):** Entrada de Cédula, WhatsApp y Nombre.
4. **Validación de Éxito:** Detección de cierre de modal tras envío exitoso y persistencia de datos.

---

## 4. Infraestructura y Seguridad

- **Bypass Anti-Bots:** Los tests simulan micro-movimientos para validar que el sistema no bloquee usuarios reales mientras el **Honeypot** atrapa bots.
- **Edge Validation:** Las pruebas incluyen la verificación de las respuestas rápidas desde el Edge de Vercel.

---

## 5. Guía de Ejecución Técnica

### Pruebas Unitarias

```powershell
npm run test
```

### Pruebas de Humo (E2E)

_Nota: Requiere el servidor corriendo o habilitar el auto-start en config._

```powershell
npm run test:smoke
```

---

**"Código Seguro, Negocio Imbatible."**
**Desmulta © 2026 — Departamento de QA & Ciberseguridad**
