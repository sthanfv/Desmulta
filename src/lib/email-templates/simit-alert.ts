/**
 * Template de Email para Alertas del Escudo SIMIT.
 * Utiliza HTML inline (compatible con todos los clientes de email).
 */

interface MultaEmail {
  id: string;
  secretaria: string;
  codigo: string;
  estado: string;
  valor: number;
  valorPagar: number;
  esFotodeteccion: boolean;
}

interface ResumenEmail {
  totalMultas: number;
  totalComparendos: number;
  valorTotal: number;
  nombre: string;
}

interface ResultadoEmail {
  resumen: ResumenEmail;
  multas: MultaEmail[];
  textoBruto?: string;
}

/**
 * Formatea un número como moneda colombiana.
 */
const formatCOP = (valor: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor);

/**
 * Genera el HTML del email de bienvenida del Escudo SIMIT.
 */
export function buildEscudoSimitEmail(
  cedula: string,
  resultado: ResultadoEmail,
  isWelcomeEmail = false
): string {
  const { resumen, multas } = resultado;

  const filasMultas = multas
    .map(
      (m) => `
    <tr style="border-bottom: 1px solid #333;">
      <td style="padding: 12px 8px; font-size: 13px; color: #ccc;">${m.id.substring(0, 12)}${m.id.length > 12 ? '…' : ''}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #ccc;">${m.secretaria}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #ccc;">${m.codigo || '—'} ${m.esFotodeteccion ? '📸' : ''}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: ${m.estado === 'Cobro coactivo' ? '#ef4444' : '#eab308'}; font-weight: 600;">${m.estado}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #fff; font-weight: 700; text-align: right;">${formatCOP(m.valorPagar)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0;">
      <div style="display: inline-block; padding: 6px 16px; border-radius: 100px; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.3); color: #d4af37; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">
        🛡️ Escudo SIMIT Activado
      </div>
      <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; margin: 20px 0 8px; letter-spacing: -0.5px;">
        ${isWelcomeEmail ? '¡Bienvenido al Escudo SIMIT!' : 'Alerta: Cambios en tu SIMIT'}
      </h1>
      <p style="color: #888; font-size: 15px; margin: 0; line-height: 1.5;">
        ${
          isWelcomeEmail
            ? `Gracias por adquirir nuestro servicio gratuito de monitoreo. A partir de hoy, tu cédula <strong style="color: #d4af37;">${cedula}</strong> está blindada. Te enviaremos alertas automáticas ante cualquier cambio.`
            : `Hemos detectado un movimiento en el estado de cuenta de tu cédula <strong style="color: #d4af37;">${cedula}</strong>. Revisa los detalles a continuación.`
        }
      </p>
    </div>

    <!-- Resumen -->
    <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 20px; padding: 30px; margin-bottom: 24px;">
      <h2 style="color: #fff; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px;">
        Resumen de Estado de Cuenta
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="48%" style="background: #1a1a1a; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="color: #d4af37; font-size: 28px; font-weight: 900;">${resumen.totalMultas}</div>
            <div style="color: #888; font-size: 11px; text-transform: uppercase; font-weight: 700;">Multas</div>
          </td>
          <td width="4%"></td> <!-- Espacio -->
          <td width="48%" style="background: #1a1a1a; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="color: #d4af37; font-size: 28px; font-weight: 900;">${resumen.totalComparendos}</div>
            <div style="color: #888; font-size: 11px; text-transform: uppercase; font-weight: 700;">Comparendos</div>
          </td>
        </tr>
      </table>
      <div style="background: linear-gradient(135deg, #1a1a0a, #1a1408); border: 1px solid #333; border-radius: 12px; padding: 20px; margin-top: 16px; text-align: center;">
        <div style="color: #888; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Total en SIMIT</div>
        <div style="color: #fff; font-size: 32px; font-weight: 900;">${formatCOP(resumen.valorTotal)}</div>
      </div>
    </div>

    <!-- Tabla de Multas -->
    ${
      multas.length > 0
        ? `
    <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 20px; padding: 30px; margin-bottom: 24px; overflow-x: auto;">
      <h2 style="color: #fff; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px;">
        Detalle de Multas
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #d4af37;">
            <th style="padding: 8px; font-size: 11px; color: #888; text-align: left; text-transform: uppercase;">ID</th>
            <th style="padding: 8px; font-size: 11px; color: #888; text-align: left; text-transform: uppercase;">Secretaría</th>
            <th style="padding: 8px; font-size: 11px; color: #888; text-align: left; text-transform: uppercase;">Código</th>
            <th style="padding: 8px; font-size: 11px; color: #888; text-align: left; text-transform: uppercase;">Estado</th>
            <th style="padding: 8px; font-size: 11px; color: #888; text-align: right; text-transform: uppercase;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${filasMultas}
        </tbody>
      </table>
      <p style="color: #666; font-size: 11px; margin-top: 16px; line-height: 1.4; font-style: italic;">
        * Nota: El "Total en SIMIT" refleja el saldo global oficial reportado por la plataforma. Los valores individuales por infracción pueden no sumar exactamente este monto si existen acuerdos de pago previos, intereses de mora acumulados, o cobros coactivos paralelos que el SIMIT agrupa en el encabezado.
      </p>
    </div>
    `
        : ''
    }

    <!-- CTA -->
    <div style="text-align: center; padding: 20px 0;">
      <a href="https://desmulta.online/escudo-simit" style="display: inline-block; padding: 16px 40px; background: #d4af37; color: #000; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
        Ver Estado Completo
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 30px 0; border-top: 1px solid #222;">
      <p style="color: #555; font-size: 11px; margin: 0;">
        Te notificaremos automáticamente si detectamos cambios en tu estado de cuenta SIMIT.
      </p>
      <p style="color: #444; font-size: 10px; margin: 8px 0 0;">
        Desmulta Colombia · Saneamiento Vial Premium · Este correo fue enviado a solicitud tuya.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
