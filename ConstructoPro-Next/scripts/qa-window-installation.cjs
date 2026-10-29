async (page) => {
  const origin = new URL(page.url()).origin;
  const errors = [], failedRequests = [], views = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
  const ready = async () => {
    await page.locator('.viewport-canvas canvas').waitFor();
    await page.locator('.geometry-progress').waitFor({state:'hidden', timeout:45000});
    await page.waitForFunction(() => /[1-9][\d.]*\s*piezas/.test(document.querySelector('.viewport-status')?.textContent ?? '') && !document.querySelector('.geometry-progress'));
    await page.waitForLoadState('networkidle');
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  await page.setViewportSize({width:1600,height:1000});
  await page.goto(`${origin}/?demo=fachada-ventilada&v=0.5.0&qa=window-installation`);
  await ready();
  const selectWindow = async () => {
    await page.getByRole('button', {name:'Árbol de capas', exact:true}).click();
    await page.locator('.tree-select').filter({hasText:'Ventana · montaje completo sobre premarco'}).click();
    await page.getByRole('button', {name:'Prop.', exact:true}).click();
  };
  await selectWindow();
  const slope = page.getByRole('textbox', {name:'Pendiente del vierteaguas', exact:true});
  await slope.waitFor();
  assert(await slope.inputValue() === '10', 'Pendiente inicial distinta de10');
  const limits = {slopeMax:await slope.getAttribute('max'), facadeMax:await page.getByRole('textbox',{name:'Cara exterior desde el marco',exact:true}).getAttribute('max')};
  await slope.fill('30');
  await slope.press('Tab');
  assert(await slope.inputValue() === '10', 'Se ha aplicado una pendiente que invierte la cuña');
  await page.getByRole('alert').filter({hasText:'La pendiente/retranqueo requiere más altura bajo el marco.'}).waitFor();
  await page.screenshot({path:'output/playwright/window-invalid-slope.png'});
  const facade = page.getByRole('textbox', {name:'Cara exterior desde el marco', exact:true});
  await facade.fill('300'); await facade.press('Tab');
  assert(await facade.inputValue() === '213.9', 'Se ha aplicado un retranqueo sin apoyo suficiente');
  const joint = page.getByRole('textbox', {name:'Holgura de montaje', exact:true});
  await joint.fill('10'); await joint.press('Tab');
  assert(await joint.inputValue() === '20', 'Se ha aplicado una holgura sin altura bajo el marco');
  await slope.fill('11'); await slope.press('Tab');
  await ready();
  assert(await slope.inputValue() === '11', 'No se aplica una pendiente válida');
  assert(await page.getByRole('alert').count() === 0, 'El aviso permanece tras resolver el montaje');
  await page.getByRole('combobox',{name:'Vista técnica',exact:true}).selectOption('sill');
  const region = page.getByRole('region',{name:'Sección técnica 2D sincronizada'});
  assert((await region.locator('svg[data-drawing-scale]').textContent()).includes('11°'), 'El corte2D no se ha regenerado a11°');
  await page.getByRole('button',{name:'Deshacer',exact:true}).click();
  await ready();
  await selectWindow();
  assert(await slope.inputValue() === '10', 'Deshacer no restaura el montaje inicial');
  await page.getByRole('button',{name:'Ampliar dibujo técnico',exact:true}).click();
  const systems = ['fixing','sill','support','head','jamb','opening'];
  for (let pass=1;pass<=2;pass++) for (const view of systems) {
    await page.getByRole('combobox',{name:'Vista técnica',exact:true}).selectOption(view);
    const scroller = region.locator('.section-window__canvas');
    await scroller.evaluate((node) => { node.scrollTop = 0; node.scrollLeft = 0; });
    const drawing = region.locator('svg[data-drawing-scale]');
    const polygons = await drawing.locator('polygon').count();
    assert(polygons > 0, `Vista sin geometría:${view}`);
    const metrics = await drawing.evaluate((svg) => {
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / svg.viewBox.baseVal.width, rect.height / svg.viewBox.baseVal.height);
      const labels = Array.from(svg.querySelectorAll('text'));
      const inverse = svg.getScreenCTM().inverse();
      const outside = labels.filter((node) => {
        const b=node.getBBox(), matrix=inverse.multiply(node.getScreenCTM());
        const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
        return corners.some((p)=>p.x < -1 || p.y < -1 || p.x > svg.viewBox.baseVal.width+1 || p.y > svg.viewBox.baseVal.height+1);
      }).map((node)=>node.textContent);
      return {width:rect.width,height:rect.height,viewBox:svg.getAttribute('viewBox'),legendFontPx:11.5*scale,outsideLabels:outside};
    });
    assert(metrics.legendFontPx >= 11.49, `Leyenda demasiado pequeña:${view}:${metrics.legendFontPx}px`);
    const scrolling = await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return {clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,clientWidth:node.clientWidth,scrollWidth:node.scrollWidth};
    });
    if (scrolling.scrollHeight > scrolling.clientHeight + 1) assert(scrolling.scrollTop > 0, `No se puede recorrer la hoja:${view}`);
    const lastLabel = await drawing.locator('text').last().boundingBox();
    const canvasBox = await scroller.boundingBox();
    assert(lastLabel && lastLabel.y >= canvasBox.y - 1 && lastLabel.y + lastLabel.height <= canvasBox.y + canvasBox.height + 1, `Pie final inaccesible:${view}`);
    views.push({pass,view,polygons,...metrics,scrolling});
    if (pass===2 && scrolling.scrollTop > 0) await region.screenshot({path:`output/playwright/window-detail-${view}-bottom.png`});
    await scroller.evaluate((node) => { node.scrollTop = 0; node.scrollLeft = 0; });
    if (pass===2) await region.screenshot({path:`output/playwright/window-detail-${view}.png`});
  }
  const svgDownload = page.waitForEvent('download');
  await region.getByRole('button',{name:'Descargar SVG a escala',exact:true}).click();
  await (await svgDownload).saveAs('output/playwright/window-installation-elevation.svg');
  await region.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:'Mostrar dibujo técnico',exact:true}).click();
  assert(!(await region.getAttribute('class')).includes('is-expanded'), 'El plano no reabre pequeño');
  assert((await region.boundingBox()).width < 500, 'El plano reabierto supera el ancho pequeño');
  await page.screenshot({path:'output/playwright/window-installation-final.png'});
  if (errors.length || failedRequests.length) throw new Error(JSON.stringify({errors,failedRequests}));
  return {limits,invalidChangesRejected:['slope30','facade300','joint10'],validSlope11:true,undoRestores10:true,views,errors,failedRequests};
}
