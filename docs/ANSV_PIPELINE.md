# Pipeline de Datos de Cámaras (ANSV)

## 1. Justificación Estratégica (Business Value)
La integración de las cámaras de fotodetección autorizadas no es una funcionalidad ornamental; es una herramienta de **adquisición masiva de prospectos (Lead Generation)**.

- **Comercial:** El usuario que busca "cámaras de fotomultas en [Ciudad]" tiene una altísima intención legal (suele buscarlo inmediatamente después de recibir una multa o un destello en la vía). Al ofrecerle el directorio oficial de forma gratuita, canalizamos su pánico hacia el embudo de ventas (`/#escaner`).
- **Educativo / Autoridad:** Transforma datos crudos y poco amigables del gobierno (ANSV) en una interfaz premium. Esto posiciona a Desmulta como una autoridad indiscutible en normatividad de tránsito.
- **Técnico:** Infraestructura a costo cero. Al generar páginas estáticas (SSG), el directorio soporta tráfico viral masivo sin sobrecargar las bases de datos de Firebase.

## 2. Arquitectura del Script de Scraping (`fetch-ansv.js`)

Para no depender de peticiones HTTP en vivo al servidor del gobierno (lo cual causaría bloqueos por DDoS o lentitud), Desmulta utiliza una estrategia de "Data Fetching en Tiempo de Compilación".

- **Ubicación:** `src/scripts/fetch-ansv.js`
- **Output:** `src/lib/data/camaras-ansv.json`

### 2.1. Lógica de Normalización de Datos
El script no solo descarga datos, realiza limpieza profunda (Data Cleansing):
1. **Fallback de Coordenadas:** Si la ANSV no certifica la dirección en texto plano, el script extrae la Latitud y Longitud, anteponiendo la etiqueta `Punto GPS: ` para que la UI pueda renderizar el formato "Coordenada Satelital".
2. **Normalización de Cadenas:** Se capitalizan nombres de municipios y se limpian espacios fantasmas o errores de tipeo del servidor gubernamental.
3. **Mapeo de Severidad:** Identifica infracciones (ej. C14, D2) que luego la interfaz interpreta para asignar colores (Ámbar para C, Rojo para D).

## 3. Seguridad y Privacidad
Este sistema cumple el principio de **Privacidad por Diseño** y **Carga Defensiva**:
- **Cero Inyecciones SQL:** Los datos son 100% estáticos en archivos `.json`. No hay conexión a base de datos.
- **SSG (Static Site Generation):** Los endpoints en `multas/[ciudad]/camaras` no procesan peticiones lógicas. Son entregados instantáneamente por la caché CDN Edge de Vercel.
- **Auditoría de Enlaces:** Las rutas a Google Maps son pre-codificadas (`encodeURIComponent`) bloqueando ataques de manipulación de URL o Cross-Site Scripting (XSS).

## 4. Mantenimiento
Para actualizar la base de datos de cámaras en el futuro, el ingeniero a cargo debe ejecutar:
`node src/scripts/fetch-ansv.js` seguido de un re-despliegue (`npm run build`).