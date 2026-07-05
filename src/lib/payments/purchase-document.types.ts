/**
 * @file purchase-document.types.ts
 * @description Tipos estrictos para los documentos de compra almacenados en
 *   la colección `purchases` de Firestore.
 *
 * REGLA DE ORO: Este archivo es la fuente de verdad del modelo de datos de
 * una compra. Cualquier campo nuevo en Firestore DEBE reflejarse aquí primero.
 *
 * HISTORIAL:
 *   - v1.0.0 (2026-06-22): Creado para eliminar el `any` en pdf-delivery.ts
 *     detectado en la auditoría forense del flujo de pagos Wompi.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DocumentType } from '@/lib/legal/document-templates';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tipos de datos de caso
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Datos del caso de tránsito asociados a una compra.
 * Refleja exactamente el objeto `caseData` guardado en Firestore por
 * `create-order/route.ts` en la colección `purchases`.
 */
export interface PurchaseCaseData {
  /** Nombre completo del ciudadano infractor */
  infractorName: string;
  /** Cédula de ciudadanía del infractor */
  infractorId: string;
  /** Placa del vehículo, o 'N/A' si no aplica */
  licensePlate: string;
  /** Número del comparendo (opcional) */
  ticketNumber?: string;
  /** Antigüedad estimada de la infracción (opcional) */
  antiguedad?: string;
  /** Estado del cobro coactivo (opcional) */
  estadoCoactivo?: string;
  /** Tipo de infracción de tránsito (opcional) */
  tipoInfraccion?: string;
  /** Ciudad donde se emitió la infracción (opcional) */
  ciudadEmision?: string;
  /** Autoridad de tránsito emisora (opcional) */
  autoridadTransito?: string;
  /** Dirección de notificación del ciudadano (opcional) */
  direccionNotificacion?: string;
  /** ID corto interno del caso (formato CASE + 6 dígitos) */
  shortId: string;
  /** Correo del ciudadano, copiado desde la raíz para uso en documentos */
  citizenEmail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado de la transacción
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estados posibles de una compra en Wompi.
 * - `PENDING`: Orden creada, usuario en proceso de pago.
 * - `APPROVED`: Pago aprobado por Wompi; PDF debe ser entregado.
 * - `DECLINED`: Pago rechazado.
 * - `VOIDED`: Transacción anulada.
 */
export type PurchaseStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED';

// ─────────────────────────────────────────────────────────────────────────────
// Documento principal de compra
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Representa un documento de compra completo en la colección `purchases`
 * de Firestore, tal como lo escribe `create-order/route.ts` y lo actualiza
 * `webhook-wompi/route.ts`.
 *
 * Se usa como tipo de entrada para `generarYEnviarPDF()` en lugar de `any`,
 * garantizando seguridad de tipos en la función más crítica del sistema.
 */
export interface PurchaseDocument {
  /** ID del documento en Firestore (igual a `wompiReference`) */
  id: string;
  /** Referencia única generada para Wompi (formato DSM-XXXXXX-timestamp) */
  wompiReference: string;
  /** Tipo de producto/documento legal adquirido */
  productType: DocumentType;
  /** Etiqueta legible del producto para registros */
  productLabel: string;
  /** Monto cobrado en centavos COP */
  amountCop: number;
  /** Estado actual de la transacción */
  status: PurchaseStatus;
  /** Cédula hasheada con SHA-256 (no se guarda en texto plano) */
  hashedCedula: string;
  /** Celular hasheado con SHA-256 (no se guarda en texto plano) */
  hashedCelular: string;
  /** Correo del cliente (necesario para el envío del PDF) */
  customerEmail: string;
  /** Datos del caso de tránsito */
  caseData: PurchaseCaseData;
  /** Timestamp de creación de la orden (Firestore ServerTimestamp) */
  createdAt: Timestamp;
  /** Clave de idempotencia (igual a wompiReference) */
  idempotencyKey: string;
  /** IP de origen de la solicitud (para trazabilidad y auditoría) */
  ipAddress: string;

  // ── Campos opcionales — se agregan tras el webhook de Wompi ──

  /** ID de transacción en el sistema de Wompi */
  wompiTransactionId?: string;
  /** Timestamp de aprobación del pago */
  paidAt?: Timestamp;
  /** Timestamp de entrega del PDF */
  pdfDeliveredAt?: Timestamp;
  /** Token de descarga temporal en Firestore (válido 72h, máx 3 descargas) */
  downloadToken?: string;
}
