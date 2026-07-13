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
  | 'tutela_silencio'
  | 'caducidad_1_anio'
  | 'nulidad_falta_identidad';

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
      return 'Analista Legal de Apoyo Desmulta';
    }
    return 'Especialista en Tránsito de Prueba, C.C. No. 0000000000';
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
// 1. DERECHO DE PETICIÓN GENERAL (EXPLORATORIA) - FASE 1
// ═══════════════════════════════════════════════════════════════════
const peticionGeneral: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN EN INTERÉS PARTICULAR',
  subtitulo: '(Art. 23 C.P. — Solicitud de copias íntegras y trazabilidad de notificación)',
  nombreArchivo: 'Peticion_Copias_Expediente',
  seccion1Titulo: 'II. PETICIONES CONCRETAS:',
  seccion2Titulo: 'III. NOTIFICACIONES Y ANEXOS:',
  cuerpo: (d) => {
    return [
      `Me dirijo a ustedes para elevar la siguiente solicitud de información y expedición de copias, respecto al comparendo No. ${d.ticketNumber || '[NUMERO DE COMPARENDO]'}${d.licensePlate && d.licensePlate !== 'N/A' ? ` asociado al vehículo de placas ${d.licensePlate}` : ''}.`,
      ``,
      `FUNDAMENTOS DE DERECHO`,
      ``,
      `Esta solicitud se ampara en el derecho fundamental al debido proceso (Art. 29 de la Constitución Política) y el derecho de acceso a la información y documentos públicos (Art. 74 C.P.).`,
      ``,
      `Estos derechos son requisitos indispensables para poder ejercer de manera material mi derecho a la defensa y contradicción, dado que a la fecha desconozco los detalles procesales de la actuación surtida por esta entidad y los soportes que le dieron origen.`,
    ];
  },
  facultades: [
    'Expedir y enviar copia íntegra de la orden de comparendo referenciada, junto con sus respectivos soportes gráficos y/o documentales.',
    'Remitir copia de la guía de envío generada por la empresa de mensajería (correo certificado) mediante la cual se pretendió notificar la orden, incluyendo el acuse de recibo.',
    'Certificar y entregar copia de la Resolución Sancionatoria o Mandamiento de Pago (de haberse proferido), así como la guía de mensajería correspondiente a dichos actos.',
    'En caso de tratarse de fotodetección, entregar copia del certificado de calibración vigente expedido por la entidad competente para el dispositivo tecnológico.',
    'Informar el estado procesal actual de la actuación administrativa, detallando si se encuentra en etapa de cobro persuasivo, coactivo, o si existen medidas cautelares.',
  ],
  indemnidad: [
    'Anexo: Fotocopia de la cédula de ciudadanía.',
    'Anexo: Impresión de la consulta del estado de cuenta en el SIMIT.',
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
    `Advertencia Interna: Riesgo BAJO. Fase preparatoria. Esta petición no elimina la multa de facto; recolecta pruebas vinculantes para estructurar la defensa (ej. Nulidad por indebida notificación).`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. PRESCRIPCIÓN DIRECTA (3 AÑOS SIN MANDAMIENTO)
// ═══════════════════════════════════════════════════════════════════
const prescripcionDirecta: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN EN INTERÉS PARTICULAR',
  subtitulo: '(Art. 23 C.P. — Solicitud declaratoria de PRESCRIPCIÓN Art. 159 Ley 769 de 2002)',
  nombreArchivo: 'Derecho_Peticion_Prescripcion',
  seccion1Titulo: 'II. PETICIONES CONCRETAS:',
  seccion2Titulo: 'III. NOTIFICACIONES Y ANEXOS:',
  cuerpo: (d) => {
    return [
      `PRIMERO: El día ${d.fechaHechos || '[FECHA DE LA INFRACCIÓN]'} se generó la orden de comparendo No. ${d.ticketNumber || '[NUMERO DE COMPARENDO]'}${d.licensePlate && d.licensePlate !== 'N/A' ? ` asociada al vehículo de placas ${d.licensePlate}` : ''}.`,
      ``,
      `SEGUNDO: Desde la fecha de ocurrencia de los hechos hasta el día de la presentación de esta petición, han transcurrido más de TRES (3) AÑOS.`,
      ``,
      `TERCERO: Durante este lapso, no he sido notificado(a) en debida forma, conforme a los lineamientos legales y constitucionales, de ningún Mandamiento de Pago que interrumpa el término de prescripción de la acción de cobro.`,
      ``,
      `FUNDAMENTOS DE DERECHO`,
      ``,
      `Apoyo mi solicitud en el Artículo 159 de la Ley 769 de 2002 (Código Nacional de Tránsito), el cual es claro y perentorio al establecer:`,
      ``,
      `"Las sanciones impuestas por infracciones a las normas de tránsito prescribirán en tres (3) años contados a partir de la ocurrencia del hecho; la prescripción deberá ser declarada de oficio y se interrumpirá con la notificación del mandamiento de pago. La autoridad de tránsito no podrá iniciar el cobro coactivo de sanciones respecto de las cuales se encuentren configurados los supuestos de la caducidad."`,
      ``,
      `Al haber superado el límite temporal de los tres (3) años sin que la administración haya ejercido de manera efectiva y notificada su acción de cobro, el Estado pierde la competencia jurídica para exigir el pago de dicha obligación.`,
    ];
  },
  facultades: [
    'Declarar de manera formal y mediante acto administrativo la PRESCRIPCIÓN de la acción de cobro respecto a la sanción originada por el comparendo referenciado en los hechos.',
    'Ordenar el archivo definitivo del proceso de cobro coactivo que curse o pretenda cursar en mi contra por esta infracción, levantando cualquier medida cautelar (embargos) que se hubiese proferido, si aplica.',
    'Ordenar la descarga, actualización y eliminación inmediata del registro de esta deuda a mi cargo en el Sistema Integrado de Información sobre Multas (SIMIT) y en el RUNT.',
  ],
  indemnidad: [
    'Anexo: Fotocopia de la cédula de ciudadanía.',
    'Anexo: Impresión del estado de cuenta (SIMIT/RUNT) donde se evidencia la fecha de la infracción.',
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
    `Advertencia Interna: Riesgo nivel MEDIO por posible interrupción del término (Mandamiento de Pago emitido antes de los 3 años). Posible fase 2 requerida.`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. DOBLE PRESCRIPCIÓN / PRESCRIPCIÓN ABSOLUTA (MÁS DE 6 AÑOS)
// ═══════════════════════════════════════════════════════════════════
const doblePrescripcion: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN EN INTERÉS PARTICULAR',
  subtitulo:
    '(Art. 23 C.P. — Prescripción absoluta de la acción de cobro y pérdida de ejecutoriedad)',
  nombreArchivo: 'Prescripcion_Absoluta_6_Anios',
  seccion1Titulo: 'II. PETICIONES CONCRETAS:',
  seccion2Titulo: 'III. NOTIFICACIONES Y ANEXOS:',
  cuerpo: (d) => {
    return [
      `PRIMERO: El día ${d.fechaHechos || '[FECHA DE LA INFRACCIÓN]'} se generó la orden de comparendo No. ${d.ticketNumber || '[NUMERO DE COMPARENDO]'}${d.licensePlate && d.licensePlate !== 'N/A' ? ` asociada al vehículo de placas ${d.licensePlate}` : ''}.`,
      ``,
      `SEGUNDO: Desde la fecha de la presunta infracción han transcurrido más de SEIS (6) AÑOS, superando ampliamente el límite temporal máximo que otorga la ley para perseguir el pago de obligaciones de tránsito.`,
      ``,
      `TERCERO: Aun en el supuesto escenario en el que esa entidad hubiese proferido y notificado en debida forma el respectivo Mandamiento de Pago (interrumpiendo el término inicial de tres años del artículo 159 del Código Nacional de Tránsito), a la fecha ya ha transcurrido un término superior a TRES (3) AÑOS desde dicha interrupción sin que se hubiese hecho efectivo el recaudo.`,
      ``,
      `FUNDAMENTOS DE DERECHO`,
      ``,
      `El Artículo 159 de la Ley 769 de 2002 estipula que las multas de tránsito prescriben a los tres (3) años, término que se interrumpe con la notificación del mandamiento de pago.`,
      ``,
      `Ante el vacío normativo sobre qué ocurre después de notificado el mandamiento de pago, aplica la remisión al Estatuto Tributario Nacional, Artículo 818, el cual señala que, interrumpida la prescripción, el término empezará a correr de nuevo. Es decir, la administración cuenta con tres (3) años adicionales como límite fatal y definitivo.`,
      ``,
      `Sumado a lo anterior, el Artículo 91 de la Ley 1437 de 2011 (CPACA), numeral 3, establece que los actos administrativos pierden obligatoriedad y no podrán ser ejecutados "Cuando al cabo de cinco (5) años de estar en firme, la autoridad no ha realizado los actos que le correspondan para ejecutarlos."`,
      ``,
      `En mi caso particular, se han superado holgadamente todos los límites temporales (tanto los 3+3 años del Estatuto Tributario, como los 5 años del CPACA), consolidando la prescripción definitiva.`,
    ];
  },
  facultades: [
    'Declarar probada la PRESCRIPCIÓN ABSOLUTA del cobro coactivo derivado de la orden de comparendo referenciada en los hechos.',
    'Ordenar el archivo definitivo del proceso administrativo de cobro coactivo en mi contra.',
    'Ordenar el levantamiento inmediato de cualquier medida cautelar (embargos y/o secuestros), oficiando de inmediato a las entidades financieras y Oficinas de Registro de Instrumentos Públicos.',
    'Ordenar la depuración y eliminación de mi información como deudor de esta obligación en las bases de datos del SIMIT y del RUNT.',
  ],
  indemnidad: [
    'Anexo: Fotocopia de la cédula de ciudadanía.',
    'Anexo: Impresión del estado de cuenta SIMIT.',
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
    `Advertencia Interna: EXCEPCIÓN ALTA. Los Acuerdos de Pago incumplidos reinician los términos desde cero (fecha de incumplimiento), inhabilitando esta defensa.`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. NULIDAD POR INDEBIDA NOTIFICACIÓN (FOTOMULTAS - LEY 1843)
// ═══════════════════════════════════════════════════════════════════
const nulidadNotificacion: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN EN INTERÉS PARTICULAR',
  subtitulo: '(Art. 23 C.P. — Nulidad por vulneración al debido proceso y Ley 1843 de 2017)',
  nombreArchivo: 'Nulidad_Indebida_Notificacion',
  seccion1Titulo: 'II. PETICIONES CONCRETAS:',
  seccion2Titulo: 'III. NOTIFICACIONES Y ANEXOS:',
  cuerpo: (d) => {
    return [
      `PRIMERO: Al consultar la plataforma del Sistema Integrado de Información sobre Multas y Sanciones por Infracciones de Tránsito (SIMIT), encontré que aparece a mi cargo la orden de comparendo electrónico No. ${d.ticketNumber || '[NUMERO DE COMPARENDO]'}, presuntamente impuesta el día ${d.fechaHechos || '[FECHA DE LA INFRACCIÓN]'}${d.licensePlate && d.licensePlate !== 'N/A' ? ` al vehículo de placas ${d.licensePlate}` : ''}.`,
      ``,
      `SEGUNDO: A la fecha de radicación de este documento, NO he recibido notificación personal ni correspondencia alguna en mi lugar de residencia registrado en el Registro Único Nacional de Tránsito (RUNT), el cual corresponde a la dirección física de notificaciones aportada al final de este escrito.`,
      ``,
      `TERCERO: Al no haber sido notificado dentro de los tiempos estipulados por la ley, se me cercenó el derecho a la legítima defensa, a contradecir las pruebas, a solicitar audiencia pública y a acceder a los descuentos por pronto pago.`,
      ``,
      `FUNDAMENTOS DE DERECHO`,
      ``,
      `Artículo 29 de la Constitución Política: "El debido proceso se aplicará a toda clase de actuaciones judiciales y administrativas (...)"`,
      ``,
      `Ley 1843 de 2017, Artículo 8: Establece que la validación del comparendo debe hacerse en los diez (10) días hábiles siguientes, y posteriormente, el envío de la orden de comparendo y sus soportes debe realizarse dentro de los tres (3) días hábiles siguientes a través de correo certificado a la última dirección registrada en el RUNT.`,
      ``,
      `La Corte Constitucional en reiterada jurisprudencia ha manifestado que la notificación no es un mero formalismo, sino el acto que garantiza el principio de publicidad y el derecho a la defensa. Sin una notificación efectiva, los actos administrativos carecen de validez y no son oponibles al ciudadano.`,
    ];
  },
  facultades: [
    'Declarar la vulneración al debido proceso administrativo por la falta de notificación en los términos de la Ley 1843 de 2017.',
    'Decretar la nulidad de la orden de comparendo electrónico referenciada y de los actos administrativos sancionatorios derivados, procediendo a mi exoneración.',
    'Ordenar la eliminación inmediata del registro de este comparendo en el sistema SIMIT, RUNT y demás bases de datos de deudores morosos.',
    'En caso de respuesta desfavorable, remitir copia íntegra del expediente, incluyendo guía de envío certificada y copia de validación metrológica de la cámara.',
  ],
  indemnidad: [
    'Anexo: Fotocopia de la cédula de ciudadanía.',
    'Anexo: Pantallazo del RUNT donde consta mi dirección de notificación registrada.',
    'Anexo: Impresión del estado de cuenta del SIMIT.',
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
    `Advertencia Interna: Riesgo si la dirección registrada en el RUNT a la fecha de infracción difiere de la dirección declarada por el usuario.`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// NEW 1. CADUCIDAD 1 AÑO
// ═══════════════════════════════════════════════════════════════════
const caducidad1Anio: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN EN INTERÉS PARTICULAR',
  subtitulo: '(Art. 23 C.P. — Solicitud declaratoria de CADUCIDAD Art. 161 Ley 769 de 2002)',
  nombreArchivo: 'Derecho_Peticion_Caducidad',
  seccion1Titulo: 'II. PETICIONES CONCRETAS:',
  seccion2Titulo: 'III. NOTIFICACIONES Y ANEXOS:',
  cuerpo: (d) => {
    return [
      `PRIMERO: El día ${d.fechaHechos || '[FECHA DE LA INFRACCIÓN]'} se impuso orden de comparendo No. ${d.ticketNumber || '[NUMERO DE COMPARENDO]'}${d.licensePlate && d.licensePlate !== 'N/A' ? ` asociado al vehículo de placas ${d.licensePlate}` : ''}.`,
      ``,
      `SEGUNDO: A la fecha de radicación de la presente petición, ha transcurrido más de un (1) año desde la ocurrencia del presunto hecho infractor.`,
      ``,
      `TERCERO: Durante este término de más de un (1) año calendario, esa Secretaría o Dirección de Tránsito NO expidió ni notificó en debida forma la resolución sancionatoria que declare la responsabilidad contravencional, o al menos, la misma no me fue notificada con las exigencias del debido proceso.`,
      ``,
      `FUNDAMENTOS DE DERECHO`,
      ``,
      `Sustento mi solicitud en lo preceptuado en el Artículo 161 de la Ley 769 de 2002 (Código Nacional de Tránsito), el cual establece de manera perentoria:`,
      ``,
      `"Caducidad. La acción o contravención de las normas de tránsito caduca al año (1), contado a partir de la ocurrencia de los hechos que dieron origen a ella. En consecuencia, durante este término se deberá celebrar la audiencia para declarar la contraventora, momento en el cual se interrumpirá la caducidad."`,
      ``,
      `Al no haberse surtido la etapa procesal correspondiente ni emitido acto administrativo sancionatorio dentro del año siguiente a la infracción, el Estado pierde la facultad para sancionar y cobrar.`,
    ];
  },
  facultades: [
    'Declarar formalmente la CADUCIDAD de la acción contravencional respecto a la orden de comparendo referenciada en los hechos.',
    'Ordenar el archivo definitivo del expediente contravencional y la cesación de cualquier procedimiento administrativo o de cobro coactivo.',
    'Ordenar la actualización inmediata y depuración en la plataforma SIMIT y RUNT eliminando cualquier registro o deuda asociada a mi número de cédula.',
  ],
  indemnidad: [
    'Anexo: Fotocopia de la Cédula de Ciudadanía.',
    'Anexo: Impresión del estado de cuenta del SIMIT / RUNT donde consta el comparendo objeto de petición.',
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
    `Advertencia Interna: Riesgo nivel BAJO por posible Resolución Sancionatoria tardía no reflejada en SIMIT.`,
  ],
};

// ═══════════════════════════════════════════════════════════════════
// NEW 2. NULIDAD FALTA IDENTIDAD CONDUCTOR (C-038/2020)
// ═══════════════════════════════════════════════════════════════════
const nulidadFaltaIdentidad: DocumentBlock = {
  titulo: 'DERECHO DE PETICIÓN EN INTERÉS PARTICULAR',
  subtitulo:
    '(Art. 23 C.P. — Exoneración por falta de identidad del conductor Sentencia C-038/2020)',
  nombreArchivo: 'Nulidad_Identidad_C038',
  seccion1Titulo: 'II. PETICIONES CONCRETAS:',
  seccion2Titulo: 'III. NOTIFICACIONES Y ANEXOS:',
  cuerpo: (d) => {
    return [
      `PRIMERO: El día ${d.fechaHechos || '[FECHA DE LA INFRACCIÓN]'} se generó la orden de comparendo electrónico No. ${d.ticketNumber || '[NUMERO DE COMPARENDO]'} por una presunta infracción cometida en el vehículo de placas ${d.licensePlate || '[PLACA DEL VEHÍCULO]'}.`,
      ``,
      `SEGUNDO: Fui vinculado al procedimiento contravencional única y exclusivamente por mi calidad de propietario(a) del vehículo, según consta en el Registro Único Nacional de Tránsito (RUNT).`,
      ``,
      `TERCERO: Las evidencias fotográficas o fílmicas allegadas al expediente se limitan a registrar la placa del automotor, pero son técnica y materialmente insuficientes para individualizar, identificar y probar de manera indubitable mi identidad como conductor en el momento exacto de la presunta infracción.`,
      ``,
      `FUNDAMENTOS DE DERECHO`,
      ``,
      `Mi solicitud se fundamenta en la Sentencia C-038 de 2020 proferida por la Corte Constitucional, la cual declaró inexequible el parágrafo 1 del artículo 8 de la Ley 1843 de 2017.`,
      ``,
      `En dicha providencia, la Alta Corte eliminó la responsabilidad solidaria entre el propietario del vehículo y el conductor, ratificando que el derecho sancionatorio en Colombia se rige por el principio de responsabilidad personal. La Corte fue categórica al establecer que:`,
      ``,
      `Es inconstitucional sancionar al propietario del vehículo sin que la autoridad de tránsito pruebe que él era quien iba conduciendo.`,
      ``,
      `La carga de la prueba recae exclusivamente sobre el Estado (Organismo de Tránsito), quien debe utilizar la tecnología para identificar plenamente al infractor. El propietario no está obligado a autoincriminarse ni a denunciar a quien conducía (Artículo 33 de la Constitución Política).`,
      ``,
      `Al no existir prueba documental, técnica ni testimonial en el expediente que demuestre de manera irrefutable que mi persona se encontraba al volante cometiendo la infracción, sancionarme implicaría una violación directa al debido proceso y a la presunción de inocencia.`,
    ];
  },
  facultades: [
    'Declarar que la Secretaría de Movilidad carece de material probatorio suficiente para determinar mi plena identidad como conductor infractor, conforme a la Sentencia C-038/2020.',
    'En consecuencia, fallar a mi favor, revocando la orden de comparendo electrónico referenciada y exonerándome de toda responsabilidad contravencional y pecuniaria.',
    'Ordenar la eliminación y depuración inmediata del registro de este comparendo en la plataforma del SIMIT, RUNT y cualquier otra base de datos aplicable.',
  ],
  indemnidad: [
    'Anexo: Fotocopia de la cédula de ciudadanía.',
    'Anexo: Impresión del estado de cuenta del SIMIT.',
  ],
  protocolo2213: (d) => [
    `Documento generado mediante plataforma digital Desmulta.`,
    `Referencia del sistema: ${(d.caseId || d.shortId).replace(/CASE/gi, 'EXP')}`,
    `Advertencia Interna: EXCEPCIÓN. Si la multa es por SOAT o Técnico-Mecánica (C35/D02), esta defensa es ineficaz según Sentencia C-321/2022.`,
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
  caducidad_1_anio: caducidad1Anio,
  nulidad_falta_identidad: nulidadFaltaIdentidad,
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  poder_especial: 'Poder Especial de Gestión',
  peticion_general: 'Petición Pruebas Expediente (Exploratoria)',
  prescripcion_directa: 'Prescripción 3 Años (Sin Mandamiento)',
  doble_prescripcion: 'Prescripción Absoluta 6+ Años (Cobro Coactivo)',
  nulidad_notificacion: 'Nulidad Indebida Notificación (Fotomultas Ley 1843)',
  tutela_silencio: 'Acción de Tutela (Silencio / Vulneracion Petición)',
  caducidad_1_anio: 'Caducidad de Acción (1 Año)',
  nulidad_falta_identidad: 'Nulidad Falta de Identidad (Fotomultas C-038)',
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
      razon: 'Más de 3 años + cobro coactivo → prescripción absoluta 6+ años',
    };
  if (masde3 && !coactivo)
    return {
      tipo: 'prescripcion_directa',
      razon: 'Más de 3 años sin mandamiento → prescripción 3 años',
    };
  if (esFotomulta)
    return {
      tipo: 'nulidad_notificacion',
      razon:
        'Fotomulta → nulidad por indebida notificación (Ley 1843) o Falta de Identidad (C-038/2020)',
    };
  if (entre1y3)
    return {
      tipo: 'caducidad_1_anio',
      razon: 'Entre 1 y 3 años → intentar declarar caducidad por falta de resolución',
    };

  return {
    tipo: 'peticion_general',
    razon: 'Caso general → iniciar con petición de pruebas exploratoria',
  };
}
