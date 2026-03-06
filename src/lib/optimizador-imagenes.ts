/**
 * Motor de compresión de imágenes en el cliente (Browser-side)
 * Ideal para el flujo del SimitCaptureSchema. Reduce imágenes de 5MB a ~200KB.
 */
export async function comprimirCaptura(file: File, maxWidth = 1200, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    // 1. Verificamos que sea una imagen
    if (!file.type.startsWith('image/')) {
      return reject(new Error('El archivo no es una imagen válida'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 2. Redimensionamiento inteligente manteniendo el Aspect Ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Error crítico: Canvas no soportado en este navegador'));

        // Fondo blanco por si la imagen original era un PNG transparente
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Compresión implacable a formato JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Falla en la generación del Blob de imagen'));

            // Reconstruimos el archivo listo para enviar a Firebase/Vercel Blob
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality // 0.7 es el balance perfecto entre peso y legibilidad del texto
        );
      };

      img.onerror = () => reject(new Error('Error al decodificar la imagen'));
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo desde el disco'));
  });
}
