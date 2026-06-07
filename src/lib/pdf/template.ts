export interface PDFTemplateData {
  items: Array<{
    id: string;
    tipo: string;
    estado: string;
    placa?: string;
    cedula?: string;
    nombre?: string;
    ciudad?: string;
    createdAt?: string;
  }>;
  fechaExportacion: string;
  integrityHash?: string;
  operatorDetails?: {
    nombre: string;
    email: string;
    telefono: string;
  };
  filtros: {
    ciudad?: string;
    estado?: string;
    fechaInicio?: string;
    fechaFin?: string;
  };
}

export function generarHtmlReporte(data: PDFTemplateData): string {
  const filtrosStr = [
    data.filtros.ciudad && `Ciudad: ${data.filtros.ciudad}`,
    data.filtros.estado && `Estado: ${data.filtros.estado}`,
    (data.filtros.fechaInicio || data.filtros.fechaFin) &&
      `Fechas: ${data.filtros.fechaInicio || '*'} - ${data.filtros.fechaFin || '*'}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td>${item.tipo === 'lead' ? 'Petición' : 'Caso'}</td>
      <td>${item.nombre || 'N/A'}</td>
      <td>${item.cedula || 'N/A'}</td>
      <td>${item.placa || 'N/A'}</td>
      <td>${item.ciudad || 'N/A'}</td>
      <td>${item.estado}</td>
      <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-CO') : 'N/A'}</td>
    </tr>
  `
    )
    .join('');

  const opInfo = data.operatorDetails;
  const watermarkText = opInfo
    ? `OPERADOR RESPONSABLE:\\nNombre: ${opInfo.nombre}\\nEmail: ${opInfo.email}\\nTeléfono: ${opInfo.telefono}\\n\\nPROPIEDAD DE DESMULTA - ESTRICTAMENTE CONFIDENCIAL`
    : 'OPERADOR DESCONOCIDO - DOCUMENTO NO AUTORIZADO';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Desmulta</title>
  <style>
    /* MANUAL DE ESTILO VISUAL - REPORTES (v1.2.0) */
    
    @page {
      size: A4 landscape;
      margin: 20mm;
      
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 8pt;
        color: #718096;
      }
      
      @bottom-left {
        content: "Hash Integridad: ${data.integrityHash || 'N/A'} | Generado: ${data.fechaExportacion}";
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 7pt;
        color: #718096;
      }
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt; /* Estricto a 10pt */
      line-height: 1.4;
      color: #1a202c;
      margin: 0;
      padding: 0;
      position: relative;
    }

    /* Marca de agua repetida en cada página generada */
    body::before {
      content: "${watermarkText}";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 32pt;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.04);
      z-index: -1;
      white-space: pre-wrap;
      text-align: center;
      pointer-events: none;
      line-height: 1.5;
      width: 150%;
    }

    h1, h2, h3, h4 {
      color: #2d3748;
      margin-top: 0;
      page-break-after: avoid; /* Anti-Orphans */
    }

    h1 {
      font-size: 16pt;
      margin-bottom: 5px;
    }

    .header-info {
      font-size: 9pt;
      color: #4a5568;
      margin-bottom: 20px;
      border-bottom: 1px solid #f6ad55; /* Acento institucional Desmulta */
      padding-bottom: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid; /* Aislamiento de Cajas Atómicas */
      page-break-after: auto;
    }

    th {
      background-color: #e2e8f0; /* Gris desaturado */
      color: #4a5568;
      font-weight: bold;
      text-align: left;
      padding: 8px;
      border-bottom: 2px solid #cbd5e0;
      font-size: 9pt;
    }

    td {
      padding: 8px;
      border-bottom: 1px solid #edf2f7;
      font-size: 9pt;
      color: #2d3748;
    }

    tbody tr:nth-child(even) {
      background-color: #f7fafc; /* Fondo lavado */
    }
  </style>
</head>
<body>
  <h1>Reporte Operativo de Expedientes</h1>
  <div class="header-info">
    <strong>Plataforma Legal Desmulta</strong><br>
    Filtros aplicados: ${filtrosStr || 'Ninguno (Todos los registros)'}
  </div>

  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Nombre</th>
        <th>Cédula</th>
        <th>Placa</th>
        <th>Ciudad</th>
        <th>Estado</th>
        <th>Fecha Creación</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
</body>
</html>`;
}
