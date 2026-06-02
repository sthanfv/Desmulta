/**
 * 📧 Plantillas de Correos Institucionales - v2.2 (UI Refactor + Markup)
 * Refactorización: Accesibilidad (WCAG), Design Tokens, JSON-LD y Preheaders.
 */

const theme = {
  brandGold: '#D4AF37',
  brandGreen: '#10b981',
  bgBase: '#000000',
  bgCard: '#0c0c0e',
  bgElevated: '#18181b',
  border: '#27272a',
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textDark: '#09090b',
};

const fontStack =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;";

export const buildAnalysisEmail = (
  nombre: string,
  ciudad: string,
  resultado: string,
  antiguedad?: string,
  tipoInfraccion?: string,
  radicadoManual?: string,
  trackingUuid?: string
) => {
  const radicadoId = radicadoManual || Date.now().toString(36).toUpperCase();
  const trackingId = trackingUuid || radicadoId;
  const trackingUrl = `https://desmulta.online/seguir/${trackingId}`;

  const esFotomulta = tipoInfraccion?.toLowerCase().includes('foto');
  const esAntigua = antiguedad?.toLowerCase().includes('más de 3');
  const esComparendoAgente = tipoInfraccion?.toLowerCase().includes('agente');

  let baseLegal =
    'basándonos en la normativa legal vigente de la <span style="color: white; font-weight: 600;">Sentencia C-038 de 2020</span>.';
  if (esAntigua)
    baseLegal =
      'basándonos en el <span style="color: white; font-weight: 600;">blindaje técnico de tiempos legales</span> y la caducidad de las facultades sancionatorias.';
  else if (esComparendoAgente)
    baseLegal =
      'basándonos en los protocolos de <span style="color: white; font-weight: 600;">Garantía del Debido Proceso</span> y el Código Nacional de Tránsito.';
  else if (!esFotomulta)
    baseLegal =
      'basándonos en los estándares de <span style="color: white; font-weight: 600;">Defensa al Ciudadano</span> y la normativa vial vigente.';

  // --- EMAIL MARKUP (JSON-LD) PARA GMAIL ---
  const jsonLd = {
    '@context': 'http://schema.org',
    '@type': 'EmailMessage',
    potentialAction: {
      '@type': 'ViewAction',
      target: trackingUrl,
      url: trackingUrl,
      name: 'Rastrear Caso',
    },
    description: 'Seguimiento de estudio técnico de tránsito',
  };

  // --- PREHEADER OCULTO ---
  const preheaderText = `El análisis de tu caso en ${ciudad || 'Colombia'} está en marcha. Conoce los detalles y la ruta técnica...`;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <script type="application/ld+json">
          ${JSON.stringify(jsonLd)}
        </script>
        <style>
          body, p, h1, h2, div { margin: 0; padding: 0; }
          img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        </style>
      </head>
      <body style="background-color: ${theme.bgBase}; ${fontStack} padding: 20px 0; -webkit-font-smoothing: antialiased;">
        <div style="display: none; max-height: 0px; overflow: hidden;">
          ${preheaderText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>

        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${theme.bgCard}; border: 1px solid ${theme.border}; border-radius: 12px; overflow: hidden; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 40px 20px 30px 20px; border-bottom: 1px solid ${theme.border};">
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td valign="middle" style="padding-right: 12px;">
                    <img src="https://desmulta.online/logo-email.png" alt="Desmulta Escudo" width="42" height="42" style="display: block;">
                  </td>
                  <td valign="middle">
                    <span style="font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.05em; line-height: 1;">DES<span style="color: ${theme.brandGold};">MULTA</span></span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 11px; color: ${theme.textSecondary}; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 600;">Blindaje Técnico para tu Tranquilidad</div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px; color: ${theme.textPrimary}; line-height: 1.6; font-size: 16px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <div style="color: ${theme.brandGreen}; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">✓ Comunicación Oficial</div>
                    <div style="display: inline-block; padding: 6px 16px; background-color: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.3); color: ${theme.brandGold}; border-radius: 99px; font-size: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Estudio Técnico en Proceso</div>
                  </td>
                </tr>
              </table>

              <h1 style="font-size: 22px; color: white; margin: 0 0 16px 0; font-weight: 700;">¡Es un gusto saludarte, ${nombre}!</h1>
              <p style="margin-bottom: 20px; color: #d4d4d8;">Es un placer darte la bienvenida a <strong>Desmulta</strong>. Queremos informarte que hemos recibido tu solicitud y nuestro equipo de analistas ya ha iniciado el <span style="color: white; font-weight: 600;">estudio de viabilidad técnica</span> para tu caso en <span style="color: white; font-weight: 600;">${ciudad || 'Colombia'}</span>.</p>
              <p style="margin-bottom: 24px; color: #d4d4d8;">Estamos evaluando cuidadosamente cada detalle ${baseLegal}</p>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.bgElevated}; border-left: 4px solid ${theme.brandGold}; border-radius: 6px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0; font-style: italic; color: ${theme.textPrimary}; font-size: 15px; line-height: 1.5;">"Tu caso ha sido asignado a un especialista en tránsito para determinar la ruta técnica más rápida y efectiva."</p>
                  </td>
                </tr>
              </table>

              <p style="margin-bottom: 32px; color: #d4d4d8;">Este es un paso fundamental para proteger tus derechos. En un tiempo prudente, recibirás una respuesta detallada con los hallazgos y los pasos a seguir. Mientras tanto, puedes monitorear el progreso haciendo clic a continuación:</p>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 40px;">
                <tr>
                  <td align="center">
                    <a href="${trackingUrl}" style="display: inline-block; padding: 16px 36px; background-color: ${theme.brandGold}; color: ${theme.textDark} !important; text-decoration: none; border-radius: 8px; font-weight: 800; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em; border: 1px solid #C4A133;">
                      Monitorear Mi Caso
                    </a>
                  </td>
                </tr>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.bgElevated}; border: 1px dashed ${theme.border}; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; font-size: 13px; color: ${theme.textSecondary}; line-height: 1.5;">
                    <strong style="color: ${theme.textPrimary}; display: block; margin-bottom: 8px;">🛡️ SELLO DE GARANTÍA DESMULTA:</strong>
                    Este correo es una comunicación oficial y segura. Nuestros sistemas han verificado la integridad de este mensaje de extremo a extremo.
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${theme.border}; font-size: 12px;">
                      Radicado Oficial: <strong style="color: ${theme.textPrimary};">${radicadoId}</strong> (EXP-DIGITAL)<br>
                      Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px; background-color: #050505; border-top: 1px solid ${theme.border}; font-size: 12px; color: ${theme.textSecondary};">
              &copy; ${new Date().getFullYear()} Desmulta.online | Gestión Digital para todos.<br>
              Cúcuta, Norte de Santander, Colombia.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const buildWelcomeEmail = (
  nombre: string,
  radicado: string,
  placa: string,
  trackingUuid?: string
) => {
  const trackingId = trackingUuid || radicado;
  const trackingUrl = `https://desmulta.online/seguir/${trackingId}`;

  // --- EMAIL MARKUP (JSON-LD) PARA GMAIL ---
  const jsonLd = {
    '@context': 'http://schema.org',
    '@type': 'EmailMessage',
    potentialAction: {
      '@type': 'ViewAction',
      target: trackingUrl,
      url: trackingUrl,
      name: 'Ver Mi Caso',
    },
    description: 'Confirmación de inicio de trámite oficial',
  };

  // --- PREHEADER OCULTO ---
  const preheaderText = `Hola ${nombre}, hemos recibido tu solicitud para la placa ${placa}. Tu radicado oficial es ${radicado}.`;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <script type="application/ld+json">
          ${JSON.stringify(jsonLd)}
        </script>
        <style>
          body, p, h1, h2, div { margin: 0; padding: 0; }
          img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        </style>
      </head>
      <body style="background-color: ${theme.bgBase}; ${fontStack} padding: 20px 0; -webkit-font-smoothing: antialiased;">
        <div style="display: none; max-height: 0px; overflow: hidden;">
          ${preheaderText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>

        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${theme.bgCard}; border: 1px solid ${theme.border}; border-radius: 12px; overflow: hidden; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 40px 20px 30px 20px; border-bottom: 2px solid ${theme.brandGold}; background-color: ${theme.bgBase};">
              <img src="https://desmulta.online/icon.png" alt="Logo" width="50" style="display: block; margin-bottom: 12px;">
              <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.05em;">DES<span style="color: ${theme.brandGold};">MULTA</span></h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px; color: ${theme.textPrimary}; line-height: 1.6; font-size: 16px;">
              <div style="color: ${theme.brandGreen}; font-size: 11px; font-weight: bold; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.1em;">✓ Trámite Oficial Iniciado</div>
              
              <p style="margin-bottom: 16px;">Hola <strong>${nombre}</strong>,</p>
              <p style="margin-bottom: 16px;">Hemos recibido tu solicitud de análisis para la placa <strong style="color:white; background: ${theme.bgElevated}; padding: 4px 8px; border-radius: 4px; border: 1px solid ${theme.border};">${placa}</strong>.</p>
              
              <p style="margin-bottom: 24px;">Tu caso ha sido blindado y registrado bajo el radicado oficial:<br>
              <strong style="color: ${theme.brandGold}; font-size: 18px; letter-spacing: 0.05em;">${radicado}</strong></p>
              
              <p style="margin-bottom: 32px;">Nuestro equipo técnico está evaluando la viabilidad técnica de tu caso. Te contactaremos pronto vía WhatsApp para darte una respuesta definitiva y los pasos a seguir.</p>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 40px;">
                <tr>
                  <td align="center">
                    <a href="${trackingUrl}" style="display: inline-block; padding: 18px 36px; background-color: ${theme.brandGold}; color: ${theme.textDark} !important; text-decoration: none; border-radius: 8px; font-weight: 800; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);">
                      Monitorear Mi Caso
                    </a>
                  </td>
                </tr>
              </table>

              <div style="padding: 24px; background-color: #0c0c0e; border: 1px solid ${theme.border}; border-radius: 12px; font-size: 12px; color: ${theme.textSecondary};">
                🛡️ <strong>Seguridad Desmulta:</strong> Este es un canal de comunicación institucional seguro. Tu información está protegida bajo estándares de cifrado avanzado y absoluta reserva administrativa.
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 24px; background-color: #0c0c0e; border-top: 1px solid ${theme.border}; font-size: 11px; color: #71717a;">
              Desmulta.online | Gestión Digital en las Vías.<br>
              &copy; ${new Date().getFullYear()} Todos los derechos reservados.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const buildStatusChangeEmail = (
  nombre: string,
  nuevoEstado: string,
  mensaje: string,
  notaOperador?: string
) => {
  // --- EMAIL MARKUP (JSON-LD) PARA GMAIL ---
  const jsonLd = {
    '@context': 'http://schema.org',
    '@type': 'EmailMessage',
    description: `Actualización de estado: ${nuevoEstado}`,
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <script type="application/ld+json">
          ${JSON.stringify(jsonLd)}
        </script>
        <style>
          body, p, h1, h2, div { margin: 0; padding: 0; }
          img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        </style>
      </head>
      <body style="background-color: ${theme.bgBase}; ${fontStack} padding: 20px 0; -webkit-font-smoothing: antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${theme.bgCard}; border: 1px solid ${theme.border}; border-radius: 12px; overflow: hidden; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 40px 20px 30px 20px; border-bottom: 2px solid ${theme.brandGold}; background-color: ${theme.bgBase};">
              <img src="https://desmulta.online/icon.png" alt="Logo" width="50" style="display: block; margin-bottom: 12px;">
              <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.05em;">DES<span style="color: ${theme.brandGold};">MULTA</span></h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px; color: ${theme.textPrimary}; line-height: 1.6; font-size: 16px;">
              <div style="color: ${theme.brandGreen}; font-size: 11px; font-weight: bold; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.1em;">✓ Actualización de Estado</div>
              
              <p style="margin-bottom: 16px;">Hola <strong>${nombre}</strong>,</p>
              <p style="margin-bottom: 16px;">Queremos informarte que tu expediente ha cambiado de estado a: <strong style="color:white; background: ${theme.bgElevated}; padding: 4px 8px; border-radius: 4px; border: 1px solid ${theme.border};">${nuevoEstado}</strong>.</p>
              
              <p style="margin-bottom: 24px;">${mensaje}</p>
              ${
                notaOperador
                  ? `
                <div style="background-color: rgba(212, 175, 55, 0.1); border-left: 4px solid #D4AF37; padding: 15px; margin-bottom: 24px; border-radius: 4px;">
                  <strong style="color: #D4AF37; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Mensaje de tu asesor:</strong>
                  <p style="font-style: italic; color: #d4d4d8; font-size: 14px; margin: 0;">"${notaOperador}"</p>
                </div>
              `
                  : ''
              }
              
              <div style="padding: 24px; background-color: #0c0c0e; border: 1px solid ${theme.border}; border-radius: 12px; font-size: 12px; color: ${theme.textSecondary};">
                🛡️ <strong>Seguridad Desmulta:</strong> Este es un canal de comunicación institucional seguro. Tu información está protegida bajo estándares de cifrado avanzado y absoluta reserva administrativa.
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 24px; background-color: #0c0c0e; border-top: 1px solid ${theme.border}; font-size: 11px; color: #71717a;">
              Desmulta.online | Gestión Digital en las Vías.<br>
              &copy; ${new Date().getFullYear()} Todos los derechos reservados.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

/**
 * buildFollowUpEmail � Recordatorio automatico para leads inactivos en "contactado" > 72h.
 * NOTA: El sistema solo envia este correo UNA vez por lead (anti-duplicado via followUpSentAt).
 */
export const buildFollowUpEmail = (nombre: string, trackingUrl: string) => {
  const preheaderText = `Hola ${nombre}, vimos que tu caso esta pausado. Podemos ayudarte?`;
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body,p,h1,h2,div{margin:0;padding:0}table{border-collapse:collapse}</style>
      </head>
      <body style="background-color:${theme.bgBase};${fontStack}padding:20px 0;">
        <div style="display:none;max-height:0;overflow:hidden;">${preheaderText}&nbsp;&zwnj;&nbsp;&zwnj;</div>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:${theme.bgCard};border:1px solid ${theme.border};border-radius:12px;overflow:hidden;margin:0 auto;">
          <tr><td align="center" style="padding:32px 20px 24px;border-bottom:2px solid ${theme.brandGold};background-color:${theme.bgBase};">
            <img src="https://desmulta.online/icon.png" alt="Logo" width="44" style="display:block;margin-bottom:10px;">
            <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.05em;">DES<span style="color:${theme.brandGold};">MULTA</span></h1>
          </td></tr>
          <tr><td style="padding:36px 30px;color:${theme.textPrimary};line-height:1.6;font-size:16px;">
            <div style="color:${theme.brandGold};font-size:11px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;letter-spacing:0.1em;">Actualizacion de tu Caso</div>
            <p style="margin-bottom:16px;">Hola <strong>${nombre}</strong>,</p>
            <p style="margin-bottom:20px;color:#d4d4d8;">Notamos que tu caso lleva un momento sin avanzar. Hay algo en lo que podamos ayudarte?</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${theme.bgElevated};border-left:4px solid ${theme.brandGold};border-radius:6px;margin-bottom:28px;">
              <tr><td style="padding:20px;"><p style="margin:0;font-size:15px;color:${theme.textPrimary};line-height:1.5;">Nuestro equipo esta listo para continuar. A veces solo hace falta un documento o una confirmacion de tu parte.</p></td></tr>
            </table>
            <p style="margin-bottom:28px;color:#d4d4d8;">Revisa el estado actual de tu expediente:</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
              <tr><td align="center"><a href="${trackingUrl}" style="display:inline-block;padding:16px 36px;background-color:${theme.brandGold};color:${theme.textDark}!important;text-decoration:none;border-radius:8px;font-weight:800;text-transform:uppercase;font-size:14px;letter-spacing:0.05em;">Revisar Mi Caso</a></td></tr>
            </table>
            <div style="padding:20px;background-color:${theme.bgElevated};border:1px dashed ${theme.border};border-radius:8px;font-size:12px;color:${theme.textSecondary};line-height:1.5;">
              <strong style="color:${theme.textPrimary};display:block;margin-bottom:6px;">Preguntas? Sin problema.</strong>
              Si tienes dudas, simplemente responde este correo. Este es el unico recordatorio automatico que recibiras.
            </div>
          </td></tr>
          <tr><td align="center" style="padding:20px;background-color:#050505;border-top:1px solid ${theme.border};font-size:11px;color:#71717a;">
            Desmulta.online | Gestion Digital en las Vias.<br>
            &copy; ${new Date().getFullYear()} Todos los derechos reservados.
          </td></tr>
        </table>
      </body>
    </html>
  `;
};
