/**
 * Motor de compresión de imágenes en el cliente (Browser-side)
 * Ideal para el flujo del SimitCaptureSchema. Reduce imágenes de 5MB a ~200KB.
 */
export async function comprimirCaptura(file: File, maxWidth = 1200, quality = 0.9): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo no es una imagen válida');
  }

  // 🛡️ FIX D-05: Limitar a 20MB para evitar colapso de RAM en dispositivos gama baja
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('La imagen es demasiado pesada (máx 20MB). Por favor recórtela o elija otra.');
  }

  // 🛡️ FIX CR-1: URL.createObjectURL no consume memoria heap de JS para string Base64
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      // Liberar la referencia tan pronto como empiece la decodificación en memoria nativa
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 🛡️ FIX D-05: Prevenir OOM en Canvas si la imagen es masiva (ej. Panorámicas 8K)
      if (width * height > 24000000) { // ~24 Megapíxeles
        URL.revokeObjectURL(objectUrl);
        return reject(new Error('La resolución de la imagen es excesiva y podría bloquear tu dispositivo.'));
      }

      // Redimensionamiento inteligente manteniendo el Aspect Ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // 🛡️ FIX CR-1: alpha:false reduce el uso de memoria RAM en el buffer del canvas
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        return reject(new Error('Error crítico: Canvas no soportado en este navegador'));
      }

      // Fondo blanco por si la imagen original era un PNG transparente
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Compresión a formato JPEG
      canvas.toBlob(
        (blob) => {
          // 🛡️ FIX CR-1: Limpiar el canvas de forma explícita para liberar la GPU
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            return reject(new Error('Falla en la generación del Blob de imagen'));
          }

          // Reconstruimos el archivo listo para enviar a Firebase/Vercel Blob
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al decodificar la imagen'));
    };
  });
}
