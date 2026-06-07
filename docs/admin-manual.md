# Manual del Administrador - Panel de Gestión Desmulta

Este manual describe todas las funciones disponibles en el panel de administración de Desmulta. El panel está diseñado para gestionar el trabajo desde que entra una solicitud de un interesado hasta que se resuelve su caso legal.

## 1. Acceso y Seguridad

- **Página de Acceso**: Se ingresa a través de la ruta de administración (requiere iniciar sesión).
- **Autenticación**: Solo las personas autorizadas como administradores por el equipo pueden entrar.
- **Cierre de Sesión Automático**: El sistema cerrará la sesión automáticamente después de 30 minutos de inactividad para proteger los datos de los clientes.

## 2. Gestión Operativa (Tablero de Control)

El tablero de control es el corazón del sistema y está dividido en dos grandes flujos: **Prospectos (Personas interesadas)** y **Casos (Gestión Legal)**.

### Flujo de Prospectos (Nuevas Solicitudes)
1. **Nuevas Solicitudes (NUEVO)**: Personas que acaban de registrarse. Meta: contactar en menos de 2 horas.
2. **Contactados (CONTACTADO)**: Ya se inició conversación. Se está esperando que envíen documentos.
3. **En Proceso (ESTUDIO)**: Documentación en revisión por el equipo técnico.
4. **Descartados (DESCARTADO)**: No cumplen los requisitos o no están interesados.

### Flujo de Casos (Gestión de Casos)
1. **Casos Nuevos (APERTURA)**: Caso formalizado. Se están recolectando pruebas y preparando el documento.
2. **Radicados (RADICADO)**: Documento entregado formalmente ante el organismo de tránsito.
3. **En Espera (TRAMITE)**: Esperando respuestas del tránsito dentro de los tiempos de ley.
4. **Finalizados (FINALIZADO)**: Caso solucionado con éxito o cerrado.

### Acciones en el Tablero
- **Mover Tarjetas**: Puedes arrastrar las fichas de los clientes entre columnas para cambiar su estado. Si mueves un Prospecto a una columna de Caso (ej. APERTURA), el sistema lo pasará a la sección de casos automáticamente. **Además, el sistema enviará un correo electrónico automático al cliente informándole sobre el nuevo estado (aplica para: Contactados, En Proceso, Casos Nuevos, Radicados, En Espera y Finalizados).**
- **El Toque Humano (Notas de Operador)**: Al cambiar el estado de un cliente (ya sea arrastrando la tarjeta o desde los detalles), el sistema abrirá automáticamente una ventana llamada "El Toque Humano". Allí podrás escribir un mensaje personalizado (ej: "Hola, acabo de revisar tu caso..."). Este mensaje se guardará en el historial y se enviará al cliente junto con la notificación automática para brindar un trato más cercano y humano.
- **Buscador**: Puedes buscar por Nombre, Placa o Cédula.
- **Exportar Datos (Modo Dios)**: Permite exportar la base de expedientes a PDF o Excel. Requiere un PIN de seguridad (con protección contra múltiples intentos erróneos). *Nota de Seguridad*: Toda acción de exportación queda registrada inmutablemente en el log de auditoría de Firestore y enviará una **Alerta Inmediata a Telegram** informando de la extracción de datos.
- **Refrescar**: Botón para actualizar la información de la pantalla.

### Ventana de Detalles del Cliente
Al hacer clic en una ficha, se abre una ventana con la información completa:
- **Información del Cliente**: Nombre, Cédula, Placa, Ciudad y fecha de registro.
- **Evidencia SIMIT**: Si el usuario subió una captura, se muestra aquí y se puede ampliar.
- **Contactar por WhatsApp**: Abre un enlace directo con un mensaje predeterminado.
- **Configurar Poder de Gestión (Solo en Casos)**: Permite generar los documentos legales (Poder y Petición) en PDF o descargarlos en un ZIP si son varios. Debes seleccionar la causal de tránsito.
- **Promover a Gestión de Caso**: Pasa la solicitud al flujo de casos.

