import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import puppeteer from 'puppeteer';
import sanitizeHtml from 'sanitize-html';
import { timingSafeEqual } from 'crypto';

export const generatePdf = onRequest(
  {
    memory: '2GiB', // Mayor memoria para Chromium
    timeoutSeconds: 120, // Timeout más largo para PDFs pesados
    maxInstances: 5, // Limitar para evitar cobros sorpresa
    region: 'us-central1'
  },
  async (req, res) => {
    // 1. Validar el secreto de autenticación
    // 🛡️ FIX H-15: timingSafeEqual previene timing attacks en la verificación del secreto.
    // La comparación directa con `!==` permitía reconstruir el secreto bit a bit midiendo tiempos.
    const authHeader = req.headers.authorization || '';
    const pdfApiSecret = process.env.PDF_API_SECRET || '';
    const expected = `Bearer ${pdfApiSecret}`;
    const isAuthValid =
      typeof authHeader === 'string' &&
      authHeader.length === expected.length &&
      pdfApiSecret.length > 0 &&
      timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));

    if (!isAuthValid) {
      logger.error('[generatePdf] Intento no autorizado.', { ip: req.ip });
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    const { htmlContent } = req.body;

    // 🛡️ FIX H-15: Rechazar payloads HTML excesivamente grandes (vector de DoS).
    const MAX_HTML_BYTES = 500_000; // 500 KB
    if (!htmlContent || Buffer.byteLength(htmlContent, 'utf8') > MAX_HTML_BYTES) {
      res.status(400).json({ error: 'Contenido HTML inválido o demasiado grande.' });
      return;
    }

    // 🛡️ FIX H-15: Sanitizar el HTML antes de pasarlo a Puppeteer.
    // Sin sanitización, un atacante con el PDF_API_SECRET puede inyectar <script>
    // que ejecute fetch() hacia metadata.google.internal y exfiltre el token del Service Account.
    const htmlLimpio = sanitizeHtml(htmlContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'style', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'span', 'div',
        'img', 'br', 'hr',
      ]),
      allowedAttributes: {
        '*': ['style', 'class'],
        'a': ['href'],
        'img': ['src', 'alt', 'width', 'height'],
      },
      // Sin 'file://', 'http://', 'data:', 'javascript:' — solo HTTPS para recursos externos
      allowedSchemes: ['https'],
      disallowedTagsMode: 'discard',
    });

    let browser = null;
    try {
      logger.info('Iniciando Puppeteer...');
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true,
      });

      const page = await browser.newPage();
      
      // 🛡️ FIX HALLAZGO 15: Prevenir SSRF bloqueando red y deshabilitando JS
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        // Bloquear todas las peticiones de red externas ya que inyectamos el HTML directamente
        request.abort();
      });

      // Establecer el contenido HTML ya sanitizado
      await page.setContent(htmlLimpio, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Generar PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte.pdf"');
      
      // Enviar el buffer binario
      res.status(200).send(pdfBuffer);
      
    } catch (error) {
      logger.error('Error generando PDF con Puppeteer', error);
      res.status(500).json({ error: 'Error interno generando el PDF' });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
);
