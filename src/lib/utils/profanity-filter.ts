// src/lib/utils/profanity-filter.ts

/**
 * Lista expandida de palabras no permitidas (modismos colombianos y groserías)
 * Incluye variantes fonéticas comunes para mayor cobertura.
 */
const PROFANITY_LIST = [
  'gonorrea',
  'gonorea',
  'gnr',
  'hijueputa',
  'hpta',
  'hp',
  'hijoputa',
  'hijuetantos',
  'malparido',
  'malparida',
  'mlparido',
  'carechimba',
  'chimba',
  'chimbita',
  'perra',
  'perro',
  'pirobo',
  'piroba',
  'garrobato',
  'triplehp',
  'puta',
  'puto',
  'mierda',
  'merda',
  'culon',
  'culo',
  'culito',
  'tetas',
  'teta',
  'pene',
  'vagina',
  'clitoris',
  'webon',
  'guevon',
  'weba',
  'gueba',
  'guevada',
  'pendejo',
  'pendeja',
  'estupido',
  'estupida',
  'idiota',
  'marica',
  'maricon',
  'maricueca',
  'zorra',
  'bastardo',
  'malpari',
  'cacorro',
  'cacorra',
  'carepicha',
  'picha',
  'gonorren',
];

/**
 * Mapa de caracteres Leetspeak para normalización agresiva
 */
const LEET_MAP: Record<string, string> = {
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '0': 'o',
  '7': 't',
  '5': 's',
  '@': 'a',
  $: 's',
  '!': 'i',
  v: 'u',
  z: 's',
};

/**
 * Verifica si un texto contiene palabras de la lista negra.
 * v2: Maneja leetspeak, símbolos de evasión (guiones, puntos) y sub-strings.
 * @param text El texto a validar.
 * @returns true si el texto es "limpio", false si contiene groserías.
 */
export function isCleanText(text: string): boolean {
  if (!text) return true;

  // 1. Normalización base (minúsculas y sin acentos)
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 2. Traducir Leetspeak (ej: "g0n0rr34" -> "gonorrea")
  let leetNormalized = '';
  for (const char of normalized) {
    leetNormalized += LEET_MAP[char] || char;
  }

  // 3. Eliminar TODO lo que no sea letra (ej: "g-o-n-o-r-r-e-a" -> "gonorrea")
  const ultraNormalized = leetNormalized.replace(/[^a-z]/g, '');

  // 4. Verificación por sub-strings (más agresivo)
  // Nota: Esto podría dar falsos positivos en nombres muy raros,
  // pero para un sistema de captación de leads es preferible la limpieza.
  const hasProfanity = PROFANITY_LIST.some((badWord) => {
    // Si la palabra prohibida es muy corta (ej: "hp"), exigimos coincidencia más exacta
    // para evitar bloquear nombres como "Alejandro" (no hay ejemplo real aquí pero se entiende).
    if (badWord.length <= 2) {
      const words = normalized.split(/[^a-z0-9]/);
      return words.includes(badWord);
    }
    return ultraNormalized.includes(badWord);
  });

  return !hasProfanity;
}
