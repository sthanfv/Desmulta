// src/lib/firebase-client.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '@/firebase/config';

// Inicializar Firebase para Cliente (Singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
