async (page) => {
  const origin = new URL(page.url()).origin;
  const errors = [], failedAssets = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (response) => { if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`); });
  await page.setViewportSize({width:1600,height:1000});
  await page.goto(`${origin}/?demo=fachada-ventilada&qa=materials`);
  const ready = async () => {
    await page.waitForFunction(() => /[1-9][\d.]*\s*piezas/.test(document.querySelector('.viewport-status')?.textContent ?? '') && !document.querySelector('.geometry-progress'));
    await page.waitForLoadState('networkidle');
  };
  await ready();
  await page.screenshot({path:'output/playwright/material-facade-after.png'});
  await page.locator('.viewport-canvas').screenshot({path:'output/playwright/material-facade-canvas.png'});
  const facadeMetrics = await page.locator('.viewport-status').innerText();
  await page.getByRole('combobox',{name:'Sistema constructivo'}).selectOption('cubierta-inclinada');
  await page.getByRole('button',{name:'Cargar ejemplo',exact:true}).click();
  await ready();
  await page.screenshot({path:'output/playwright/material-roof-after.png'});
  const roofMetrics = await page.locator('.viewport-status').innerText();
  if (errors.length || failedAssets.length) throw new Error(JSON.stringify({errors,failedAssets}));
  return {facadeMetrics,roofMetrics,errors,failedAssets};
}
