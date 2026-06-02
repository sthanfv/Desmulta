/**
 * Configuración ESLint 9 — Flat Config Nativa
 *
 * Importa directamente las configs de Next.js (ya son Flat Config en v16+).
 * Se eliminó FlatCompat porque intentaba serializar a JSON los plugins de React,
 * generando una referencia circular irrecuperable (TypeError: Converting circular structure to JSON).
 */
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import security from 'eslint-plugin-security';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // Reglas base de Next.js + Core Web Vitals
  ...coreWebVitals,
  // Reglas TypeScript de Next.js
  ...nextTypescript,
  // Plugin de seguridad OWASP (auditoría de código)
  {
    plugins: {
      security,
    },
    rules: {
      'security/detect-object-injection': 'off', // Falsos positivos
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off'
    },
  },
  {
    files: ['src/tests/**/*.ts', 'src/tests/**/*.tsx', 'src/components/ui/**/*.tsx', 'src/components/pwa/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];

export default eslintConfig;
