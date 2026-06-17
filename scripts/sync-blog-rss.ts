import fs from 'fs';
import path from 'path';

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

// Limpia tags HTML básicos para convertirlos a Markdown
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
    .trim();
}

// Extrae el valor de una etiqueta XML mediante Regex
function extractTagContent(itemXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = itemXml.match(regex);
  if (match && match[1]) {
    // Si contiene CDATA, extraerlo
    const cdataMatch = match[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
    return cdataMatch ? cdataMatch[1].trim() : match[1].trim();
  }
  return '';
}

// Envía una notificación por Telegram al administrador sobre los borradores creados
async function notifyTelegram(newPosts: { title: string; slug: string }[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[TELEGRAM] Ignorado: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados.');
    return;
  }

  if (newPosts.length === 0) {
    return;
  }

  let message = `📢 *Nuevos borradores de blog importados*\n\n`;
  message += `Se han importado automáticamente *${newPosts.length}* borradores de noticias desde el feed oficial:\n\n`;

  newPosts.forEach((post, index) => {
    message += `${index + 1}. *${post.title}*\n`;
  });

  message += `\n✍️ *Para revisar y publicar (cambiar draft: false):*\n`;
  message += `[Ver contenido en GitHub](https://github.com/sthanfv/Desmulta/tree/main/src/content/blog)\n\n`;
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
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[RSS-SYNC-WARN] HTTP ${response.status} - No se pudo descargar el feed: ${url}`);
        continue;
      }

      const xmlText = await response.text();
      
      // Detectar si el feed es Atom (ej. Google Alerts) o RSS tradicional
      const isAtom = xmlText.toLowerCase().includes('<feed') && xmlText.toLowerCase().includes('<entry');
      
      let matches: string[] = [];
      if (isAtom) {
        console.log('[RSS-SYNC] Formato detectado: Atom (Google Alerts)');
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        matches = xmlText.match(entryRegex) || [];
      } else {
        console.log('[RSS-SYNC] Formato detectado: RSS tradicional');
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        matches = xmlText.match(itemRegex) || [];
      }

      if (matches.length === 0) {
        console.log('[RSS-SYNC] No se encontraron noticias o formato XML no reconocido para este feed.');
        continue;
      }

      console.log(`[RSS-SYNC] Procesando ${matches.length} noticias de este feed...`);

      for (const itemXml of matches) {
        let title = extractTagContent(itemXml, 'title');
        let pubDate = extractTagContent(itemXml, 'pubDate') || extractTagContent(itemXml, 'published') || extractTagContent(itemXml, 'updated');
        let description = extractTagContent(itemXml, 'description') || extractTagContent(itemXml, 'summary') || extractTagContent(itemXml, 'content') || extractTagContent(itemXml, 'content:encoded');
        let link = '';

        if (isAtom) {
          // En Atom el link se encuentra como atributo href
          const linkMatch = itemXml.match(/<link\s+(?:[^>]*?\s+)?href="([^"]*)"/i);
          if (linkMatch && linkMatch[1]) {
            link = linkMatch[1].trim();
            // Limpiar redirecciones de Google Alerts
            if (link.includes('google.com/url?')) {
              try {
                const urlObj = new URL(link);
                const realUrl = urlObj.searchParams.get('url');
                if (realUrl) {
                  link = realUrl;
                }
              } catch {
                // Si falla el parseo, se conserva el original
              }
            }
          }
        } else {
          link = extractTagContent(itemXml, 'link');
        }

        if (!title || !pubDate) {
          continue;
        }

        // Limpiar CDATA y entidades HTML del título
        title = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/i, '$1').trim();

        const slug = generateSlug(title);
        const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

        // Si el borrador o el post ya existe, se omite para no pisar ediciones del administrador
        if (fs.existsSync(filePath)) {
          omitidos++;
          continue;
        }

        const dateStr = parseDate(pubDate);
        const cleanDescription = htmlToMarkdown(description).slice(0, 160).replace(/\n/g, ' ') + '...';
        const cleanContent = htmlToMarkdown(description);

        // Contenido MDX con cabecera frontmatter configurada en modo borrador (draft: true)
        const mdxContent = `---
title: "${title.replace(/"/g, '\\"')}"
excerpt: "${cleanDescription.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "Supertransporte Colombia"
draft: true
tags: ["noticias", "regulación", "supertransporte"]
---

${cleanContent}

---
*Nota: Este artículo es un borrador importado de forma automática desde las novedades legales del sector transporte. Para más detalles, puedes consultar la fuente original en [este enlace](${link}).*
`;

        fs.writeFileSync(filePath, mdxContent, 'utf8');
        console.log(`[+] Borrador creado: src/content/blog/${slug}.mdx`);
        creadosList.push({ title, slug });
        creados++;
      }
    } catch (err: any) {
      console.error(`[ERROR-RSS] Falló la sincronización de la URL: ${url}. Motivo: ${err.message}`);
    }
  }

  console.log(`[RSS-SYNC] Sincronización general finalizada.`);
  console.log(`- Total de nuevos borradores creados: ${creados}`);
  console.log(`- Total de noticias existentes omitidas: ${omitidos}`);

  // Si hay creados y están configuradas las notificaciones de Telegram, notificar al admin
  if (creadosList.length > 0) {
    await notifyTelegram(creadosList);
  }
}

syncBlogFromRss();
