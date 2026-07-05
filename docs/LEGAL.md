# Marco Legal y de Seguridad — Desmulta v8.12.0

Este documento consolida las políticas de cumplimiento jurídico, privacidad y seguridad de la plataforma Desmulta, bajo los estándares del protocolo **MANDATO-FILTRO**.

---

## 1. Motor Jurídico Dinámico (Fase II)

### 1.1. Arquitectura de "Rompecabezas Legal"
Desde la versión 8.10.0, el sistema utiliza una arquitectura modular para el ensamblado de documentos legales. Ya no se utilizan plantillas estáticas; en su lugar, el sistema combina fragmentos jurídicos validados:

- **Cuerpo Legal:** Basado en el tipo de infracción (Fotomulta, Retén, SIMIT).
- **Bloque de Jurisprudencia:** Inyección de Sentencias de la Corte Constitucional (C-038 de 2020, etc.).
- **Protocolo Ley 2213:** Aplicación de términos de notificación digital para procesos administrativos.
- **Declaración de Indemnidad:** Blindaje para el operador ante variaciones en la información del ciudadano.

### 1.2. Heurística de Sugerencia Inteligente
El sistema realiza un triaje automático basado en tres variables críticas:
1. **Antigüedad del Comparendo:** (>3 años = Prescripción, <3 años = Caducidad/Debido Proceso).
2. **Estado Coactivo:** Detección de mandamientos de pago para activar defensas de nulidad.
3. **Tipo de Infracción:** Diferenciación entre fotodetección y comparendos con agente.

---

## 2. Niveles de Radicación (Data Bridge)

| Nivel | Condición | Acción del Operador |
|---|---|---|
| **1. Firma Electrónica** | Validación OTP o firma Canvas completada. | Envío con "Anexo Probatorio de Ley 527". El sistema certifica la autoría digital del ciudadano. |
| **2. Agencia Oficiosa** | Aprobación sin posibilidad de firma física/OTP. | El operador radica desde correo institucional asumiendo autoría bajo Art. 2304 C.C. |
| **3. Hard Stop** | Sin registro de aprobación explícita. | **Cierre inmediato del ticket**. Prohibido operar de oficio sin rastro en Firestore. |

---

## 3. Política de Seguridad (Zero-Trust)

### 3.1. Soporte de Versiones
Solo se brinda soporte de seguridad para la rama principal activa.

| Versión | Estado |
|---------|-----------|
| **v8.12.x** | ✅ Soporte Total (Motor Jurídico Dinámico + Zero-PII) |
| **v1.0.0** | ✅ Soporte (Semáforo Ciudadano) |
| **< v8.0** | ❌ Depreciado |

### 3.2. Cifrado y Protección de Datos
- **Compatibilidad Helvetica:** El motor de PDF normaliza automáticamente caracteres especiales para evitar errores de renderizado en fuentes estándar.
- **Sanitización de PII:** El `SecurityLogger` intercepta y anonimiza datos personales en logs de error antes de su persistencia.

---

## 4. Principios de Privacidad (MANDATO-FILTRO)

- **Zero-PII Storage:** Las imágenes de evidencias y datos sensibles nunca persisten de forma indefinida. Se procesan y se destruyen tras el ciclo de vida del caso.
- **Cifrado E2EE:** Los datos del formulario viajan cifrados desde el navegador hasta el núcleo del servidor.
- **Destrucción Atómica:** Limpieza semanal de metadatos no esenciales para cumplimiento de la política de efimeridad.
