# Plan de Implementación: Verificador Automático SIMIT (Radar)

**Estado:** Planeado / En espera de validación comercial.
**Cédula de prueba asignada:** `88145123` (Confirmada con multas activas).

## Descripción del Proyecto
Implementar un sistema de "Scraping Ético" del SIMIT que consulte periódicamente las multas de tránsito por número de documento (Cédula) y notifique a los usuarios suscritos antes de que las notificaciones físicas lleguen a sus casas.

---

## 1. Infraestructura y Costos (El reto de Vercel)
Vercel (donde está alojada la web de Desmulta) tiene un límite estricto de 50MB para sus funciones *Serverless*. Un navegador "fantasma" (Playwright o Puppeteer) necesario para consultar el SIMIT pesa más de 150MB.
*   **Solución a futuro:** El scraper deberá ser un script local de Node.js o alojarse en un servidor VPS económico independiente (ej. Render, Railway, DigitalOcean por ~$5/mes).
*   **Condición Comercial:** Este desarrollo queda en pausa hasta tener validación de mercado (clientes dispuestos a pagar por el servicio), para justificar la infraestructura adicional.
*   **Monetización (Wompi):** Utilizar la API de Wompi para **Pagos Recurrentes** (tokenización de tarjetas), permitiendo cobrar una suscripción mensual/anual de forma automática a los usuarios del Radar SIMIT.

---

## 2. Base de Datos (Firestore)

Cuando se implemente, se crearán dos colecciones en Firebase:

*   **`simit_subscriptions`**: Almacenará el consentimiento legal explícito.
    *   `userId` (string)
    *   `cedula` (string - encriptada con AES-256-GCM para cumplir política Zero-PII)
    *   `consentGiven` (boolean)
    *   `consentDate` (timestamp)
    *   `status` ('active' | 'paused')
    *   `lastCheckedAt` (timestamp)

*   **`notifications`**: Buzón de entrada persistente in-app.
    *   `userId` (string)
    *   `title` (string)
    *   `body` (string)
    *   `read` (boolean - default false)
    *   `createdAt` (timestamp)

---

## 3. Sistema de Notificaciones In-App

Para mitigar las restricciones de los navegadores sobre notificaciones Push, usaremos un "Buzón" interno persistente:
*   Un hook de React (`useNotifications.ts`) que escuche en tiempo real la colección `notifications` del usuario actual.
*   Una "Campanita" en el NavBar (`NotificationBell.tsx`) que mostrará un punto rojo si hay notificaciones sin leer. Al hacer clic, el usuario verá si el robot detectó multas nuevas.

---

## 4. Interfaz de Consentimiento (Legal)

Página de aterrizaje (`/simit-radar`) para vender y autorizar el servicio:
*   Explicación comercial ("Entérate de las fotomultas antes de que lleguen a casa").
*   Formulario para capturar Cédula.
*   **Checkbox obligatorio**: *"Autorizo a Desmulta a consultar mis datos en el SIMIT de forma periódica..."*.

---

## 5. El Robot Scraper (Playwright)

**Flujo lógico del robot:**
1.  Se conecta a Firestore y busca todas las suscripciones activas.
2.  Abre un navegador Chromium invisible.
3.  Navega a `https://fcm.org.co/simit/`.
4.  Rellena el campo con la Cédula (ej. la de prueba `88145123`), simula el clic y extrae la tabla de resultados.
5.  Si encuentra comparendos nuevos (comparando con el estado anterior guardado), crea un documento en la colección `notifications` del usuario correspondiente.
6.  Actualiza la marca de tiempo `lastCheckedAt`.

---
*Nota: Este documento se mantendrá en el repositorio como diseño de arquitectura hasta que se apruebe su desarrollo activo.*
