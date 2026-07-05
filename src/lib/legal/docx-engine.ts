import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { DocumentType, DOCUMENT_TEMPLATES, CaseDataForPDF, DocumentBlock } from './document-templates';

export interface MandatePayload {
  infractorName: string;
  infractorId: string;
  operatorName: string;
  operatorId: string;
  ticketNumber: string;
  licensePlate: string;
  shortId: string;
  acceptedAt: string;
  citizenEmail?: string;
  citizenName?: string;
  citizenId?: string;
  caseId?: string;
  documentType?: DocumentType;
  antiguedad?: string;
  estadoCoactivo?: string;
  tipoInfraccion?: string;
  causalId?: string;
  fechaHechos?: string;
}

export async function generateMandateDOCX(payload: MandatePayload): Promise<Uint8Array> {
  const dType = payload.documentType || 'peticion_general';
  const block: DocumentBlock = DOCUMENT_TEMPLATES[dType] || DOCUMENT_TEMPLATES['peticion_general'];

  const caseData: CaseDataForPDF = {
    infractorName: payload.infractorName,
    infractorId: payload.infractorId,
    licensePlate: payload.licensePlate,
    ticketNumber: payload.ticketNumber,
    antiguedad: payload.antiguedad,
    estadoCoactivo: payload.estadoCoactivo,
    tipoInfraccion: payload.tipoInfraccion,
    shortId: payload.shortId,
    citizenEmail: payload.citizenEmail,
    caseId: payload.caseId,
    fechaHechos: payload.fechaHechos || payload.acceptedAt,
  };

  const children = [];

  // Título
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: block.titulo, bold: true, size: 28 })],
    })
  );

  // Subtítulo
  if (block.subtitulo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: block.subtitulo, bold: true, size: 24 })],
      })
    );
  }

  // Función auxiliar para agregar líneas de texto con justificación y espaciado formal
  const addLines = (lines: string[], bold = false) => {
    lines.forEach((line) => {
      if (line.trim() === '') {
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 120, line: 360 }, // line: 360 es aprox 1.5 spacing
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: line, bold, size: 24 })], // size 24 = 12pt
          })
        );
      }
    });
  };

  // Cuerpo del documento
  addLines(block.cuerpo(caseData));

  // Facultades / Fundamentos
  if (block.facultades && block.facultades.length > 0) {
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: block.seccion1Titulo || (block.firmaTipo === 'poder' ? 'FACULTADES:' : 'HECHOS Y FUNDAMENTOS:'),
            bold: true,
            size: 24,
          }),
        ],
      })
    );
    addLines(block.facultades);
  }

  // Indemnidad / Peticiones
  if (block.indemnidad) {
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: block.seccion2Titulo || (block.firmaTipo === 'poder' ? 'INDEMNIDAD:' : 'PETICIONES:'),
            bold: true,
            size: 24,
          }),
        ],
      })
    );
    const indLines = typeof block.indemnidad === 'function' ? block.indemnidad(caseData) : block.indemnidad;
    addLines(indLines);
  }

  // Protocolo 2213 / Anexos
  if (block.protocolo2213) {
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: block.seccion3Titulo || (block.firmaTipo === 'poder' ? 'LEY 2213 DE 2022:' : 'ANEXOS Y NOTIFICACIONES:'),
            bold: true,
            size: 24,
          }),
        ],
      })
    );
    addLines(block.protocolo2213(caseData));
  }

  // Firma
  children.push(new Paragraph({ text: '', spacing: { after: 800 } }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [new TextRun({ text: '________________________________________________', bold: true, size: 24 })],
    })
  );

  if (block.firmaTipo === 'poder') {
    children.push(new Paragraph({ children: [new TextRun({ text: 'EL PODERDANTE', bold: true, size: 24 })] }));
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: 'EL SOLICITANTE / PETICIONARIO', bold: true, size: 24 })] }));
  }
  
  children.push(new Paragraph({ children: [new TextRun({ text: `Nombre: ${payload.infractorName}`, size: 24 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `C.C. No. ${payload.infractorId}`, size: 24 })] }));

  // Creación del Documento
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 pulgada (1440 twips)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
