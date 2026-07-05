/**
 * src/lib/security/masking.ts
 * USO EN PRESENTACIÓN — para mostrar datos parciales al usuario en la UI
 * NO usar para logs, Sentry, o cualquier sistema de telemetría (ya que conserva fragmentos legibles de PII).
 * Utilidades para ofuscar (enmascarar) Información de Identificación Personal (PII)
 * en la capa de presentación, previniendo visualización no autorizada.
 */

export function maskName(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => {
      if (word.length <= 1) return word;
      return word.charAt(0) + '*'.repeat(word.length - 1);
    })
    .join(' ');
}

export function maskId(id: string): string {
  if (!id) return '';
  if (id.length <= 4) return '*'.repeat(id.length);
  return '*'.repeat(id.length - 4) + id.slice(-4);
}

export function maskPlate(plate: string): string {
  if (!plate) return '';
  if (plate.length <= 3) return '*'.repeat(plate.length);
  return plate.slice(0, 2) + '*'.repeat(plate.length - 3) + plate.slice(-1);
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

export function maskEmail(email: string): string {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!domain) return maskName(email); // Fallback si no hay @
  if (localPart.length <= 2) return '*'.repeat(localPart.length) + '@' + domain;
  return (
    localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.slice(-1) + '@' + domain
  );
}

export function maskData(value: string, type: 'name' | 'id' | 'plate' | 'phone' | 'email'): string {
  switch (type) {
    case 'name':
      return maskName(value);
    case 'id':
      return maskId(value);
    case 'plate':
      return maskPlate(value);
    case 'phone':
      return maskPhone(value);
    case 'email':
      return maskEmail(value);
    default:
      return value;
  }
}
