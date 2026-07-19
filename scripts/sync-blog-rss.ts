import fs from 'fs';
import path from 'path';

// Helper para cargar variables de entorno del archivo .env local de forma manual (sin dependencias)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      // Ignorar líneas vacías o comentarios
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        // Quitar comillas simples o dobles si existen
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const RSS_URL = process.env.BLOG_RSS_URL || 'https://diariodetransporte.com/feed/';
const BLOG_DIR = path.resolve(process.cwd(), 'src/content/blog');

// Función para sanitizar texto a slug seguro
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Elimina tildes y acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '') // Elimina caracteres especiales
    .trim()
    .replace(/\s+/g, '-'); // Reemplaza espacios por guiones
}

// Convierte fechas del formato RSS/Atom a YYYY-MM-DD
function parseDate(rawDate: string): string {
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
// Limpia tags HTML básicos para convertirlos a Markdown y escapa llaves de MDX
function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // CDATA wrapper
    .replace(/<[^>]*>/g, '') // Elimina cualquier otro tag residual
    .replace(/\{/g, '\\{') // Escapa {
    .replace(/\}/g, '\\}') // Escapa }
    .trim();
}

// Extrae el valor de una etiqueta XML mediante Regex
function extractTagContent(itemXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = itemXml.match(regex);
  if (match && match[1]) {
    // Si contiene CDATA, extraerlo
    const cdataMatch = match[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
    return cdataMatch ? cdataMatch[1].trim() : match[1].trim();
  }
  return '';
}

// Función nativa para llamar a Gemini API vía fetch y evitar instalar @google/generative-ai
async function reescribirConGemini(titulo: string, contenidoCrudo: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[GEMINI-WARN] No se encontró GEMINI_API_KEY. Se usará el contenido crudo (riesgo de contenido duplicado).');
    return contenidoCrudo;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `
You are an expert Colombian traffic and transportation analyst writing informational articles for the blog of "Desmulta", a legal tech platform dedicated to contesting speed camera tickets (fotomultas) and achieving legal clearance of traffic fines.
You will be provided with an excerpt from a news article or bulletin regarding transportation regulations, fines, or traffic rules.

Critical Instructions:
1. Rewrite the news story to be 100% original, plagiarism-free, informative, and clear. Write approximately 3 to 5 short paragraphs.
2. The output language MUST be strictly in native Colombian Spanish.
3. Maintain a professional and legal tone, but completely accessible to the average citizen. Do not use overly complex legalese.
4. SEO FOCUS: Subtly insert relevant keywords such as "fotomultas", "Secretaría de Movilidad", "impugnación", "SIMIT", or "prescripción" where contextually appropriate.
5. CALL TO ACTION (MANDATORY): At the very end of the article, in a new paragraph, you MUST ALWAYS include a direct promotional message indicating that: "En Desmulta, contamos con un equipo de analistas expertos en normativas de tránsito y tecnología automatizada listos para asesorar y defender tus derechos frente a infracciones injustas. Conoce nuestros servicios de análisis de prescripción y saneamiento en https://desmulta.online". This must sound like Desmulta is the author/sponsor of the article.
6. Return ONLY the final text in Markdown format (you can use bold text or lists). Do not include any introductory or concluding explanatory notes of your own.

Original News to rewrite:
Title: ${titulo}
Content: ${contenidoCrudo}
`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GEMINI-ERROR] HTTP ${response.status} - ${errText}`);
      return contenidoCrudo; // Fallback
    }

    const data = (await response.json()) as any;
    const textoGenerado = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textoGenerado) {
      return contenidoCrudo; // Fallback
    }
    
    return textoGenerado.trim();
  } catch (error: any) {
    console.error(`[GEMINI-ERROR] Excepción al contactar la API: ${error.message}`);
    return contenidoCrudo; // Fallback
  }
}

// Envía una notificación por Telegram al administrador sobre los borradores creados
async function notifyTelegram(newPosts: { title: string; slug: string }[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_SECURITY_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[TELEGRAM] Ignorado: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados.');
    return;
  }

  if (newPosts.length === 0) {
    return;
  }

  const isAutoPublish = process.env.AUTO_PUBLISH_BLOG === 'true';

  let message = isAutoPublish 
    ? `📢 *Nuevos artículos publicados en el blog*\n\n`
    : `📢 *Nuevos borradores de blog importados*\n\n`;
    
  message += isAutoPublish
    ? `Se han importado y publicado automáticamente *${newPosts.length}* noticias desde el feed oficial:\n\n`
    : `Se han importado automáticamente *${newPosts.length}* borradores de noticias desde el feed oficial:\n\n`;

  newPosts.forEach((post, index) => {
    message += `${index + 1}. *${post.title}*\n`;
  });

  if (!isAutoPublish) {
    message += `\n✍️ *Para revisar y publicar (cambiar draft: false):*\n`;
    message += `[Ver contenido en GitHub](https://github.com/sthanfv/Desmulta/tree/main/src/content/blog)\n\n`;
  } else {
    message += `\n✅ *Publicación automática activa.*\n\n`;
  }

  message += `_Desmulta Blog Automation Bot_`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (response.ok) {
      console.log('[TELEGRAM] Notificación enviada con éxito al administrador.');
    } else {
      const errText = await response.text();
      console.error(`[TELEGRAM-ERROR] Error al enviar mensaje: HTTP ${response.status} - ${errText}`);
    }
  } catch (error: any) {
    console.error(`[TELEGRAM-ERROR] Error de conexión: ${error.message}`);
  }
}

