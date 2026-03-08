
require('dotenv').config();
const admin = require('firebase-admin');

function normalizarLlavePrivada(valorCrudo) {
  if (!valorCrudo) return '';
  const s = valorCrudo.replace(/\\n/g, '\n').replace(/^["']+|["']+$/g, '').trim();
  const INICIO = '-----BEGIN PRIVATE KEY-----';
  const FIN = '-----END PRIVATE KEY-----';
  const indiceInicio = s.indexOf(INICIO);
  const indiceFin = s.indexOf(FIN);

  if (indiceInicio !== -1 && indiceFin !== -1) {
    const base64Puro = s
      .substring(indiceInicio + INICIO.length, indiceFin)
      .replace(/[^A-Za-z0-9+/=]/g, '');
    const lineas = base64Puro.match(/.{1,64}/g);
    if (lineas) {
      return `${INICIO}\n${lineas.join('\n')}\n${FIN}\n`;
    }
  }
  return s;
}

const privateKey = normalizarLlavePrivada(process.env.FIREBASE_PRIVATE_KEY);
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail);
console.log('Private Key Start:', privateKey.substring(0, 50));
console.log('Private Key End:', privateKey.substring(privateKey.length - 50));

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('SUCCESS: Firebase Admin initialized correctly.');
} catch (error) {
  console.error('ERROR: Failed to initialize Firebase Admin:');
  console.error(error);
}
