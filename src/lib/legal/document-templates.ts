/**
 * DESMULTA — Base de Datos Legal de Documentos v3.0
 *
 * 5 tipos de documentos legales diferenciados:
 *   1. peticion_general      — Derecho de Petición exploratorio
 *   2. prescripcion_directa  — Prescripción 3 años sin mandamiento
 *   3. doble_prescripcion    — Doble prescripción (3+3) con cobro coactivo
 *   4. nulidad_notificacion  — Nulidad fotomulta (C-038/2020)
 *   5. tutela_silencio       — Acción de tutela por silencio administrativo
 *
 * REGLAS DE FORMATO para el motor PDF:
 *   - cuerpo/facultades/indemnidad: arrays de strings, cada uno <= 85 chars
 *   - NO incluir títulos de sección dentro de los arrays; el motor los agrega
 *   - Líneas vacías ('') generan separación visual
 */

export type DocumentType =
  | 'poder_especial'
  | 'peticion_general'
  | 'prescripcion_directa'
  | 'doble_prescripcion'
  | 'nulidad_notificacion'
  | 'tutela_silencio';

export interface CaseDataForPDF {
  infractorName: string;
  infractorId: string;
  licensePlate: string;
  ticketNumber?: string;
  antiguedad?: string;
  estadoCoactivo?: string;
  tipoInfraccion?: string;
  shortId: string;
  citizenEmail?: string;
  caseId?: string;
  fechaHechos?: string;
}

export interface DocumentBlock {
  titulo: string;
  subtitulo: string;
  nombreArchivo: string;
  fundamentosTitulo?: string;
  seccion1Titulo?: string;
  seccion2Titulo?: string;
  seccion3Titulo?: string;
  firmaTexto?: string;
  firmaTipo?: 'poder' | 'texto';
  cuerpo: (data: CaseDataForPDF) => string[];
  facultades: string[];
  indemnidad: string[] | ((data: CaseDataForPDF) => string[]);
  protocolo2213: (data: CaseDataForPDF) => string[];
}

const getApoderado = () => {
  const name = process.env.OPERATOR_LEGAL_NAME || process.env.DEFAULT_OPERATOR_NAME;
  const id = process.env.OPERATOR_LEGAL_ID || process.env.DEFAULT_OPERATOR_ID;
  if (!name || !id) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[Seguridad] OPERATOR_LEGAL_NAME o DEFAULT_OPERATOR_NAME no configurados. Usando fallback legal genérico.'
      );
      return 'Abogado de Apoyo Legal Desmulta';
    }
    return 'Abogado de Prueba, C.C. No. 0000000000';
  }
  return `${name}, C.C. No. ${id}`;
};
const placa = (d: CaseDataForPDF) =>
  d.licensePlate && d.licensePlate !== 'N/A' ? `, vehículo placa ${d.licensePlate}` : '';

