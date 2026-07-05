import { test, expect } from '@playwright/test';

test.describe('Flujo E2E - Generador Derecho de Petición', () => {
  test('El usuario debe poder llenar el formulario y el Live Preview debe actualizarse', async ({ page }) => {
    // 1. Visitar la página del generador
    await page.goto('/documentos/generador/peticion-general');

    // 2. Verificar carga correcta de la interfaz
    await expect(page.getByText('Derecho de Peticion', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Tu Nombre Completo')).toBeVisible();

    // 3. Llenar los datos como un usuario real
    await page.fill('input[name="nombre"]', 'Cliente Automatizado E2E');
    await page.fill('input[name="cedula"]', '1234567890');
    await page.fill('input[name="placa"]', 'ZZZ000');
    await page.fill('input[name="celular"]', '3009998877');
    await page.fill('input[name="emailPersonal"]', 'e2e@desmulta.online');
    await page.fill('input[name="ciudad"]', 'Cali');
    await page.fill('input[name="autoridad"]', 'Secretaría de Movilidad Cali');
    await page.fill('input[name="direccion"]', 'Avenida Siempre Viva 742');

    // 4. Asegurarse que el panel derecho (Live Preview del Canvas) refleja la información introducida
    // El nombre y la cédula deben aparecer resaltados
    await expect(page.getByText('Cliente Automatizado E2E', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('1234567890', { exact: false }).first()).toBeVisible();

    // 5. El botón de pagar no debe estar bloqueado y debe ser visible
    const payButton = page.getByRole('button', { name: /Pagar y Descargar/i });
    await expect(payButton).toBeVisible();
    await expect(payButton).toBeEnabled();
  });
});
