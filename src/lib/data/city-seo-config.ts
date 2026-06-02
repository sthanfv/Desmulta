export interface CitySEOData {
  slug: string;
  name: string;
  transitAuthority: string;
  transitUrl: string;
  population: string;
  tips: string[];
}

export const TOP_CITIES_SEO: CitySEOData[] = [
  {
    slug: 'medellin',
    name: 'Medellín',
    transitAuthority: 'Secretaría de Movilidad de Medellín',
    transitUrl: 'https://www.medellin.gov.co/movilidad/',
    population: '2.5 millones',
    tips: [
      'Revisa constantemente el SIMIT para fotomultas en la Av. Regional.',
      'El cobro coactivo en Medellín prescribe a los 5 años si no hay notificación real.',
    ],
  },
  {
    slug: 'bogota',
    name: 'Bogotá D.C.',
    transitAuthority: 'Secretaría Distrital de Movilidad de Bogotá',
    transitUrl: 'https://www.movilidadbogota.gov.co/',
    population: '7.1 millones',
    tips: [
      'Cuidado con las cámaras de fotodetección en la Av. Boyacá.',
      'En Bogotá, el trámite de impugnación debe hacerse en los primeros 11 días hábiles.',
    ],
  },
  {
    slug: 'cali',
    name: 'Cali',
    transitAuthority: 'Secretaría de Movilidad de Cali',
    transitUrl: 'https://www.cali.gov.co/movilidad/',
    population: '2.2 millones',
    tips: [
      'Las multas por Pico y Placa son las más comunes en el centro de Cali.',
      'Existen amnistías frecuentes en el Valle del Cauca para intereses de mora.',
    ],
  },
  {
    slug: 'barranquilla',
    name: 'Barranquilla',
    transitAuthority: 'Secretaría de Tránsito y Seguridad Vial de Barranquilla',
    transitUrl: 'https://www.barranquilla.gov.co/transito',
    population: '1.2 millones',
    tips: ['El tránsito de Barranquilla es estricto con el SOAT vencido detectado por cámaras.'],
  },
];

export function getCityData(slug: string): CitySEOData | undefined {
  return TOP_CITIES_SEO.find((c) => c.slug === slug.toLowerCase());
}
