export type TipoEstrategia = 'PETICION' | 'PRESCRIPCION' | 'TUTELA' | 'DESCONOCIDO';

interface EvaluacionLegal {
  estrategia: TipoEstrategia;
  certeza: 'ALTA' | 'MEDIA' | 'BAJA';
  argumento: string;
}

export function evaluarCasoTransito(
  fechaInfraccion?: string,
  esFotomulta?: boolean,
  tieneCobroCoactivo?: boolean
): EvaluacionLegal {
  if (!fechaInfraccion) {
    return {
      estrategia: 'PETICION',
      certeza: 'BAJA',
      argumento: 'Datos insuficientes. Se sugiere Derecho de Peticion exploratorio.',
    };
  }

  const añosTranscurridos =
    (new Date().getTime() - new Date(fechaInfraccion).getTime()) / (1000 * 60 * 60 * 24 * 365);

  // 1. Regla de Prescripción (Ley 769 de 2002 - Art 159)
  if (añosTranscurridos >= 3 && !tieneCobroCoactivo) {
    return {
      estrategia: 'PRESCRIPCION',
      certeza: 'ALTA',
      argumento:
        'Han transcurrido mas de 3 anos sin notificacion de cobro coactivo. Procede solicitud de prescripcion directa.',
    };
  }

  // 2. Regla de Tutela / Debido Proceso (Fotomultas)
  if (esFotomulta && añosTranscurridos > 1) {
    return {
      estrategia: 'TUTELA',
      certeza: 'MEDIA',
      argumento:
        'Fotomulta con mas de 1 ano. Posible caducidad y violacion al debido proceso por indebida notificacion personal.',
    };
  }

  // Por defecto
  return {
    estrategia: 'PETICION',
    certeza: 'ALTA',
    argumento:
      'Se solicitara revocatoria directa y copia del expediente para analisis de caducidad.',
  };
}