// ═══════════════════════════════════════════════════════════════════
// 0. PODER ESPECIAL DE GESTIÓN (Aislado)
// ═══════════════════════════════════════════════════════════════════
const poderEspecial: DocumentBlock = {
  titulo: 'PODER ESPECIAL AMPLIO Y SUFICIENTE',
  subtitulo: '(Art. 74 C.G.P. — Ley 2213 de 2022)',
  nombreArchivo: 'Poder_Especial',
  cuerpo: (d) => [
    `Yo, ${d.infractorName}, mayor de edad, identificado(a) con C.C. No. ${d.infractorId},`,
    `actuando en mi propio nombre y representación, manifiesto que por medio del presente documento`,
    `otorgo PODER ESPECIAL, amplio y suficiente a ${getApoderado()},`,
    `apoderado especial, para que en mi nombre y representación adelante todas las actuaciones`,
    `administrativas, peticiones, recursos y demás gestiones necesarias ante los organismos`,
    `de tránsito correspondientes${placa(d)}.`,
  ],
  facultades: [
    'Solicitar y recibir información, notificaciones y copias del expediente.',
    'Interponer recursos de reposición, apelación y queja.',
    'Presentar derechos de petición, solicitudes de revocatoria directa y prescripción.',
    'Suscribir acuerdos de pago y solicitar liquidaciones.',
    'Desistimiento y cualquier otra facultad necesaria para el buen recaudó y defensa de mis intereses.',
  ],
  indemnidad: [
    'Eximo a mi apoderado de toda responsabilidad que derive de la inexactitud de la información',
    'por mí suministrada o de los resultados de las gestiones administrativas que dependan del ente de tránsito.',
  ],
  protocolo2213: (d) => [
    `Este mandato se perfecciona con la remisión del documento escaneado`,
    `desde: ${d.citizenEmail || '[correo del poderdante]'}`,
    `hacia: contactodesmulta@protonmail.com`,
    `Conforme al Art. 2 Ley 2213 de 2022.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 1. DERECHO DE PETICIÓN GENERAL
// ═══════════════════════════════════════════════════════════════════
const peticionGeneral: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN',
  subtitulo: '(Art. 23 C.P. — Ley 1437 de 2011 CPACA — Ley 769 de 2002)',
  nombreArchivo: 'Peticion_General',
  fundamentosTitulo: 'II. FUNDAMENTOS JURIDICOS Y CAUSALES DE RECLAMACION:',
  seccion1Titulo: 'III. PETICIONES CONCRETAS:',
  seccion2Titulo: 'IV. NOTIFICACIONES Y ANEXOS:',
  firmaTexto: 'FIRMA DEL PETICIONARIO',
  cuerpo: (d) => {
    const listado: string[] = [
      `PETICIONARIO: ${d.infractorName} (C.C. No. ${d.infractorId})`,
      ``,
      `Yo, ${d.infractorName}, mayor de edad, identificado(a) con C.C. No. ${d.infractorId},`,
      `actuando en mi propio nombre y representación, en ejercicio del Derecho de Petición`,
      `consagrado en el Articulo 23 de la Constitución Política de Colombia y la`,
      `Ley 1437 de 2011, me dirijo a ustedes muy respetuosamente para solicitar la declaratoria`,
      `de prescripción y/o nulidad de las obligaciones contravencionales que figuran en su sistema.`,
      ``,
      `I. HECHOS Y OBLIGACIONES OBJETO DE PETICIÓN:`,
      `Figuran a mi nombre en su organismo de tránsito las siguientes obligaciones contravencionales:`,
    ];

    if (d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR') {
      const infraccionTxt = d.tipoInfraccion ? ` (Infraccion ${d.tipoInfraccion})` : '';
      const coactivoTxt = d.estadoCoactivo ? `, Estado/Coactivo: ${d.estadoCoactivo}` : '';
      const placaTxt =
        d.licensePlate && d.licensePlate !== 'N/A' ? `, Vehiculo de Placa: ${d.licensePlate}` : '';
      listado.push(
        `- Comparendo/Obligacion No. ${d.ticketNumber}${infraccionTxt}${placaTxt}${coactivoTxt}.`
      );
    } else {
      listado.push(
        `- Obligaciones contravencionales asociadas a mi identificación y/o vehículos registrados en su jurisdicción.`
      );
    }

    if (d.antiguedad) {
      listado.push(
        `- Las obligaciones descritas tienen una antiguedad aproximada de ${d.antiguedad} desde su fecha de imposicion.`
      );
    }

    if (d.fechaHechos) {
      listado.push(`- Fecha(s) de los hechos o infracciones: ${d.fechaHechos}.`);
    }

    listado.push(
      ``,
      `Sustento el presente escrito en los siguientes hechos, fundamentos de derecho y causales específicas:`
    );

    return listado;
  },
  facultades: [
    'DECLARAR LA PRESCRIPCION de oficio de la(s) obligación(es) si existieren.',
    'ORDENAR EL LEVANTAMIENTO de medidas cautelares (embargos) si existieren.',
    'EXPEDIR OFICIOS DE DESEMBARGO originales y remitirlos al correo electrónico.',
    'ACTUALIZAR SIMIT Y RUNT con saldo en cero ($0).',
  ],
  indemnidad: (d) => [
    'Para efectos de notificaciones, recibire comunicaciones en el correo electrónico:',
    `${d.citizenEmail || 'contactodesmulta@protonmail.com'}`,
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. PRESCRIPCIÓN DIRECTA (3 años sin mandamiento de pago)
// ═══════════════════════════════════════════════════════════════════
const prescripcionDirecta: DocumentBlock = {
  titulo: 'PODER PARA SOLICITUD DE PRESCRIPCION EXTINTIVA',
  subtitulo: '(Art. 159 Ley 769 de 2002 — Art. 2535 C.C. — Sentencia C-980/2010)',
  nombreArchivo: 'Prescripcion_Directa',
  cuerpo: (d) => [
    `Yo, ${d.infractorName}, identificado(a) con C.C. No. ${d.infractorId},`,
    `actuando en mi propio nombre, otorgo PODER ESPECIAL a ${getApoderado()},`,
    `para que en mi nombre solicite ante la Secretaría de Tránsito competente`,
    `la declaratoria de PRESCRIPCION EXTINTIVA de la(s) multa(s) de tránsito`,
    `registradas a mi nombre${placa(d)}${d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR' ? ' bajo la(s) resolución(es) o comparendo(s) ' + d.ticketNumber : ''}.`,
    ``,
    d.fechaHechos ? `Los hechos ocurrieron en la(s) siguiente(s) fecha(s): ${d.fechaHechos}.` : '',
    d.fechaHechos ? `` : '',
    `FUNDAMENTO DE DERECHO:`,
    `El Art. 159 de la Ley 769 de 2002 (Codigo Nacional de Tránsito) establece`,
    `que las sanciones de tránsito prescriben en TRES (3) AÑOS contados desde`,
    `la ocurrencia del hecho, cuando no se ha proferido mandamiento de pago.`,
    `Han transcurrido más de tres (3) años sin interrupcion valida del termino.`,
    `La prescripción opera de pleno derecho y debe ser declarada de oficio`,
    `por la entidad (Sentencia C-980 de 2010, Corte Constitucional).`,
  ],
  facultades: [
    'Presentar la solicitud formal de prescripción extintiva ante la entidad.',
    'Aportar pruebas de la antiguedad de la infraccion y de la inactividad.',
    'Recibir la resolución de declaratoria de prescripción.',
    'Interponer recursos de reposicion y apelación ante cualquier negativa.',
    'Solicitar la exclusion definitiva del registro en el SIMIT.',
  ],
  indemnidad: [
    'Manifiesto bajo juramento que la información sobre la antiguedad de',
    'la infraccion es veraz. Asumo plena responsabilidad por la exactitud',
    'de los datos y eximo al apoderado de cualquier responsabilidad derivada',
    'de información incorrecta o desactualizada por mi suministrada.',
  ],
  protocolo2213: (d) => [
    `Perfeccionamiento conforme a la Ley 2213 de 2022 (Art. 2):`,
    `Remitir documento escaneado con firma ológrafa y copia del documento`,
    `de identidad desde: ${d.citizenEmail || '[correo del poderdante]'}`,
    `hacia: contactodesmulta@protonmail.com`,
    `Referencia: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. DOBLE PRESCRIPCIÓN (3 años + 3 años tras cobro coactivo)
// ═══════════════════════════════════════════════════════════════════
const doblePrescripcion: DocumentBlock = {
  titulo: 'PODER PARA PRESCRIPCION POR DOBLE TERMINO (COBRO COACTIVO)',
  subtitulo: '(Art. 159 C.N.T. — Arts. 2512, 2535 C.C. — Ley 1066/2006 — T-645/2017)',
  nombreArchivo: 'Doble_Prescripcion',
  cuerpo: (d) => [
    `Yo, ${d.infractorName}, identificado(a) con C.C. No. ${d.infractorId},`,
    `otorgo PODER ESPECIAL AMPLIO a ${getApoderado()},`,
    `para que en mi nombre solicite la declaratoria de PRESCRIPCION EXTINTIVA`,
    `POR DOBLE TERMINO de la(s) multa(s) de tránsito`,
    `registradas a mi nombre${placa(d)}${d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR' ? ' bajo la(s) resolución(es) o comparendo(s) ' + d.ticketNumber : ''}.`,
    ``,
    d.fechaHechos ? `Los hechos asociados registran fecha(s): ${d.fechaHechos}.` : '',
    d.fechaHechos ? `` : '',
    `PRIMER TERMINO (Art. 159 C.N.T.):`,
    `Han transcurrido más de TRES (3) AÑOS desde la fecha de la infraccion`,
    `original sin interrupcion valida por parte de la entidad de tránsito.`,
    ``,
    `SEGUNDO TERMINO (Art. 2535 C.C. aplicado por analogia):`,
    `Han transcurrido ademas más de TRES (3) AÑOS desde la notificación del`,
    `mandamiento de pago o inicio del cobro coactivo, sin que la entidad`,
    `haya adelantado actuaciones efectivas de cobro que interrumpan el termino.`,
    ``,
    `La Sentencia T-645 de 2017 (Corte Constitucional) reconoce la operancia`,
    `de la prescripción acumulada cuando el tiempo total supera seis (6) años`,
    `sin gestion efectiva, lo que extingue definitivamente la obligación.`,
  ],
  facultades: [
    'Argumentar jurídicamente los dos terminos de prescripción acumulados.',
    'Solicitar el archivo definitivo del proceso de cobro coactivo.',
    'Gestionar el levantamiento de embargos o medidas cautelares vigentes.',
    'Interponer recursos administrativos y/o acciones judiciales si la entidad',
    'niega la prescripción en cualquiera de sus instancias.',
    'Solicitar certificacion de paz y salvo ante el SIMIT y la entidad.',
  ],
  indemnidad: [
    'Certifico que la información sobre el tiempo transcurrido desde la',
    'infraccion original y desde el inicio del cobro coactivo es veraz.',
    'Entiendo que aportar datos falsos o inexactos puede constituir fraude',
    'procesal. Eximo expresamente a mi apoderado de toda responsabilidad',
    'por inexactitud en los datos por mi suministrados.',
  ],
  protocolo2213: (d) => [
    `Firma ológrafa original requerida para este tipo de poder.`,
    `Remitir documento escaneado con copia de cédula y documentos del cobro`,
    `coactivo desde: ${d.citizenEmail || '[correo del poderdante]'}`,
    `hacia: contactodesmulta@protonmail.com`,
    `Ley 2213/2022 — Ley 527/1999.`,
    `Referencia: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. NULIDAD POR INDEBIDA NOTIFICACIÓN (Fotomultas — C-038/2020)
// ═══════════════════════════════════════════════════════════════════
const nulidadNotificacion: DocumentBlock = {
  titulo: 'PODER PARA RECURSO DE NULIDAD POR INDEBIDA NOTIFICACION',
  subtitulo: '(Sentencia C-038/2020 C. Const. — Art. 136 Ley 769/2002 — Art. 49 CPACA)',
  nombreArchivo: 'Nulidad_Notificacion',
  cuerpo: (d) => [
    `Yo, ${d.infractorName}, identificado(a) con C.C. No. ${d.infractorId},`,
    `otorgo PODER ESPECIAL a ${getApoderado()}, para que en`,
    `mi nombre interponga RECURSO DE NULIDAD E INVALIDEZ ante la Secretaría`,
    `que resulto en la imposicion irregular de la(s) multa(s) o fotomulta(s)`,
    `registrada(s) a mi nombre${placa(d)}${d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR' ? ' (Resolución(es) / Comparendo(s) ' + d.ticketNumber + ')' : ''}.`,
    ``,
    `FUNDAMENTO CONSTITUCIONAL:`,
    `La Sentencia C-038 de 2020 de la Corte Constitucional declaro inexequible`,
    `la notificación por aviso en foto-multas cuando no se acredita la plena`,
    `identificación del conductor infractor, vulnerando el Art. 29 C.P.`,
    ``,
    `ARGUMENTOS ESPECIFICOS DEL RECURSO:`,
    `1.  La entidad no acreditó la identificación plena del conductor.`,
    `2.  No se agotó la notificación personal conforme al Art. 67 del CPACA`,
    `     antes de acudir al mecanismo de notificación por aviso.`,
    `3.  El comparendo carece de los requisitos del Art. 136 del C.N.T.`,
    `     que garantizan el derecho de contradicción del infractor.`,
  ],
  facultades: [
    'Presentar el recurso de nulidad con soporte en la jurisprudencia',
    'constitucional C-038/2020 y la Ley 1437 de 2011.',
    'Aportar pruebas documentales de la deficiencia en la notificación.',
    'Solicitar la suspensión provisional del cobro mientras se decide.',
    'Interponer apelación ante el superior jerárquico de la entidad.',
    'Instaurar acción de tutela si persiste la vulneracion al debido proceso.',
  ],
  indemnidad: [
    'Autorizo a mi apoderado para invocar la Sentencia C-038/2020 en mi',
    'defensa. Comprendo que el exito del recurso depende del analisis del',
    'expediente particular y de las pruebas disponibles sobre la notificación.',
    'Eximo al apoderado de responsabilidad por decisiones adversas de la',
    'administracion que no sean atribuibles a su gestion.',
  ],
  protocolo2213: (d) => [
    `Firma ológrafa obligatoria para recursos de nulidad (puede exigirse`,
    `autenticación notarial segun la entidad receptora).`,
    `Remitir documento escaneado con foto del comparendo si se dispone de el,`,
    `desde: ${d.citizenEmail || '[correo del poderdante]'}`,
    `hacia: contactodesmulta@protonmail.com`,
    `Referencia: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 5. ACCIÓN DE TUTELA (Silencio Administrativo / Vulneración Petición)
// ═══════════════════════════════════════════════════════════════════
const tutelaSilencio: DocumentBlock = {
  titulo: 'PODER PARA ACCIÓN DE TUTELA',
  subtitulo: '(Art. 86 C.P. — Decreto 2591/1991 — Silencio Administrativo Negativo)',
  nombreArchivo: 'Tutela_Silencio',
  cuerpo: (d) => [
    `Yo, ${d.infractorName}, identificado(a) con C.C. No. ${d.infractorId},`,
    `otorgo PODER ESPECIAL a ${getApoderado()}, para que`,
    `en mi nombre interponga ACCIÓN DE TUTELA ante el Juez competente`,
    `(reparto) en contra de la Secretaría de Tránsito correspondiente,`,
    `por VULNERACION DEL DERECHO FUNDAMENTAL DE PETICIÓN (Art. 23 C.P.)`,
    `y SILENCIO ADMINISTRATIVO NEGATIVO${d.licensePlate && d.licensePlate !== 'N/A' ? ` en asunto relacionado con el vehículo de placa ${d.licensePlate}` : ''}.`,
    ``,
    `HECHOS QUE FUNDAMENTAN LA ACCIÓN:`,
    `1.   Se formuló Derecho de Petición ante la entidad accionada.`,
    `2.  Transcurrieron más de QUINCE (15) días hábiles sin respuesta`,
    `      de fondo, clara, precisa y de fondo (Art. 14, Ley 1437/2011).`,
    `3. El silencio administrativo vulnera el Art. 23 de la C.P.`,
    `4.  No existe otro mecanismo judicial de defensa igualmente eficaz.`,
    `5.   Se genera perjuicio irremediable al ignorarse el estado real`,
    `      de las multas y la posible prescripción de las mismas.`,
  ],
  facultades: [
    'Redactar e interponer la acción de tutela ante el juez competente.',
    'Allegar todas las pruebas de la omision de la entidad accionada.',
    'Notificarse de la admision, traslado y fallo de primera instancia.',
    'Impugnar el fallo desfavorable ante el superior jerárquico.',
    'Solicitar el cumplimiento inmediato del fallo favorable.',
    'Iniciar incidente de desacato si la entidad incumple la orden judicial.',
  ],
  indemnidad: [
    'Certifico que formule previamente el Derecho de Petición y que la',
    'entidad accionada no respondio en el termino legal establecido.',
    'Asumo responsabilidad total por la veracidad de los hechos relatados.',
    'Eximo al apoderado de responsabilidad por el resultado del fallo,',
    'el cual depende exclusivamente de la decisión del juez constitucional.',
  ],
  protocolo2213: (d) => [
    `IMPORTANTE: Para la tutela se requiere firma ológrafa ORIGINAL.`,
    `El juez puede exigir autenticación notarial del poder; coordinar`,
    `con el apoderado para firma presencial o ante notario segun el caso.`,
    `Contacto: contactodesmulta@protonmail.com`,
    `Referencia: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════
export const DOCUMENT_TEMPLATES: Record<DocumentType, DocumentBlock> = {
  poder_especial: poderEspecial,
  peticion_general: peticionGeneral,
  prescripcion_directa: prescripcionDirecta,
  doble_prescripcion: doblePrescripcion,
  nulidad_notificacion: nulidadNotificacion,
  tutela_silencio: tutelaSilencio,
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  poder_especial: 'Poder Especial de Gestión',
  peticion_general: 'Derecho de Petición (General/Exploratorio)',
  prescripcion_directa: 'Prescripción Directa (3 años sin mandamiento)',
  doble_prescripcion: 'Doble Prescripción (3+3 años, cobro coactivo)',
  nulidad_notificacion: 'Nulidad por Indebida Notificación (Fotomultas)',
  tutela_silencio: 'Accion de Tutela (Silencio / Vulneracion Petición)',
};

/** Sugerencia automática del tipo de documento según datos del caso */
export function sugerirTipoDocumento(
  antiguedad?: string,
  estadoCoactivo?: string,
  tipoInfraccion?: string
): { tipo: DocumentType; razon: string } {
  const coactivo = estadoCoactivo === 'SÍ';
  const masde3 = antiguedad === 'Más de 3 años';
  const entre1y3 = antiguedad === 'Entre 1 y 3 años';
  const esFotomulta =
    tipoInfraccion?.toLowerCase().includes('foto') ||
    tipoInfraccion?.toLowerCase().includes('cámara');

  if (masde3 && coactivo)
    return {
      tipo: 'doble_prescripcion',
      razon: 'Más de 3 años + cobro coactivo → doble prescripción',
    };
  if (masde3 && !coactivo)
    return {
      tipo: 'prescripcion_directa',
      razon: 'Más de 3 años sin mandamiento → prescripción directa',
    };
  if (esFotomulta)
    return {
      tipo: 'nulidad_notificacion',
      razon: 'Fotomulta → nulidad por indebida notificación (C-038/2020)',
    };
  if (entre1y3)
    return {
      tipo: 'peticion_general',
      razon: 'Entre 1 y 3 años → derecho de petición informativo',
    };

  return {
    tipo: 'peticion_general',
    razon: 'Caso general → iniciar con derecho de petición exploratorio',
  };
}
