import { test, expect } from '@playwright/test';

test.describe('Generador de Documentos (Freemium Builder)', () => {
  test('debe permitir llenar el formulario y redirigir al checkout de Wompi', async ({ page }) => {
    // Inyectar mock del Widget de Wompi para simular el éxito del pago ANTES de navegar
    await page.addInitScript(() => {
      (window as any).WidgetCheckout = class {
        constructor() {}
        open(callback: any) {
          callback({
            transaction: {
              status: 'APPROVED'
            }
          });
        }
      };
    });

    // Interceptar la carga del script del widget de Wompi para evitar que sobrescriba el mock
    await page.route('https://checkout.wompi.co/widget.js', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '// Mocked Wompi Widget Script'
      });
    });

    // 1. Navegar a la página del generador público
    await page.goto('/documentos/generador/peticion-general');

    // 2. Verificar que los elementos visuales cargaron
    await expect(page.getByText(/Derecho de Petición/i).first()).toBeVisible();
    await expect(page.getByText('Yo,', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Pagar y Descargar/i })).toBeVisible();

    // 3. Llenar el formulario
    await page.locator('input[name="nombre"]').fill('Juan Pérez Automático', { force: true });
    await page.locator('input[name="cedula"]').fill('1234567890', { force: true });
    await page.locator('input[name="emailPersonal"]').fill('juan.perez@test.com', { force: true });
    await page.locator('input[name="placa"]').fill('XYZ987', { force: true });
    await page.locator('input[name="celular"]').fill('3001234567', { force: true });
    await page.fill('input[name="ciudad"]', 'Bogotá D.C.', { force: true });
    await page.fill('input[name="autoridad"]', 'Secretaría Distrital de Movilidad', { force: true });
    await page.fill('input[name="direccion"]', 'Calle 123 # 4-56', { force: true });
    
    // 4. Verificar reactividad en la vista previa
    await expect(page.getByText(/Juan P[ée]rez Autom[áa]tico/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/1234567890/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/XYZ987/i).first()).toBeVisible({ timeout: 15000 });

    // 5. Interceptar la llamada a /api/payments/create-order para no crear basura real en base de datos
    await page.route('**/api/payments/create-order', async route => {
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
    await page.getByRole('button', { name: /Pagar y Descargar/i }).click({ force: true });

    // 7. Esperar a que se complete la redirección a la página de confirmación local
    await expect(page).toHaveURL(/\/documentos\/confirmacion.*/, { timeout: 90000 });
  });
});
