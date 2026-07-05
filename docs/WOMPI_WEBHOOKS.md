# Configuración de Webhooks de Wompi

Este documento detalla el procedimiento exacto para conectar Wompi con el backend de Desmulta para el procesamiento asíncrono de pagos.

## ¿Qué es el Webhook y por qué es crítico?
Cuando un usuario completa un pago en el widget de Wompi, el frontend no tiene la autoridad para decir "pago exitoso" por razones de seguridad. Wompi envía un evento seguro (Webhook) por detrás (`POST /api/payments/webhook-wompi`) firmado criptográficamente. Este evento es el único autorizado para cambiar el estado de la compra en la base de datos de `PENDING` a `APPROVED` y disparar el envío del PDF.

## ⚠️ Regla de Oro: La URL debe configurarse en AMBOS entornos

Wompi maneja dos paneles completamente separados: **Modo Pruebas** (Sandbox) y **Modo Producción**. Si la URL no se guarda en el panel, Wompi jamás avisará a Desmulta y el usuario se quedará en la pantalla de "Procesando pago..." para siempre.

### 1. Configuración para Entorno de Pruebas (Sandbox)
Se utiliza para validar la integración antes de lanzar o cuando desarrollas localmente usando Vercel Preview.

1. Inicia sesión en [comercios.wompi.co](https://comercios.wompi.co/).
2. Asegúrate de estar en **Modo de Pruebas** (Botón gris o verde indicando el modo).
3. Navega en el menú lateral a **Desarrollo > Programadores**.
4. En el campo **"URL de Eventos"**, pega la URL de tu entorno de pruebas o producción.
   * *Ejemplo:* `https://desmulta.online/api/payments/webhook-wompi`
5. **CRÍTICO:** Haz clic en el botón verde **Guardar**. Si no haces clic, aparecerá un aviso amarillo y la URL no se activará.
6. Marca los eventos requeridos (Principalmente `transaction.updated`).

### 2. Configuración para Entorno de Producción (Dinero Real)
Se utiliza cuando la plataforma está pública y recibiendo clientes reales.

1. En [comercios.wompi.co](https://comercios.wompi.co/), cambia a **Modo Producción** desactivando el modo de pruebas.
2. Navega nuevamente a **Desarrollo > Programadores**.
3. En el campo **"URL de Eventos"**, pega la URL oficial de producción.
   * *Ejemplo:* `https://desmulta.online/api/payments/webhook-wompi` (Nota: Wompi permite usar la misma URL para ambos entornos, pero debes pegarla y guardarla en los dos paneles por separado).
4. **CRÍTICO:** Haz clic en el botón verde **Guardar**.
5. Marca `transaction.updated` y confirma.

## Variables de Entorno (.env)
Para que el servidor de Desmulta acepte los webhooks, debes tener configurado el secreto de eventos que te provee Wompi en la misma pantalla de Programadores:

```env
# Secreto de Eventos (Event Secret)
WOMPI_EVENTS_SECRET="tu_secreto_de_eventos_aqui"
```

> **Nota de Seguridad:** Existen secretos diferentes para el entorno de pruebas y para el de producción. Asegúrate de colocar el secreto de producción en Vercel cuando hagas el lanzamiento oficial.
