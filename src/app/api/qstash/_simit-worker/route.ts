import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger/security-logger';

export const maxDuration = 10; 

/**
 * ⚠️ WARNING (COMPLIANCE & LEGAL) ⚠️
 * 
 * SIMIT SCRAPER DESACTIVADO PERMANENTEMENTE.
 * 
 * De acuerdo a las normativas vigentes y los términos de servicio del SIMIT
 * (Sistema Integrado de Información sobre Multas y Sanciones por Infracciones de Tránsito),
 * el uso de herramientas de web scraping, bots, o extracción automatizada de datos
 * está ESTRICTAMENTE PROHIBIDO.
 * 
 * Este worker (y su motor estocástico asociado) ha sido inhabilitado para asegurar 
 * el cumplimiento legal del proyecto Desmulta. Cualquier intento de rehabilitar 
 * esta ruta incurre en responsabilidad legal directa.
 * 
 * Fecha de desactivación: 2026-08-11
 */
export async function POST() {
  logger.warn('[simit-worker] Intento de acceso a ruta de scraper SIMIT desactivada permanentemente por Compliance.');
  
  return NextResponse.json(
    { 
      error: 'SIMIT Scraper Deactivated', 
      message: 'Esta funcionalidad ha sido dada de baja permanentemente por cumplimiento normativo (Anti-Scraping).' 
    }, 
    { status: 410 } // 410 Gone
  );
}
