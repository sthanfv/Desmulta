'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  OcrCircuitBreaker,
  FirebaseCircuitBreaker,
  CircuitState,
} from '@/lib/security/circuit-breaker';

interface SystemHealthContextType {
  ocrState: CircuitState;
  firebaseState: CircuitState;
  isSystemDegraded: boolean;
  forceRecoverAll: () => void;
}

const SystemHealthContext = createContext<SystemHealthContextType | undefined>(undefined);

export const SystemHealthProvider = ({ children }: { children: ReactNode }) => {
  const [ocrState, setOcrState] = useState<CircuitState>(OcrCircuitBreaker.getState());
  const [firebaseState, setFirebaseState] = useState<CircuitState>(
    FirebaseCircuitBreaker.getState()
  );

  useEffect(() => {
    const unsubOcr = OcrCircuitBreaker.subscribe((state) => {
      setOcrState(state);
    });

    const unsubFb = FirebaseCircuitBreaker.subscribe((state) => {
      setFirebaseState(state);
    });

    // Check periódico para actualizar estados HALF_OPEN
    const interval = setInterval(() => {
      setOcrState(OcrCircuitBreaker.getState());
      setFirebaseState(FirebaseCircuitBreaker.getState());
    }, 5000);

    return () => {
      unsubOcr();
      unsubFb();
      clearInterval(interval);
    };
  }, []);

  const forceRecoverAll = () => {
    OcrCircuitBreaker.forceClosed();
    FirebaseCircuitBreaker.forceClosed();
  };

  const isSystemDegraded = ocrState === 'OPEN' || firebaseState === 'OPEN';

  return (
    <SystemHealthContext.Provider
      value={{ ocrState, firebaseState, isSystemDegraded, forceRecoverAll }}
    >
      {children}
    </SystemHealthContext.Provider>
  );
};

export const useSystemHealth = () => {
  const context = useContext(SystemHealthContext);
  if (context === undefined) {
    throw new Error('useSystemHealth must be used within a SystemHealthProvider');
  }
  return context;
};
