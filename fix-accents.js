const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'legal', 'document-templates.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
  'ACCION': 'ACCIÓN',
  'accion ': 'acción ',
  'PETICION': 'PETICIÓN',
  'Peticion': 'Petición',
  'peticion ': 'petición ',
  'Secretaria': 'Secretaría',
  'Transito': 'Tránsito',
  'transito': 'tránsito',
  'vehiculo': 'vehículo',
  'vehiculos': 'vehículos',
  'formulo': 'formuló',
  'mas de': 'más de',
  'dias habiles': 'días hábiles',
  'juridicamente': 'jurídicamente',
  'Notificacion': 'Notificación',
  'notificacion': 'notificación',
  'Prescripcion': 'Prescripción',
  'prescripcion': 'prescripción',
  'Resolucion': 'Resolución',
  'resolucion': 'resolución',
  'obligacion': 'obligación',
  'cedula': 'cédula',
  'identificacion': 'identificación',
  'jurisdiccion': 'jurisdicción',
  'especificas': 'específicas',
  'Constitucion': 'Constitución',
  'Politica': 'Política',
  'informacion': 'información',
  'recaudo': 'recaudó',
  'electronico': 'electrónico',
  'olografa': 'ológrafa',
  'autenticacion': 'autenticación',
  'apelacion': 'apelación',
  'suspension': 'suspensión',
  'representacion': 'representación',
  'declaracion': 'declaración',
  'DECLARACION': 'DECLARACIÓN',
  'anos': 'años',
  'ANOS': 'AÑOS',
  'NULIDAD': 'NULIDAD', // No change
  'TUTELA': 'TUTELA', // No change
  'Constitucional': 'Constitucional', // No change
  'jerarquico': 'jerárquico',
  'comunicacion': 'comunicación',
  ' decision': ' decisión',
  'tramite': 'trámite'
};

for (const [key, value] of Object.entries(replacements)) {
  const regex = new RegExp(`\\b${key}\\b`, 'g');
  content = content.replace(regex, value);
}

// Special cases
content = content.replace(/Mas de/g, 'Más de');
content = content.replace(/mas de/g, 'más de');
content = content.replace(/anos/g, 'años');
content = content.replace(/Anos/g, 'Años');
content = content.replace(/ANOS/g, 'AÑOS');
content = content.replace(/olografa/g, 'ológrafa');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Acentos restaurados en document-templates.ts');
