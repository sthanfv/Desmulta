import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import puppeteer from 'puppeteer';

export const generatePdf = onRequest(
  {
    memory: '2GiB', // Mayor memoria para Chromium
    timeoutSeconds: 120, // Timeout más largo para PDFs pesados
    maxInstances: 5, // Limitar para evitar cobros sorpresa
    region: 'us-central1'
  },
  async (req, res) => {
    // 1. Validar el secreto de autenticación para asegurar que solo nuestro Next.js lo llama
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.PDF_API_SECRET}`) {
      logger.error('Intento no autorizado a generatePdf', { ip: req.ip });
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método no permitido' });
      return;
    }

    const { htmlContent } = req.body;

    if (!htmlContent) {
      res.status(400).json({ error: 'Falta htmlContent en el cuerpo de la petición' });
      return;
    }

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

      // Establecer el contenido HTML
      await page.setContent(htmlContent, {
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
