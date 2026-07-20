import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Critical Path — Desmulta v7.15.2
 * 
 * Este test verifica que la aplicación cargue correctamente y que los elementos 
 * fundamentales de la interfaz sean accesibles para el ciudadano.
 */

test.describe('Portal Ciudadano - Smoke Tests', () => {
  
  test('debe cargar la página de inicio correctamente', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('desmulta_welcome_time', Date.now().toString());
    });
    await page.goto('/');
    
    // Esperar que la aplicación esté lista
    await page.waitForLoadState('load');
    
    // Verificar que el Hero esté presente (Buscamos texto base del h1)
    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar el banner de bienvenida para usuarios recurrentes', async ({ page }) => {
    // Simulamos un usuario recurrente inyectando el token en LocalStorage
    // También inyectamos welcome_time para que el modal de bienvenida no bloquee el test
    await page.addInitScript(() => {
      window.localStorage.setItem('desmulta_client_token', 'mock-sha256-hash');
      window.localStorage.setItem('desmulta_welcome_time', Date.now().toString());
    });

    await page.goto('/');

    // Esperar que la aplicación esté lista
    await page.waitForLoadState('load');

    // El banner tiene un delay de 1000ms y ahora está embebido en el Hero
    await expect(page.getByText('Bienvenido de nuevo')).toBeVisible({ timeout: 15000 });
    
    // Verificar que el badge de RECONOCIDO esté presente
    await expect(page.getByText('RECONOCIDO')).toBeVisible();
  });

  test('el formulario de consulta debe abrirse al hacer click', async ({ page }) => {
    // 1. Bloquear Welcome Modal inyectando localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('desmulta_welcome_time', Date.now().toString());
    });
    
    await page.goto('/');
    
    // 2. Esperar que la aplicación esté lista
    await page.waitForLoadState('load');
    
    // 3. Hacer clic en el botón de la Hero (búsqueda precisa y forzada)
    const consultButton = page.locator('button', { hasText: /Iniciar estudio sin costo/i }).first();
    await consultButton.waitFor({ state: 'visible' });
    await consultButton.dispatchEvent('click');
    
    // 4. Verificar que el modal se abra buscando su título o el input
    const modalTitle = page.locator('h2', { hasText: 'Estudio de Viabilidad' });
    await expect(modalTitle).toBeVisible({ timeout: 15000 });
  });
});
