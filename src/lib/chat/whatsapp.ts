// Enlace de WhatsApp del equipo humano (seguro para cliente y servidor)
import { FOOTER_DEFAULTS } from '@/lib/config-constants';

export const WHATSAPP_DEFAULT_TEXT =
  'Hola, vengo del asistente de Desmulta y quiero que revisen mi caso.';

export function buildWhatsAppUrl(text: string = WHATSAPP_DEFAULT_TEXT): string {
  const number = FOOTER_DEFAULTS.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
