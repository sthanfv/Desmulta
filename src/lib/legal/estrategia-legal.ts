export type TipoEstrategia = 'PETICION' | 'PRESCRIPCION' | 'TUTELA' | 'DESCONOCIDO';

interface EvaluacionLegal {
  estrategia: TipoEstrategia;
  certeza: 'ALTA' | 'MEDIA' | 'BAJA';
  argumento: string;
}

import { differenceInYears } from 'date-fns';

export function evaluarCasoTransito(
  fechaInfraccion?: string,
  esFotomulta?: boolean,
  tieneCobroCoactivo?: boolean,
  fechaNotificacion?: string
): EvaluacionLegal {
  if (!fechaInfraccion && !fechaNotificacion) {
    return {
      estrategia: 'PETICION',
      certeza: 'BAJA',
      argumento: 'Datos insuficientes. Se sugiere Derecho de Peticion exploratorio.',
    };
  }

  // La prescripción en Colombia se cuenta desde la notificación del comparendo, no desde la infracción
  if (fechaNotificacion) {
    const añosDesdeNotificacion = differenceInYears(new Date(), new Date(fechaNotificacion));
    if (añosDesdeNotificacion >= 3 && !tieneCobroCoactivo) {
      return {
        estrategia: 'PRESCRIPCION',
        certeza: 'ALTA',
        argumento:
          'Han transcurrido mas de 3 anos desde la notificacion sin cobro coactivo. Procede solicitud de prescripcion directa.',
      };
    }
  } else if (fechaInfraccion) {
    const añosDesdeInfraccion = differenceInYears(new Date(), new Date(fechaInfraccion));
    if (añosDesdeInfraccion >= 3 && !tieneCobroCoactivo) {
      return {
        estrategia: 'PETICION',
        certeza: 'ALTA',
        argumento:
          'Han pasado 3 anos desde la infraccion. Se sugiere Derecho de Peticion para validar la fecha real de notificacion y exigir prescripcion si aplica.',
      };
    }
  }

  const fechaBaseTriage = fechaInfraccion || fechaNotificacion;
  const añosTranscurridos = fechaBaseTriage
    ? differenceInYears(new Date(), new Date(fechaBaseTriage))
    : 0;

  // 2. Regla de Tutela / Debido Proceso (Fotomultas)
  if (esFotomulta && añosTranscurridos >= 1) {
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
