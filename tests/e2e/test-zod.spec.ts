import { test, expect } from '@playwright/test';

test.describe('Escudo SIMIT - Validaciones de Seguridad', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9005/escudo-simit');
  });

  test('Rechaza cédula con longitud inválida', async ({ page }) => {
    await page.fill('input#escudo-cedula', '123'); // Menos de 5
    await page.fill('input#escudo-email', 'usuario@gmail.com');
    await page.click('button:has-text("Activar Monitoreo Gratuito")');
    await expect(page.locator('text=Ingresa un número de cédula válido')).toBeVisible();
    
    await page.fill('input#escudo-cedula', '12345678901'); // Más de 10 (aunque el HTML maxLength es 12, probamos)
    await page.click('button:has-text("Activar Monitoreo Gratuito")');
    await expect(page.locator('text=Ingresa un número de cédula válido')).toBeVisible();
  });

  test('Rechaza correos desechables (yopmail)', async ({ page }) => {
    await page.fill('input#escudo-cedula', '1234567');
    await page.fill('input#escudo-email', 'prueba@yopmail.com');
    await page.click('button:has-text("Activar Monitoreo Gratuito")');
    await expect(page.locator('text=no se permiten correos electrónicos temporales')).toBeVisible();
  });

  test('Rechaza bots si el Honeypot es llenado', async ({ page }) => {
    await page.fill('input#escudo-cedula', '1234567');
    await page.fill('input#escudo-email', 'usuario@gmail.com');
    // Rellenar honeypot forzadamente
    await page.fill('input[name="telefono_secundario"]', 'bot123', { force: true });
    await page.click('button:has-text("Activar Monitoreo Gratuito")');
    await expect(page.locator('text=Solicitud inválida')).toBeVisible();
  });
});
