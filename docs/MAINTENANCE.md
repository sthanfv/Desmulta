# Guía de Mantenimiento y Reinicio de Sistema 🛠️

Este documento describe los procedimientos seguros para el mantenimiento de la base de datos Firestore y el almacenamiento de Vercel Blob, garantizando la integridad de la configuración de **Desmulta**.

## 1. Mantenimiento de Base de Datos (Firestore)

La base de datos se divide en tres categorías críticas. Siga estas instrucciones para evitar la pérdida de configuraciones personalizadas.

### 🟢 Colecciones Seguras para Borrar (Reinicio de Operación)
Si desea "empezar desde cero" con los clientes y procesos, puede borrar estas colecciones desde la consola de Firebase:
- **`consultations`**: Contiene todas las solicitudes iniciales y leads comerciales.
- **`cases`**: Contiene todos los expedientes jurídicos y el historial de casos en curso.

> [!WARNING]
> Borrar estas colecciones eliminará permanentemente la información de los clientes. Asegúrese de tener un respaldo si la información es necesaria para fines legales.

### 🔴 Colecciones Protegidas (NO BORRAR)
- **`site_config`**: Esta colección contiene la identidad de la web (WhatsApp, email de contacto, dirección, y casos de éxito del Hero). Si se borra, la web perderá su personalización administrativa.

---

## 2. Limpieza de Archivos (Vercel Blob)

El almacenamiento de imágenes (capturas SIMIT) debe depurarse periódicamente para optimizar costos y espacio.

- **Método Recomendado**: Utilice el botón **"LIMPIAR CAPTURAS"** en el Panel de Administración. Este botón está programado para identificar y borrar únicamente los archivos temporales de SIMIT sin afectar otros assets de la web.
- **Método Manual**: En el dashboard de Vercel, puede borrar archivos con el prefijo `simit_cap_`.

---

## 3. Procedimiento de Reinicio Total (Start from Scratch)

Si desea dejar el sistema totalmente vacío pero funcional, siga este orden:
1.  **Limpiar Vercel Blob**: Use el botón de limpieza en el Admin para borrar evidencias.
2.  **Borrar `cases`**: En Firebase Console, elimine la colección de casos legales.
3.  **Borrar `consultations`**: En Firebase Console, elimine la colección de solicitudes.
4.  **Verificar `site_config`**: Asegúrese de que esta colección permanezca intacta.

---

## 4. Soporte Técnico
Ante cualquier duda sobre la integridad de los datos, consulte el archivo `MEMORY.md` para verificar los últimos cambios en la estructura de la base de datos.
