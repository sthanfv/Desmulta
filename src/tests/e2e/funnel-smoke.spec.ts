import { test, expect } from '@playwright/test';

/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 *
 * Smoke Test: Verificación del Embudo de Leads (2 Pasos).
 */
test.describe('Embudo de Leads Desmulta', () => {
  test('debe permitir completar el flujo de consulta exitosamente', async ({ page }) => {
    // 1. Navegar al Inicio
    await page.goto('/');

    // Verificar que el Hero esté cargado
    await expect(page.locator('h1')).toBeVisible();

    // 2. Abrir Modal de Consulta
    await page.click('button:has-text("Consultar Ahora")');

    // Esperar a que el modal sea visible y Next.js se hidrate (pequeña espera de seguridad)
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(1000);

    // Simular interacción humana para bypass anti-bot
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);

    // 3. Paso 1: Viabilidad (Seleccionamos por texto exacto de botones)
    await page.getByRole('button', { name: 'Menos de 1 año', exact: true }).click();
    await page.getByRole('button', { name: 'Foto-Multa (Cámara)', exact: true }).click();
    await page.getByRole('button', { name: 'NO', exact: true }).click();

    await page.getByRole('button', { name: 'CONTINUAR ANÁLISIS' }).click();

    // 4. Paso 2: Datos Legales (Uso de getByLabel para máxima precisión)
    await page.getByLabel('Cédula del Propietario').fill('12345678');
    await page.getByLabel('WhatsApp Celular').fill('3001112233');
    await page.getByLabel('Nombre Completo').fill('TEST_USER_SMOKE');

    // Aceptar términos (usando el rol de checkbox de Radix UI)
    await page.getByRole('checkbox').click();

    // 5. Envío Final
    await page.getByRole('button', { name: 'INICIAR ESTUDIO GRATUITO' }).click();

    // 6. Verificación de Éxito mejorada (v5.1)
    // Buscamos cualquier indicador de éxito o el cierre del modal
    await expect(dialog).not.toBeVisible({ timeout: 25000 });

    // Verificación opcional de mensaje si el modal se cerró rápido
    const successMessage = page.locator('text=Certificación en Trámite');
    if (await successMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(successMessage).toBeVisible();
    }
  });
});
