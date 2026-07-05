# Desmulta — Motor de Justicia Vial v1.0.0

[![CI](https://github.com/sthanfv/Desmulta/actions/workflows/ci.yml/badge.svg)](https://github.com/sthanfv/Desmulta/actions/workflows/ci.yml)
[![Versión](https://img.shields.io/badge/versión-1.0.0-gold)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-140%20passing-brightgreen)](#)
[![Protocolo](https://img.shields.io/badge/protocolo-MANDATO--FILTRO-blue)](#)

Plataforma serverless de análisis jurídico vial para ciudadanos colombianos. 
Analiza multas de tránsito mediante OCR local, aplica heurística legal determinista y gestiona expedientes con arquitectura **Zero-PII**.

---

## 🚀 Quickstart

```bash
git clone https://github.com/sthanfv/Desmulta.git
cd Desmulta
npm ci
cp .env.example .env
npm run dev # -> http://localhost:9005
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | Next.js 15 (React 19, App Router, Turbopack) |
| **Infraestructura** | Firebase (Auth, Firestore, Cloud Functions Gen2) |
| **OCR** | Tesseract.js 7 (100% Client-side Worker) |
| **Seguridad** | RSA-OAEP Encryption + SHA-256 Hashing |
| **QA** | Vitest + Playwright E2E |

---

## 📂 Estructura de Documentación

Toda la documentación técnica se encuentra centralizada en la carpeta `/docs`:

- [**Arquitectura y API**](ARCHITECTURE.md): Topología, diagramas Mermaid, guía de setup y referencia de endpoints.
- [**Referencia de API B2B**](API_B2B.md): Arquitectura del gateway, 9 capas de validación, planes, rate limits, especificaciones de endpoints y guía de activación comercial en vivo.
- [**Legal y Cumplimiento**](LEGAL.md): Marco jurídico, política de privacidad Zero-PII y reporte de vulnerabilidades.
- [**Idempotencia y Seguridad**](IDEMPOTENCIA_SEGURIDAD.md): Arquitectura de control de concurrencia, idempotencia de pasarela (Wompi) y mitigación de doble clic.
- [**Memoria del Proyecto**](MEMORY.md): Log histórico de sesiones, decisiones técnicas y deuda técnica.
- [**Cambios (Changelog)**](CHANGELOG.md): Registro histórico de versiones y mejoras.
- [**Contribución**](CONTRIBUTING.md): Guía para desarrolladores y estándares de código.

---

## 🛡️ Principios del Sistema

1. **Zero-PII Storage**: Los datos sensibles nunca persisten de forma legible.
2. **Costo Cero**: OCR en el dispositivo del usuario. Sin APIs de IA pagas.
3. **Determinismo**: El motor legal es código puro y auditable, sin alucinaciones de LLMs.
4. **Seguridad por Diseño**: Cifrado E2EE desde el navegador hasta el núcleo del servidor.

---

## 🧪 Pruebas (Testing)

El proyecto cuenta con una suite completa de pruebas unitarias, de integración y de seguridad.

### Ejecución Estándar (Entornos potentes):
```bash
npm run test:integration  # Corre la suite de integración en emuladores
npm run test              # Ejecuta Vitest en modo interactivo
```

### Ejecución en Entornos de Recursos Limitados (CPU / RAM ajustados):
Si ejecutas los tests en una máquina de desarrollo con pocos recursos (por ejemplo, 2 núcleos físicos o menos de 8 GB de RAM libres), la ejecución paralela por defecto de Vitest puede causar desbordamiento de memoria (*JavaScript heap out of memory*). 

Para estos casos, utiliza el comando optimizado secuencial que limita el tamaño del heap de Node.js a 2 GB y desactiva la paralelización de archivos:
```bash
npm run test:local
```

---

*Desmulta v1.0.0 — EQUIPO DE DESARROLLO ÉLITE activo*
