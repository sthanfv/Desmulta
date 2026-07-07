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
  const name = process.env.OPERATOR_LEGAL_NAME;
  const id = process.env.OPERATOR_LEGAL_ID;
  if (!name || !id) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[Seguridad] OPERATOR_LEGAL_NAME o OPERATOR_LEGAL_ID no configurados. Usando fallback legal genérico.'
      );
      return 'Abogado de Apoyo Legal Desmulta';
    }
    return 'Abogado de Prueba, C.C. No. 0000000000';
  }
  return `${name}, C.C. No. ${id}`;
};
const placa = (d: CaseDataForPDF) =>
  d.licensePlate && d.licensePlate !== 'N/A' ? `, vehiculo placa ${d.licensePlate}` : '';

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
    'Desistimiento y cualquier otra facultad necesaria para el buen recaudo y defensa de mis intereses.',
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
  titulo: 'DERECHO DE PETICION',
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
      `actuando en mi propio nombre y representacion, en ejercicio del Derecho de Peticion`,
      `consagrado en el Articulo 23 de la Constitucion Politica de Colombia y la`,
      `Ley 1437 de 2011, me dirijo a ustedes muy respetuosamente para solicitar la declaratoria`,
      `de prescripcion y/o nulidad de las obligaciones contravencionales que figuran en su sistema.`,
      ``,
      `I. HECHOS Y OBLIGACIONES OBJETO DE PETICION:`,
      `Figuran a mi nombre en su organismo de transito las siguientes obligaciones contravencionales:`,
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
        `- Obligaciones contravencionales asociadas a mi identificacion y/o vehiculos registrados en su jurisdiccion.`
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
    'DECLARAR LA PRESCRIPCION de oficio de la(s) obligacion(es) si existieren.',
    'ORDENAR EL LEVANTAMIENTO de medidas cautelares (embargos) si existieren.',
    'EXPEDIR OFICIOS DE DESEMBARGO originales y remitirlos al correo electronico.',
    'ACTUALIZAR SIMIT Y RUNT con saldo en cero ($0).',
  ],
  indemnidad: (d) => [
    'Para efectos de notificaciones, recibire comunicaciones en el correo electronico:',
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
    `para que en mi nombre solicite ante la Secretaria de Transito competente`,
    `la declaratoria de PRESCRIPCION EXTINTIVA de la(s) multa(s) de transito`,
    `registradas a mi nombre${placa(d)}${d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR' ? ' bajo la(s) resolucion(es) o comparendo(s) ' + d.ticketNumber : ''}.`,
    ``,
    d.fechaHechos ? `Los hechos ocurrieron en la(s) siguiente(s) fecha(s): ${d.fechaHechos}.` : '',
    d.fechaHechos ? `` : '',
    `FUNDAMENTO DE DERECHO:`,
    `El Art. 159 de la Ley 769 de 2002 (Codigo Nacional de Transito) establece`,
    `que las sanciones de transito prescriben en TRES (3) ANOS contados desde`,
    `la ocurrencia del hecho, cuando no se ha proferido mandamiento de pago.`,
    `Han transcurrido mas de tres (3) anos sin interrupcion valida del termino.`,
    `La prescripcion opera de pleno derecho y debe ser declarada de oficio`,
    `por la entidad (Sentencia C-980 de 2010, Corte Constitucional).`,
  ],
  facultades: [
    'Presentar la solicitud formal de prescripcion extintiva ante la entidad.',
    'Aportar pruebas de la antiguedad de la infraccion y de la inactividad.',
    'Recibir la resolucion de declaratoria de prescripcion.',
    'Interponer recursos de reposicion y apelacion ante cualquier negativa.',
    'Solicitar la exclusion definitiva del registro en el SIMIT.',
  ],
  indemnidad: [
    'Manifiesto bajo juramento que la informacion sobre la antiguedad de',
    'la infraccion es veraz. Asumo plena responsabilidad por la exactitud',
    'de los datos y eximo al apoderado de cualquier responsabilidad derivada',
    'de informacion incorrecta o desactualizada por mi suministrada.',
  ],
  protocolo2213: (d) => [
    `Perfeccionamiento conforme a la Ley 2213 de 2022 (Art. 2):`,
    `Remitir documento escaneado con firma olografa y copia del documento`,
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
    `POR DOBLE TERMINO de la(s) multa(s) de transito`,
    `registradas a mi nombre${placa(d)}${d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR' ? ' bajo la(s) resolucion(es) o comparendo(s) ' + d.ticketNumber : ''}.`,
    ``,
    d.fechaHechos ? `Los hechos asociados registran fecha(s): ${d.fechaHechos}.` : '',
    d.fechaHechos ? `` : '',
    `PRIMER TERMINO (Art. 159 C.N.T.):`,
    `Han transcurrido mas de TRES (3) ANOS desde la fecha de la infraccion`,
    `original sin interrupcion valida por parte de la entidad de transito.`,
    ``,
    `SEGUNDO TERMINO (Art. 2535 C.C. aplicado por analogia):`,
    `Han transcurrido ademas mas de TRES (3) ANOS desde la notificacion del`,
    `mandamiento de pago o inicio del cobro coactivo, sin que la entidad`,
    `haya adelantado actuaciones efectivas de cobro que interrumpan el termino.`,
    ``,
    `La Sentencia T-645 de 2017 (Corte Constitucional) reconoce la operancia`,
    `de la prescripcion acumulada cuando el tiempo total supera seis (6) anos`,
    `sin gestion efectiva, lo que extingue definitivamente la obligacion.`,
  ],
  facultades: [
    'Argumentar juridicamente los dos terminos de prescripcion acumulados.',
    'Solicitar el archivo definitivo del proceso de cobro coactivo.',
    'Gestionar el levantamiento de embargos o medidas cautelares vigentes.',
    'Interponer recursos administrativos y/o acciones judiciales si la entidad',
    'niega la prescripcion en cualquiera de sus instancias.',
    'Solicitar certificacion de paz y salvo ante el SIMIT y la entidad.',
  ],
  indemnidad: [
    'Certifico que la informacion sobre el tiempo transcurrido desde la',
    'infraccion original y desde el inicio del cobro coactivo es veraz.',
    'Entiendo que aportar datos falsos o inexactos puede constituir fraude',
    'procesal. Eximo expresamente a mi apoderado de toda responsabilidad',
    'por inexactitud en los datos por mi suministrados.',
  ],
  protocolo2213: (d) => [
    `Firma olografa original requerida para este tipo de poder.`,
    `Remitir documento escaneado con copia de cedula y documentos del cobro`,
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
    `mi nombre interponga RECURSO DE NULIDAD E INVALIDEZ ante la Secretaria`,
    `que resulto en la imposicion irregular de la(s) multa(s) o fotomulta(s)`,
    `registrada(s) a mi nombre${placa(d)}${d.ticketNumber && d.ticketNumber !== 'POR_DEFINIR' ? ' (Resolucion(es) / Comparendo(s) ' + d.ticketNumber + ')' : ''}.`,
    ``,
    `FUNDAMENTO CONSTITUCIONAL:`,
    `La Sentencia C-038 de 2020 de la Corte Constitucional declaro inexequible`,
    `la notificacion por aviso en foto-multas cuando no se acredita la plena`,
    `identificacion del conductor infractor, vulnerando el Art. 29 C.P.`,
    ``,
    `ARGUMENTOS ESPECIFICOS DEL RECURSO:`,
    `(i)  La entidad no acredito la identificacion plena del conductor.`,
    `(ii) No se agoto la notificacion personal conforme al Art. 67 del CPACA`,
    `     antes de acudir al mecanismo de notificacion por aviso.`,
    `(iii) El comparendo carece de los requisitos del Art. 136 del C.N.T.`,
    `     que garantizan el derecho de contradiccion del infractor.`,
  ],
  facultades: [
    'Presentar el recurso de nulidad con soporte en la jurisprudencia',
    'constitucional C-038/2020 y la Ley 1437 de 2011.',
    'Aportar pruebas documentales de la deficiencia en la notificacion.',
    'Solicitar la suspension provisional del cobro mientras se decide.',
    'Interponer apelacion ante el superior jerarquico de la entidad.',
    'Instaurar accion de tutela si persiste la vulneracion al debido proceso.',
  ],
  indemnidad: [
    'Autorizo a mi apoderado para invocar la Sentencia C-038/2020 en mi',
    'defensa. Comprendo que el exito del recurso depende del analisis del',
    'expediente particular y de las pruebas disponibles sobre la notificacion.',
    'Eximo al apoderado de responsabilidad por decisiones adversas de la',
    'administracion que no sean atribuibles a su gestion.',
  ],
  protocolo2213: (d) => [
    `Firma olografa obligatoria para recursos de nulidad (puede exigirse`,
    `autenticacion notarial segun la entidad receptora).`,
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
  titulo: 'PODER PARA ACCION DE TUTELA',
  subtitulo: '(Art. 86 C.P. — Decreto 2591/1991 — Silencio Administrativo Negativo)',
  nombreArchivo: 'Tutela_Silencio',
  cuerpo: (d) => [
    `Yo, ${d.infractorName}, identificado(a) con C.C. No. ${d.infractorId},`,
    `otorgo PODER ESPECIAL a ${getApoderado()}, para que`,
    `en mi nombre interponga ACCION DE TUTELA ante el Juez competente`,
    `(reparto) en contra de la Secretaria de Transito correspondiente,`,
    `por VULNERACION DEL DERECHO FUNDAMENTAL DE PETICION (Art. 23 C.P.)`,
    `y SILENCIO ADMINISTRATIVO NEGATIVO${placa(d) ? ` en asunto relacionado con${placa(d)}` : ''}.`,
    ``,
    `HECHOS QUE FUNDAMENTAN LA ACCION:`,
    `(i)   Se formulo Derecho de Peticion ante la entidad accionada.`,
    `(ii)  Transcurrieron mas de QUINCE (15) dias habiles sin respuesta`,
    `      de fondo, clara, precisa y de fondo (Art. 14, Ley 1437/2011).`,
    `(iii) El silencio administrativo vulnera el Art. 23 de la C.P.`,
    `(iv)  No existe otro mecanismo judicial de defensa igualmente eficaz.`,
    `(v)   Se genera perjuicio irremediable al ignorarse el estado real`,
    `      de las multas y la posible prescripcion de las mismas.`,
  ],
  facultades: [
    'Redactar e interponer la accion de tutela ante el juez competente.',
    'Allegar todas las pruebas de la omision de la entidad accionada.',
    'Notificarse de la admision, traslado y fallo de primera instancia.',
    'Impugnar el fallo desfavorable ante el superior jerarquico.',
    'Solicitar el cumplimiento inmediato del fallo favorable.',
    'Iniciar incidente de desacato si la entidad incumple la orden judicial.',
  ],
  indemnidad: [
    'Certifico que formule previamente el Derecho de Peticion y que la',
    'entidad accionada no respondio en el termino legal establecido.',
    'Asumo responsabilidad total por la veracidad de los hechos relatados.',
    'Eximo al apoderado de responsabilidad por el resultado del fallo,',
    'el cual depende exclusivamente de la decision del juez constitucional.',
  ],
  protocolo2213: (d) => [
    `IMPORTANTE: Para la tutela se requiere firma olografa ORIGINAL.`,
    `El juez puede exigir autenticacion notarial del poder; coordinar`,
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
  peticion_general: 'Derecho de Peticion (General/Exploratorio)',
  prescripcion_directa: 'Prescripcion Directa (3 anos sin mandamiento)',
  doble_prescripcion: 'Doble Prescripcion (3+3 anos, cobro coactivo)',
  nulidad_notificacion: 'Nulidad por Indebida Notificacion (Fotomultas)',
  tutela_silencio: 'Accion de Tutela (Silencio / Vulneracion Peticion)',
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
      razon: 'Mas de 3 anos + cobro coactivo → doble prescripcion',
    };
  if (masde3 && !coactivo)
    return {
      tipo: 'prescripcion_directa',
      razon: 'Mas de 3 anos sin mandamiento → prescripcion directa',
    };
  if (esFotomulta)
    return {
      tipo: 'nulidad_notificacion',
      razon: 'Fotomulta → nulidad por indebida notificacion (C-038/2020)',
    };
  if (entre1y3)
    return {
      tipo: 'peticion_general',
      razon: 'Entre 1 y 3 anos → derecho de peticion informativo',
    };

  return {
    tipo: 'peticion_general',
    razon: 'Caso general → iniciar con derecho de peticion exploratorio',
  };
}