async function syncBlogFromRss() {
  const rssUrls = RSS_URL.split(',').map(url => url.trim());
  console.log(`[RSS-SYNC] Iniciando sincronización de ${rssUrls.length} feeds...`);

  let creados = 0;
  let omitidos = 0;
  const creadosList: { title: string; slug: string }[] = [];

  for (const url of rssUrls) {
    if (!url) continue;
    console.log(`[RSS-SYNC] Consultando novedades viales en: ${url}`);
    
    try {
      const urlObj = new URL(url);
      const allowedDomains = [
        'diariodetransporte.com',
        'mintransporte.gov.co',
        'simit.org.co',
        'www.movilidadbogota.gov.co',
        'www.google.com'
      ];
      if (!allowedDomains.includes(urlObj.hostname)) {
        console.error(`[RSS-SYNC-ERROR] URL denegada por política de seguridad: el dominio ${urlObj.hostname} no está en la allowlist.`);
        continue;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[RSS-SYNC-WARN] HTTP ${response.status} - No se pudo descargar el feed: ${url}`);
        continue;
      }

      const xmlText = await response.text();
      
      // Inicializar el parser en cada iteración
      const Parser = require('rss-parser');
      const parser = new Parser({
        customFields: {
          item: ['description', 'summary', 'content', 'content:encoded', 'published', 'updated']
        }
      });
      
      const feed = await parser.parseString(xmlText);
      const items = feed.items || [];

      if (items.length === 0) {
        console.log('[RSS-SYNC] No se encontraron noticias o formato XML no reconocido para este feed.');
        continue;
      }

      console.log(`[RSS-SYNC] Procesando ${items.length} noticias de este feed...`);

      for (const item of items) {
        let title = item.title;
        let pubDate = item.pubDate || item.published || item.updated;
        let description = item.description || item.summary || item.content || item['content:encoded'] || '';
        let link = item.link || '';

        if (!title || !pubDate) {
          continue;
        }

        // Limpiar entidades HTML del título (el CDATA usualmente ya viene limpio por rss-parser)
        title = title
          .replace(/&lt;b&gt;/gi, '')
          .replace(/&lt;\/b&gt;/gi, '')
          .replace(/<b>/gi, '')
          .replace(/<\/b>/gi, '')
          .replace(/&quot;/gi, '"')
          .replace(/&amp;/gi, '&')
          .replace(/<[^>]*>/g, '')
          .trim();

        // Filtro de relevancia: Lista Negra (accidentes/tragedias) y Lista Blanca (movilidad/legal)
        const titleLower = title.toLowerCase();
        const descLower = description.toLowerCase();
        
        const blacklist = ['fallece', 'fallecido', 'muerto', 'herido', 'choque', 'colision', 'accidente', 'tragedia', 'volcamiento', 'lesionado'];
        const contieneBasura = blacklist.some(palabra => titleLower.includes(palabra));
        
        const whitelist = ['movilidad', 'tránsito', 'transito', 'transporte', 'fotomulta', 'multa', 'comparendo', 'licencia', 'conductor', 'vehículo', 'vehiculo', 'carro', 'moto', 'vía', 'via', 'peaje', 'soat', 'tecnomecánica', 'tecnomecanica', 'infractor', 'simit', 'runt', 'secretaría de movilidad', 'ministerio de transporte', 'conducir', 'parqueo', 'grúa', 'grua', 'pico y placa'];
        // Filtro estricto: la palabra clave DEBE estar en el título. (Evitar noticias donde solo mencionen "vehículo" en el cuerpo)
        const esRelevante = whitelist.some(palabra => titleLower.includes(palabra));

        if (contieneBasura || !esRelevante) {
          console.log(`[-] Omitido por filtro de relevancia estricto: "${title}"`);
          continue;
        }

        const slug = generateSlug(title);
        const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

        // Si el borrador o el post ya existe, se omite para no pisar ediciones del administrador
        if (fs.existsSync(filePath)) {
          omitidos++;
          continue;
        }

        const dateStr = parseDate(pubDate);
        const htmlToMd = htmlToMarkdown(description);
        
        const cleanDescription = htmlToMd.slice(0, 160).replace(/\n/g, ' ') + '...';
        
        console.log(`[GEMINI] Procesando y reescribiendo artículo de forma única: ${title}...`);
        const rewrittenContent = await reescribirConGemini(title, htmlToMd);

        const isAutoPublish = process.env.AUTO_PUBLISH_BLOG === 'true';

        // Contenido MDX con cabecera frontmatter
        const mdxContent = `---
title: "${title.replace(/"/g, '\\"')}"
excerpt: "${cleanDescription.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "Equipo Legal Desmulta"
draft: ${!isAutoPublish}
autoGenerated: true
tags: ["noticias", "regulación", "transporte"]
---

${rewrittenContent}

---
*Nota Editorial: Este artículo fue procesado y analizado basándose en normativas oficiales de transporte. Fuente primaria de referencia: [Ver origen de la noticia](${link}).*
`;

        fs.writeFileSync(filePath, mdxContent, 'utf8');
        console.log(`[+] Borrador creado: src/content/blog/${slug}.mdx`);
        creadosList.push({ title, slug });
        creados++;
        
        // FinOps: Delay de 15 segundos entre peticiones para no exceder el límite gratuito de Google (5 RPM por ráfaga)
        if (creados % 5 !== 0) {
           await new Promise(resolve => setTimeout(resolve, 15000));
        } else {
           // Pausa más larga cada 5 artículos
           await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    } catch (err: any) {
      console.error(`[ERROR-RSS] Falló la sincronización de la URL: ${url}. Motivo: ${err.message}`);
    }
  }

  console.log(`[RSS-SYNC] Sincronización general finalizada.`);
  console.log(`- Total de nuevos borradores creados: ${creados}`);
  console.log(`- Total de noticias existentes omitidas: ${omitidos}`);

  // Podar noticias antiguas para evitar la acumulación excesiva de archivos basura
  const maxPosts = parseInt(process.env.MAX_BLOG_POSTS || '30', 10);
  pruneOldPosts(maxPosts);

  // Si hay creados y están configuradas las notificaciones de Telegram, notificar al admin
  if (creadosList.length > 0) {
    await notifyTelegram(creadosList);
  }
}

// Función para podar/eliminar noticias auto-importadas antiguas y mantener el repositorio limpio
function pruneOldPosts(maxPosts: number) {
  try {
    const files = fs.readdirSync(BLOG_DIR);
    const posts: { filePath: string; date: string }[] = [];

    files.forEach((file) => {
      if (!file.endsWith('.mdx')) return;
      const filePath = path.join(BLOG_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Solo eliminamos posts que hayan sido importados automáticamente (protege manuales)
      if (content.includes('autoGenerated: true')) {
        const dateMatch = content.match(/date:\s*"([^"]+)"/);
        const date = dateMatch ? dateMatch[1] : '1970-01-01';
        posts.push({ filePath, date });
      }
    });

    // Ordenar de más nuevo a más viejo
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (posts.length > maxPosts) {
      const toDelete = posts.slice(maxPosts);
      console.log(`[RSS-SYNC] Detectados ${posts.length} posts auto-importados. Límite máximo: ${maxPosts}. Iniciando poda de ${toDelete.length} posts antiguos...`);
      toDelete.forEach((post) => {
        try {
          fs.unlinkSync(post.filePath);
          console.log(`[-] Eliminado post antiguo por limpieza: ${path.basename(post.filePath)}`);
        } catch (err: any) {
          console.error(`[RSS-SYNC-ERROR] No se pudo borrar ${post.filePath}: ${err.message}`);
        }
      });
    }
  } catch (err: any) {
    console.error(`[RSS-SYNC-ERROR] Error durante el proceso de poda: ${err.message}`);
  }
}

syncBlogFromRss();
