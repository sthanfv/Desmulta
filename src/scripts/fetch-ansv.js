const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://fotodeteccion.ansv.gov.co/map/data/sast.json';
const outputFile = path.join(__dirname, '../lib/data/camaras-ansv.json');

https
  .get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const rawData = JSON.parse(data);
        const formattedCamaras = [];

        if (rawData.results && Array.isArray(rawData.results)) {
          rawData.results.forEach((solicitud) => {
            const depto = solicitud.departamento || 'Desconocido';
            const muni = solicitud.municipio || 'Desconocido';
            const autoridad = solicitud.tercero_solicitante || 'Autoridad de Tránsito';

            if (solicitud.ubicaciones && Array.isArray(solicitud.ubicaciones)) {
              solicitud.ubicaciones.forEach((ubi, index) => {
                // Limpiar códigos (C.29 -> C29)
                const infraccionesLimpias = (
                  ubi.lista_infracciones ||
                  solicitud.lista_infracciones ||
                  []
                ).map((code) => code.replace(/\./g, ''));

                // Extraer dirección o coordenadas
                let direccionFinal = ubi.direccion || solicitud.direccion;
                let hasCoords = ubi.latitud && ubi.longitud;

                if (
                  !direccionFinal ||
                  direccionFinal.trim() === '' ||
                  direccionFinal.toLowerCase().includes('sin direcc')
                ) {
                  if (hasCoords) {
                    direccionFinal = 'Punto GPS: ' + ubi.latitud + ', ' + ubi.longitud;
                  } else {
                    direccionFinal = 'Dirección no especificada';
                  }
                }

                formattedCamaras.push({
                  id:
                    ubi.codigo_unico ||
                    solicitud.codigo_solicitud + '-' + index ||
                    Math.random().toString(36).substring(7),
                  municipio: muni,
                  departamento: depto,
                  direccion: direccionFinal,
                  latitud: ubi.latitud || null,
                  longitud: ubi.longitud || null,
                  sentido: ubi.ubicacion_sentido || 'No especificado',
                  tipoInstalacion: ubi.tipo_instalacion || solicitud.tipo_instalacion || 'Fijo',
                  tecnologia: ubi.tipo_tecnologia || solicitud.tipo_tecnologia || 'Desconocido',
                  infracciones: infraccionesLimpias,
                  fechaAutorizacion:
                    ubi.ops_fecha_vencimiento ||
                    ubi.ops_fecha_inicio_operacion ||
                    solicitud.fecha_actualizacion ||
                    'No especificada',
                  autoridadTransito: autoridad,
                });
              });
            }
          });
        }

        fs.writeFileSync(outputFile, JSON.stringify(formattedCamaras, null, 2));
        console.log(
          '✅ Éxito: Extraídas ' +
            formattedCamaras.length +
            ' cámaras. Coordenadas inyectadas para las que no tenían dirección.'
        );
      } catch (e) {
        console.error('Error parseando JSON: ', e.message);
      }
    });
  })
  .on('error', (e) => {
    console.error('Error HTTP: ', e.message);
  });
