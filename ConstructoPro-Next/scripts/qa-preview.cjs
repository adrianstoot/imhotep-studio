async (page) => {
  const origin = new URL(page.url()).origin;
  await page.setViewportSize({width:1600,height:1000});
  await page.goto(`${origin}/?demo=fachada-ventilada`);
  await page.locator('.viewport-canvas canvas').waitFor();
  await page.waitForFunction(() => /[1-9][\d.]*\s*piezas/.test(document.querySelector('.viewport-status')?.textContent ?? '') && !document.querySelector('.geometry-progress'));
  await page.screenshot({path:'output/playwright/restored-white.png'});
  return {
    cardColumns: await page.locator('.premium-product-list').evaluate((element) => getComputedStyle(element).gridTemplateColumns),
    preview: await page.getByRole('region',{name:'Sección técnica 2D sincronizada'}).boundingBox(),
    model: await page.getByRole('region',{name:'Editor tridimensional'}).boundingBox(),
  };
}
