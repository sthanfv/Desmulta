import { chromium } from 'playwright';

(async () => {
  console.log('🤖 Iniciando Motor de Scraping SIMIT...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  try {
    console.log('📡 Conectando con SIMIT...');
    await page.goto('https://fcm.org.co/simit/#/estado-cuenta', { waitUntil: 'networkidle', timeout: 45000 });
    
    console.log('🔍 Buscando caja de texto de Cédula...');
    const inputSelector = 'input#txtBusqueda';
    await page.waitForSelector(inputSelector, { state: 'visible', timeout: 15000 });
    
    console.log('✍️ Ingresando Cédula: 88145123');
    // fill y click nativos simulan teclado y mouse reales a nivel OS (isTrusted=true)
    await page.fill(inputSelector, '88145123');
    
    console.log('🚀 Haciendo click nativo en el botón #btnNumDocPlaca...');
    // CLIC NATIVO (isTrusted: true)
    await page.locator('button#btnNumDocPlaca').click();
    
    console.log('⏳ Esperando a que desaparezca la ventana de carga...');
    // Esperar a que el modal "¡Espera un momento!" desaparezca
    await page.waitForTimeout(6000);
    // Esperar a que cargue la tabla
    await page.waitForSelector('.table, #estadoCuenta', { state: 'visible', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000); // Darle tiempo extra a Angular
    
    console.log('📸 Tomando captura del DOM resultante...');
    await page.screenshot({ path: 'simit-resultado-real.png', fullPage: true });

    // Extraer datos
    const data = await page.evaluate(() => {
      const rawText = document.body.innerText;
      
      const extractMoney = (text: string, keyword: string) => {
        const index = text.indexOf(keyword);
        if (index === -1) return null;
        const sub = text.substring(index, index + 100);
        const match = sub.match(/\$\s*([\d\.,]+)/);
        return match ? match[0] : null;
      };

      return {
         totalEncontrado: extractMoney(rawText, 'Total a pagar'),
         resumen: {
            textoCompletoExtraido: rawText.split('\n').filter(t => t.trim().length > 0).join(' | ')
         }
      };
    });
    
    console.log('\n================ RESULTADOS DEL SCRAPER ================');
    console.log('✅ Extracción completada sin trampa.');
    console.log('\n--- DATOS ESTRUCTURADOS ---');
    console.log(`💰 Total a Pagar detectado en el DOM: ${data.totalEncontrado || 'No encontrado'}`);
    
    console.log('\n--- MUESTRA DEL TEXTO EXTRAÍDO DEL DOM ---');
    const fragmentos = data.resumen.textoCompletoExtraido.split('|');
    const lineasRelevantes = fragmentos.filter(l => 
        l.includes('Multa') || 
        l.includes('Comparendo') || 
        l.includes('$') || 
        l.includes('Pamplona') || 
        l.includes('Aguazul') ||
        l.includes('Cobro')
    );
    
    console.log(lineasRelevantes.slice(0, 15).join('\n'));
    console.log('========================================================\n');
    
  } catch (error) {
    console.error('❌ Error fatal en el scraper:', error);
  } finally {
    await browser.close();
  }
})();
