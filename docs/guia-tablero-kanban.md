# Guía de Uso del Tablero Kanban (Para Operadores)

Bienvenido al Tablero Kanban de Gestión de Expedientes. Esta herramienta es el núcleo operativo donde revisamos, procesamos y resolvemos los casos de fotomultas y multas de tránsito. A continuación, se detallan todas las funciones disponibles para tu rol:

## 1. Vista General del Tablero

El tablero está dividido en columnas que representan el ciclo de vida del expediente (por ejemplo: **Por Revisar**, **En Gestión**, **Finalizado**).

- Puedes **arrastrar y soltar** (Drag & Drop) las tarjetas entre columnas para actualizar su estado.
- Las tarjetas muestran una vista ultracompacta con los datos más críticos: Icono del operador asignado, estado de captura, placa del vehículo y nombre del usuario.
- **Acciones Rápidas (Hover)**: Al pasar el cursor sobre una tarjeta, verás iconos rápidos para generar documentos o acceder a enlaces externos sin tener que abrir la tarjeta.

## 2. Apertura del Expediente (Modal de Detalles)

Al hacer clic sobre una tarjeta, se abrirá el **Modal de Detalle de Expediente**. Este panel de alta densidad visual está dividido en dos zonas:

### Columna Izquierda: Información del Ciudadano y Vehículo

- **Identidad del Ciudadano**: Nombre, Cédula y Teléfono de contacto.
- **Vehículo Implicado**: Placa y fecha de ingreso al sistema.
- **Protección de Datos (PII Shield)**: Por seguridad y cumplimiento legal, la cédula, el teléfono y el nombre completo estarán ofuscados inicialmente.
  - Debes hacer clic en **"Revelar Datos Sensibles"** para ver la información.
  - **Atención:** Tienes una cubeta de seguridad limitada (200 revelaciones por hora). ¡Usa las revelaciones de forma responsable!
  - Puedes copiar fácilmente la placa o la cédula haciendo clic en el icono de copiar al lado de cada campo.

### Columna Derecha: Motor Documental y Evidencias

- **Evidencia SIMIT**: Muestra la fotografía o captura de la fotomulta obtenida del sistema SIMIT. Puedes hacer clic en ella para verla a pantalla completa.
- **Motor Documental**: Herramienta de automatización legal.
  - **Poder**: Genera automáticamente el poder de representación legal.
  - **Acción**: Genera derechos de petición o tutelas. Al seleccionarlo, se desplegará un menú para elegir el **Fundamento Jurídico** (la causal de defensa legal).
- Una vez configurados los documentos, podrás editarlos y previsualizarlos en PDF en tiempo real antes de descargarlos o enviarlos.

## 3. Mejores Prácticas Operativas

- **Limpieza Visual**: Una vez termines de gestionar un expediente en la columna "Por Revisar", muévelo inmediatamente a "En Gestión" para no afectar la métrica de asignación (Round-Robin).
- **Seguridad**: No dejes expedientes abiertos (revelados) si te alejas de tu puesto de trabajo.
- **Trazabilidad**: Todo documento generado queda registrado. Si necesitas modificar un PDF, hazlo a través del Motor Documental y no externamente.

_(Nota: Algunas funciones administrativas de supervisión están restringidas y no serán visibles en tu cuenta de operador)_.
