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

---

## 9. Blog Automático de Noticias Legales (RSS/Atom-to-MDX)

Esta herramienta permite captar tráfico orgánico de Google en automático importando novedades legales de tránsito y convirtiéndolas en borradores de blog listos para SEO.

### ¿Cómo funciona el flujo de importación?
1. **Google Alerts:** El sistema lee feeds RSS/Atom de alertas configuradas en tu cuenta de Google (bajo palabras clave de leyes viales de Colombia).
2. **Ejecución diaria en la nube:** GitHub Actions corre a diario de manera automática el script de importación a la **1:00 AM (hora Colombia)**.
3. **Filtro de accidentes y colisiones:** El script tiene un filtro automático (lista negra de palabras) que descarta noticias de accidentes, choques, heridos o muertes cotidianas, asegurando que solo se generen borradores de carácter legal y de tránsito relevante.
4. **Borradores seguros:** Los artículos nuevos se guardan en la carpeta `src/content/blog/` con el campo `draft: true` en el encabezado. **Ningún borrador se publica solo en internet.**
5. **Alerta en Telegram:** El bot te enviará un mensaje al chat de Telegram listando los títulos de los borradores nuevos y un enlace directo a GitHub para su aprobación.

### Paso a Paso para la Aprobación y Publicación Manual:

Si recibes una alerta de Telegram de noticias que deseas publicar, sigue estos sencillos pasos:

1. **Abre el archivo en GitHub:** En el mensaje de Telegram, haz clic en el enlace que dice **"Ver contenido en GitHub"** (también puedes ingresar a tu cuenta de GitHub, ir a tu repositorio `Desmulta` y navegar a la carpeta `src/content/blog/`).
2. **Selecciona la noticia:** Haz clic sobre el archivo `.mdx` correspondiente a la noticia que quieres publicar.
3. **Edita el archivo:** En la esquina superior derecha del archivo en GitHub, haz clic en el icono del **lápiz (Edit this file)** para abrir el editor web.
4. **Publica el artículo:** En las primeras líneas de la cabecera (frontmatter), cambia el estado de borrador:
    * Busca la línea: `draft: true`
   * Reemplázala por: `draft: false`
   * *(Opcional)*: Puedes corregir el título, pulir el texto o agregar tus propias palabras clave directamente en el cuerpo del artículo.
5. **Guarda los cambios (Commit):** Haz clic en el botón verde arriba a la derecha que dice **"Commit changes..."**, escribe una breve nota si lo deseas, y confirma haciendo clic en el botón verde **"Commit changes"**.

**¡Listo!** En unos 60 segundos Vercel detectará el commit, compilará el sitio en segundo plano y la noticia estará publicada y visible para todo el público y motores de búsqueda en `https://desmulta.online/blog`.

### 🚀 Publicación 100% Automática (Opcional - Sin Trabajo Manual)
Si deseas que el sistema publique las noticias de inmediato en tu blog sin tener que abrir ningún archivo para cambiar el estado de borrador, puedes configurar la automatización absoluta:
1. Abre tu archivo de configuración [.env](file:///c:/Workspace/Desmulta/.env).
2. Localiza la variable: `AUTO_PUBLISH_BLOG="false"`
3. Cámbiala a: `AUTO_PUBLISH_BLOG="true"`
4. Guarda el archivo.
*(Asegúrate de agregar también esta variable en los secretos de tu repositorio de GitHub si tienes GitHub Actions activo, o en tu consola de administración de Vercel).*
Al activar esta opción, cada noticia que descargue el bot se publicará de manera inmediata e indexará en el sitemap de forma autónoma.

### 🧹 Limpieza Automática de Basura (Evitar acumulación excesiva)
Para evitar que el blog acumule miles de archivos y llene el repositorio de código de basura a lo largo de los meses, el script incluye un **mecanismo de poda automático**:
1. El script lee únicamente las noticias importadas automáticamente.
2. Mantiene en tu repositorio solamente los artículos más recientes configurados en tu variable `MAX_BLOG_POSTS`.
3. Por defecto, en tu [.env](file:///c:/Workspace/Desmulta/.env) está configurado en `MAX_BLOG_POSTS="30"`.
4. Cada vez que el script se ejecute, si la cantidad de noticias auto-importadas supera las 30, el script **eliminará automáticamente las noticias más viejas**, dejando intactos los artículos que tú hayas redactado a mano o las noticias más recientes. Así, el blog siempre tiene contenido fresco sin sobrecargar el servidor ni requerir limpieza manual.


### Ejecución Manual (Sin esperar a la noche)
Si no deseas esperar a que el proceso corra de manera automática por la noche, puedes forzar la sincronización en cualquier momento desde tu terminal local ejecutando el comando:
```bash
npm run blog:sync
```
El script leerá tus feeds de Google Alerts y enviará las novedades correspondientes de inmediato a tu bot de Telegram.

---

## 10. Galería Visual de Notificaciones (Sandbox)

Esta herramienta oculta está diseñada exclusivamente para que los administradores puedan auditar la estética y los textos de las alertas del sistema (Toasts) en tiempo real, sin afectar la base de datos ni tener que forzar errores reales.

- **Ruta Oculta de Acceso:** `https://desmulta.online/admin/toasts-sandbox` *(Requiere haber iniciado sesión en el administrador)*.
- **Uso:** Al ingresar a esta ruta secreta, encontrarás un panel de control con botones para disparar cada tipo de notificación (Éxito, Error de Validación, Bloqueo de Seguridad por Abuso/Rate Limit, Informativos y Alertas de Acción).
- **Importante:** Esta ruta no tiene ningún enlace o botón en el menú de navegación para evitar que operadores no técnicos o clientes la encuentren por accidente.

---

## 11. Descarga Gratuita de Plantillas (Modo Dios y Contingencias)

El panel administrativo incluye un menú desplegable en la cabecera (marcado con un ícono de descarga y la etiqueta "Modo Dios .DOCX") diseñado para **contingencias de soporte al cliente** (por ejemplo, si un cliente pagó pero perdió su archivo por un problema de internet, o requieres una plantilla base de inmediato).

- **Catálogo Real**: Este menú lista los documentos legales con sus precios reales extraídos directamente de la base de datos de producción.
- **Seguridad (PIN Operacional)**: Al seleccionar un documento, el sistema no lo descargará de inmediato. Por seguridad extrema, levantará una pantalla de `AUTENTICACIÓN REQUERIDA`, donde debes ingresar el PIN del Modo Dios de 4 dígitos.
- **Descarga Fluida (Sin redirecciones)**: Una vez digitas correctamente el PIN, el sistema descarga el archivo `.docx` genérico de manera "silenciosa" en tu navegador y te lo guarda en tus descargas locales, sin abrir pestañas nuevas que rompan la seguridad.
- **Auditoría Inmutable**: Cada vez que se descarga un documento gratuito a través del Modo Dios, el sistema registra obligatoriamente en la colección `audit_logs` de Firebase el correo del administrador, la fecha, la IP, y el tipo de documento generado. Así se mantiene un control absoluto sobre el inventario.
