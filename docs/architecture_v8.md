# Arquitectura y Estrategia de Pruebas - Desmulta v8

Este documento clarifica las estrategias técnicas adoptadas en la versión 8.x de Desmulta, especialmente en lo referente a la integración continua (CI), el aseguramiento de calidad (QA) y la seguridad de la infraestructura.

## ADR-001 Zero-PII: Política de Encriptación de Datos Sensibles

**Contexto:**
Durante la creación de consultas (`create-consultation`), Desmulta procesa información sensible (PII) de los usuarios, específicamente números de cédula y teléfonos. Almacenar estos datos en texto plano en la base de datos supone un riesgo significativo en caso de fuga de datos. El portal de administración (`admin/page.tsx`) requiere visualizar esta información para su operación manual.

**Decisión:**
Se ha decidido implementar una arquitectura Zero-PII:
1. **Identificación (Búsqueda):** Los datos PII (cédula y contacto) se indexan utilizando un hash unidireccional y determinista basado en HMAC-SHA256 (`hashPII`), empleando una sal de servidor (`PII_HMAC_SECRET`).
2. **Almacenamiento (Persistencia):** El dato original (texto plano) nunca se almacena en las colecciones transaccionales. En su lugar, se cifra usando criptografía simétrica (AES-256-GCM) a través de `encryptSymmetric` antes de ser guardado en Firestore. La clave de cifrado maestro (`SERVER_PII_SECRET`) se mantiene inyectada como variable de entorno solo en el servidor seguro.
3. **Lectura (Operación Admin):** El panel de administración realiza la desencriptación al vuelo (`decryptSymmetric`) utilizando una Server Action. Ningún dato PII desencriptado descansa de forma persistente.

**Consecuencias:**
- La base de datos, en reposo o si es comprometida, solo contiene "basura criptográfica" y firmas inmutables.
- Se ha añadido complejidad al panel de administración y a los reportes exportables, requiriendo descifrado en tiempo de ejecución.
- Garantiza un cumplimiento riguroso de las leyes de privacidad de datos (Ley 1581 de Colombia).

## 1. Estrategia de Pruebas y el Uso de "Mocks"

En el entorno de desarrollo y pruebas automatizadas de Desmulta, utilizamos una técnica estándar de la industria conocida como **"Mocking"** (Simulación). 

**¿Por qué usamos Mocks y qué significan?**
Un "Mock" **NO** significa que el código de producción sea falso o inseguro. Al contrario, un Mock es una pieza de código controlada que se usa **exclusivamente durante la ejecución de los tests** (ej. `npm run test`) para simular el comportamiento de servicios de terceros (como Vercel Blob o Firebase).

*   **Ahorro de Costos y Quota:** Si no usáramos Mocks en los tests de integración de la galería, cada vez que ejecutáramos la suite de pruebas estaríamos subiendo imágenes basura ("test.webp") al almacenamiento real de Vercel Blob, consumiendo ancho de banda y gigabytes de almacenamiento que cuestan dinero real.
*   **Velocidad y Aislamiento:** Los tests deben ejecutarse en milisegundos. Al simular Vercel Blob, probamos que **nuestra lógica de negocio** (Validaciones, conexión a base de datos, purgado de caché ISR) funciona de manera impecable, sin depender de la latencia de internet.
*   **Protección de Producción:** Al simular estos servicios, nos aseguramos de que un test automatizado jamás borre o altere un "Caso de Éxito" real en la base de datos de producción durante una validación de rutina.

**En resumen:** Todo el código en `src/app/...` es **100% real y productivo**. Los Mocks solo existen en la carpeta `tests/` para proteger la infraestructura durante las validaciones de calidad.

## 2. Políticas de Ejecución de Scripts (ExecutionPolicy Bypass)

Durante el desarrollo en entornos Windows, es posible encontrarse con errores al ejecutar comandos como `npm run test` acompañados del mensaje: *"...la ejecución de scripts está deshabilitada en este sistema"*.

*   **¿Qué es?** Es una política de restricción local del sistema operativo Windows (PowerShell) diseñada para evitar que un usuario haga doble clic accidentalmente en un script malicioso en su computadora personal.
*   **¿Es un riesgo de seguridad para la plataforma?** **Absolutamente NO.** Esta restricción solo aplica a la máquina de desarrollo local. No tiene ninguna relación con los servidores de producción de Vercel, la seguridad del código fuente en Next.js, ni la base de datos de Firebase.
*   **¿Por qué usamos "Bypass"?** Utilizar el flag `-ExecutionPolicy Bypass` simplemente le dice a Windows: "Confío en este script de Node.js (npm), permítele ejecutarse en esta terminal temporalmente". Es una práctica estándar para desarrolladores en Windows que no desean alterar las políticas globales de seguridad de su máquina personal.

## 3. Motor de Marca de Agua (Watermarking)

El procesamiento de imágenes para añadir la marca de agua ("© Desmulta") ocurre **antes** de subir el archivo a Vercel Blob. 
*   Se utiliza la librería `sharp`, la cual es un estándar de alto rendimiento en Node.js que opera mediante binarios precompilados, ideal para entornos Serverless como Vercel Functions.
*   Esta arquitectura garantiza que es matemáticamente imposible que un atacante o usuario intercepte la imagen original (sin marca de agua) a través de la URL pública del Blob.
