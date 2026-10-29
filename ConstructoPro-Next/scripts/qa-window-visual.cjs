async (page) => {
  await page.setViewportSize({width:1600,height:1000});
  const origin = new URL(page.url()).origin;
  const errors=[];
  page.on('pageerror', error=>errors.push(String(error)));
  await page.goto(`${origin}/?demo=fachada-ventilada&v=0.5.0`);
  await page.waitForFunction(()=>/[1-9][\d.]*\s*piezas/.test(document.querySelector('.viewport-status')?.textContent??'')&&!document.querySelector('.geometry-progress'));
  await page.waitForLoadState('networkidle');
  const region=page.getByRole('region',{name:'Sección técnica 2D sincronizada'});
  await page.getByRole('button',{name:'Ampliar dibujo técnico',exact:true}).click();
  const views=[];
  for(const view of ['sill','support','head','fixing','jamb','opening']) {
    await page.getByRole('combobox',{name:'Vista técnica'}).selectOption(view);
    await region.screenshot({path:`output/playwright/window-${view}-2d.png`});
    views.push({view, polygons:await region.locator('polygon').count(),title:await region.locator('header strong').innerText()});
  }
  await region.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:'Árbol de capas',exact:true}).click();
  await page.locator('.tree-select').filter({hasText:'Ventana · montaje completo'}).click();
  await page.getByRole('button',{name:'Encajar escena o selección',exact:true}).click();
  await page.locator('.viewport-canvas').screenshot({path:'output/playwright/window-complete-3d.png'});
  return {views,errors};
}
