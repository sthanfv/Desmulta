import { test, expect } from '@playwright/test';

test('flujo completo de consulta', async ({ page }) => {
  // Navega a la ruta principal
  await page.goto('/');

  // Interactuar con el Wizard
  // 1. Antiguedad
  await page.getByRole('button', { name: /MÁS DE 3 AÑOS/i }).click();

  // 2. Tipo de Captura
  await page.getByRole('button', { name: 'Foto-Multa (Cámara)' }).click();

  // 3. Coactivo
  await page.getByRole('button', { name: 'NO' }).click();

  // Paso Final - Rellenar el formulario de usuario ciego
  await page.getByLabel('Cédula').fill('1234567890');
  await page.getByLabel('Placa').fill('AAA123');
  await page.getByLabel('Nombre').fill('Test Usuario');
  await page.getByLabel('WhatsApp/Celular').fill('3001234567');

  // Aceptar términos y condiciones
  // Ojo: checkbox puede ser role="checkbox"
  await page.getByRole('checkbox').check();

  // Botón Submit
  await page.getByRole('button', { name: /CONSOLIDA EXPEDIENTE/i }).click();

  // Verificar que el CASO fue generado y mostrado en la interfaz
  // O redirección / seguir (Dependiendo de la UI, usaremos el texto "CASO-") o Certificación
  await expect(page.getByText(/Certificación en Trámite/i)).toBeVisible({ timeout: 15000 });
});