## 3. Estadísticas

Esta pestaña muestra el rendimiento del negocio en tiempo real:
- **Indicadores**: Total de Prospectos, Consultas recibidas, Casos Activos, Porcentaje de éxito y Tiempo promedio de solución.
- **Gráficos**:
  - Crecimiento de consultas a lo largo del tiempo.
  - Tipos de fotomultas o infracciones más comunes.
  - Distribución de los clientes en cada estado.
  - Embudo de proceso (cuántos pasan de interesados a casos reales).

## 4. Referidos VIP (Programa de Recomendados)

Este módulo sirve para llevar el control de las personas que recomiendan el servicio a otros:
- **Lista de Referidos**: Muestra una tabla con:
  - **Quién recomienda (Tu Número)**: El teléfono de la persona que trae al cliente.
  - **Recomendado (Su Número)**: El teléfono del nuevo cliente potencial.
  - **Fecha**: Cuándo se registró.
- **Estados de Gestión**:
  - `Pendiente`: Registro nuevo, aún no se ha contactado.
  - `Contactado`: Ya se le escribió por WhatsApp.
  - `Ganado`: El recomendado contrató el servicio.
  - `Perdido`: No estuvo interesado.
- **Acciones**: Puedes buscar por número de teléfono y cambiar el estado para saber a quiénes ya se atendió.

## 5. Gestión de Galería (Casos de Éxito)

Esta sección permite subir imágenes de "Antes y Después" de las multas resueltas para que se muestren en la página web:
- **Añadir Nuevo Caso**:
  - **Título**: Un nombre descriptivo (ej: "Multa borrada en Cali").
  - **Imagen ANTES (Borde Rojo)**: La captura de pantalla donde se ve la multa activa.
  - **Imagen DESPUÉS (Borde Verde)**: La captura de pantalla donde se ve la multa ya borrada.
- **Publicar**: Al hacer clic en "Publicar", las imágenes se suben y se muestran automáticamente en la galería de la web.
- **Eliminar**: Puedes borrar casos publicados haciendo clic en el botón de la papelera en cada tarjeta.

## 6. Configuración de la Página Web

Permite actualizar la información que ven los clientes sin necesidad de programar:
- **Contador de Resultados**: Cambiar el número y el texto que se muestra en la pantalla principal.
- **Datos de Contacto (Pie de página)**: Actualizar WhatsApp, Correo, Dirección y redes sociales (Facebook, Instagram).

## 7. Mantenimiento

Opciones de limpieza del sistema:
- **Consultas Vencidas**: Elimina registros de más de 7 días para mantener la base de datos limpia.
- **Capturas SIMIT**: Elimina archivos temporales de almacenamiento.

## 8. Integración con Telegram (Resolución de Problemas)

El sistema envía notificaciones de nuevos prospectos (leads) directamente a Telegram mediante un Bot automatizado. 

**IMPORTANTE: El Bot de Telegram NUNCA puede iniciar una conversación por sí solo.** 
Si por accidente eliminas, vacías o bloqueas el chat con el Bot en tu aplicación de Telegram, el sistema de la página web dejará de enviarte las notificaciones y **no se reactivará automáticamente**, incluso si entran nuevas consultas.

### ¿Cómo reactivar las notificaciones si borraste el chat?
1. **Abre Telegram** en tu celular o computador.
2. **Busca tu Bot:** En la barra de búsqueda superior, escribe el nombre o el `@usuario` de tu bot. *(Si no lo recuerdas, busca el chat con **@BotFather**, escribe el comando `/mybots`, selecciona tu bot y haz clic en su enlace).*
3. **Inicia el chat:** Una vez abras la ventana del chat con tu bot, verás un botón en la parte inferior que dice **"Iniciar"** (o "Start"). Haz clic en él.
4. ¡Listo! Al darle a Iniciar, le devuelves el permiso de escritura al Bot y los nuevos leads volverán a llegar de inmediato.
