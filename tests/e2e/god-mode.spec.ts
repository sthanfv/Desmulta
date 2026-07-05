import { test, expect } from '@playwright/test';

test.describe('God Mode Easter Egg', () => {
  test.beforeEach(async ({ page }) => {
    // Iniciar sesión simulada en el panel admin antes del test
    await page.context().addCookies([
      {
        name: '__session',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Inyectar marca de bypass en el cliente de React para evitar redirecciones
    await page.addInitScript(() => {
      (window as any).__is_mock_admin__ = true;
    });

    await page.route('**/identitytoolkit.googleapis.com/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [{ localId: 'admin123', email: 'admin@desmulta.com' }]
        })
      });
    });

    await page.goto('/admin');
  });

  test('Debe ignorar clics simples o dobles en el escudo', async ({ page }) => {
    const shieldContainer = page.locator('text=Panel Desmulta').locator('..');
    await shieldContainer.waitFor({ state: 'visible' });
    
    // Un clic
    await shieldContainer.click({ clickCount: 1, force: true });
    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/admin/auditoria');

    // Doble clic
    await shieldContainer.click({ clickCount: 2, force: true });
    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/admin/auditoria');
  });

  test('Debe abrir el God Mode con triple clic y autenticar', async ({ page }) => {
    const shieldContainer = page.locator('text=Panel Desmulta').locator('..');
    await shieldContainer.waitFor({ state: 'visible' });
    
    // 1. Ejecutar el Easter Egg (Triple Clic veloz)
    await shieldContainer.dispatchEvent('click', { detail: 3 });

    // 2. Esperar a que se complete la navegación a la página de auditoría
    await page.waitForURL(/\/admin\/auditoria.*/, { timeout: 30000, waitUntil: 'domcontentloaded' });

    // 3. Ingresar la contraseña maestra
    const passwordInput = page.getByPlaceholder('••••••••••••');
    await passwordInput.fill(process.env.TEST_GOD_MODE_PIN || 'testpassword123', { force: true });
    await page.getByRole('button', { name: /Desbloquear Panel/i }).click();

    // 4. Verificar que se renderiza el Audit Log (Tabla)
    const auditTable = page.locator('table');
    await expect(auditTable).toBeVisible({ timeout: 30000 });
  });
});
