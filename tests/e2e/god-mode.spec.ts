import { test, expect } from '@playwright/test';

test.describe('God Mode Easter Egg', () => {
  test.beforeEach(async ({ page }) => {
    // Iniciar sesión simulada en el panel admin antes del test
    // Asumimos que la página base /admin carga el dashboard o maneja la sesión
    await page.goto('/admin');
  });

  test('Debe ignorar clics simples o dobles en el escudo', async ({ page }) => {
    const shieldContainer = page.locator('text=Panel Desmulta').locator('..');
    
    // Un clic
    await shieldContainer.click({ clickCount: 1 });
    await expect(page.getByRole('dialog')).toBeHidden();

    // Doble clic
    await shieldContainer.click({ clickCount: 2 });
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('Debe abrir el God Mode con triple clic y autenticar', async ({ page }) => {
    const shieldContainer = page.locator('text=Panel Desmulta').locator('..');
    
    // 1. Ejecutar el Easter Egg (Triple Clic veloz)
    await shieldContainer.click({ clickCount: 3, delay: 50 }); // 50ms entre clics

    // 2. Verificar que el Modal se abrió
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('God Mode');

    // 3. Ingresar la contraseña maestra
    const passwordInput = page.getByPlaceholder('••••••••••••');
    await passwordInput.fill(process.env.TEST_GOD_MODE_PIN || '');
    await page.getByRole('button', { name: /Desbloquear Panel/i }).click();

    // 4. Verificar que se renderiza el Audit Log (Tabla)
    const auditTable = page.locator('table');
    await expect(auditTable).toBeVisible();
  });
});
