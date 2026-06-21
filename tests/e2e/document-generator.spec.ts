import { test, expect } from '@playwright/test';

test.describe('Generador de Documentos (Freemium Builder)', () => {
  test('debe permitir llenar el formulario y redirigir al checkout de Wompi', async ({ page }) => {
    // 1. Navegar a la página del generador público
    await page.goto('/documentos/generador/peticion-general');

    // 2. Verificar que los elementos visuales cargaron
    await expect(page.getByRole('heading', { name: 'Derecho de Petición' })).toBeVisible();
    await expect(page.getByText('VISTA PREVIA')).toBeVisible();
    await expect(page.getByRole('button', { name: /Pagar y Descargar/i })).toBeVisible();

    // 3. Llenar el formulario
    await page.fill('input[name="nombre"]', 'Juan Pérez Automático');
    await page.fill('input[name="cedula"]', '1234567890');
    await page.fill('input[name="emailPersonal"]', 'test@desmulta.com');
    await page.fill('input[name="placa"]', 'XYZ987');
    await page.fill('input[name="direccion"]', 'Calle 123 # 4-56');
    
    // 4. Verificar reactividad en la vista previa
    await expect(page.getByText('Juan Pérez Automático', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('1234567890', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('XYZ987', { exact: false }).first()).toBeVisible();

    // 5. Interceptar la llamada a /api/payments/create-order para no crear basura real en base de datos
    await page.route('/api/payments/create-order', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      // Validar que los datos del formulario se envíen correctamente en el caseData
      expect(postData.productType).toBe('peticion_general');
      expect(postData.caseData.infractorName).toBe('Juan Pérez Automático');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          wompiReference: 'TEST--REFERENCE',
          amountCop: 2500000,
          publicKey: 'pub_test_123',
          signature: 'hash_signature_dummy',
          redirectUrl: 'http://localhost:9005/documentos/confirmacion'
        })
      });
    });

    // 6. Hacer clic en Pagar
    await page.getByRole('button', { name: /Pagar y Descargar/i }).click();

    // 7. Esperar a que Wompi (o en este caso, la redirección) actúe. 
    // Dado que interceptamos la API, el formulario oculto de Wompi se creará y se enviará hacia checkout.wompi.co
    // Esperamos que la URL cambie hacia wompi
    await page.waitForURL(/^https:\/\/checkout\.wompi\.co\/.*/, { timeout: 10000 });
  });
});
