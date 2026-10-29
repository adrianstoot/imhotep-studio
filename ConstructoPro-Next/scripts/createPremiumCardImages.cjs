const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('canvas');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'catalog');

const cards = [
  ['31-holcim-hormigon-c30', 'FÁBRICA', 'SOPORTES DE HORMIGÓN', 'HOLCIM ESPAÑA', 'Hormigón estructural · C30/37 · 250 mm', '1000 × 1000 × 250 mm', '—', '—', '—', 'JUNTA 5 mm'],
  ['32-xella-ytong-25', 'FÁBRICA', 'BLOQUES CELULARES', 'XELLA YTONG', 'Bloque de hormigón celular · 25 cm', '625 × 250 × 250 mm', 'λ 0,12 W/mK', 'ρ 500 kg/m³', 'FUEGO A1', 'JUNTA 3 mm'],
  ['33-rockwool-ventirock-120', 'AISLAMIENTO', 'LANA MINERAL', 'ROCKWOOL', 'Ventirock Duo · 120 mm', '1350 × 600 × 120 mm', 'λ 0,034 W/mK', 'ρ 40 kg/m³', 'FUEGO A1', 'JUNTA 2 mm'],
  ['34-isover-arena-100', 'AISLAMIENTO', 'LANA DE VIDRIO', 'ISOVER', 'Arena · 100 mm', '1350 × 600 × 100 mm', 'λ 0,036 W/mK', 'ρ 18 kg/m³', 'FUEGO A1', 'JUNTA 2 mm'],
  ['35-danosa-danopol-hs15', 'PROTECCIÓN', 'MEMBRANAS SINTÉTICAS', 'DANOSA', 'DANOPOL · HS 1,5', '20000 × 1800 × 1,5 mm', 'μ 47000', 'ρ 1266 kg/m³', 'FUEGO E', 'SOLAPE 80 mm'],
  ['36-soprema-sopralene-elite', 'PROTECCIÓN', 'LÁMINAS BITUMINOSAS', 'SOPREMA', 'Sopralene · Elite FP 4', '10000 × 1000 × 4 mm', '—', '—', 'FUEGO E', 'SOLAPE 100 mm'],
  ['37-sika-sarnafil-tg66', 'PROTECCIÓN', 'MEMBRANAS SINTÉTICAS', 'SIKA', 'Sarnafil · TG 66-15', '20000 × 2000 × 1,5 mm', 'μ 18000', 'ρ 1250 kg/m³', 'FUEGO E', 'SOLAPE 80 mm'],
  ['38-dupont-tyvek-uv-facade', 'PROTECCIÓN', 'MEMBRANAS TRANSPIRABLES', 'DUPONT', 'Tyvek · UV Facade', '50000 × 1500 × 0,4 mm', 'μ —', 'ρ —', 'FUEGO —', 'SOLAPE 100 mm'],
  ['39-mapei-keraflex-maxi', 'PROTECCIÓN', 'ADHESIVOS CEMENTOSOS', 'MAPEI', 'Keraflex · Maxi S1 · 5 mm', '1000 × 1000 × 5 mm', 'λ —', 'ρ —', 'FUEGO —', 'JUNTA 5 mm'],
  ['40-sika-sikaflex-construction', 'PROTECCIÓN', 'SELLANTES', 'SIKA', 'Sikaflex · Construction+', '600 × 15 × 15 mm', '—', 'ρ —', 'FUEGO —', 'CORTE LINEAL'],
  ['41-tempio-fk-l', 'REVESTIMIENTO', 'PANELES CERÁMICOS', 'TEMPIO', 'Panel cerámico TEMPIO · FK-L 2/16', '1200 × 300 × 16 mm', '—', 'ρ —', 'FUEGO A1', 'JUNTA 8 mm'],
  ['42-ulma-stoneo-pure', 'REVESTIMIENTO', 'PANELES MINERALES', 'ULMA ARCHITECTURAL', 'ULMA Stoneo · Pure 14 mm', '1800 × 900 × 14 mm', '—', 'ρ —', 'FUEGO A2', 'JUNTA 10 mm'],
  ['43-fischer-bwm-atk140', 'SUBESTRUCTURA', 'MÉNSULAS', 'FISCHER', 'fischer BWM · ATK 140', '140 × 160 × 80 mm', '—', 'ρ —', 'FUEGO —', 'UNIDAD 3D'],
  ['44-sfs-nvelope-nv1t', 'SUBESTRUCTURA', 'PERFILES', 'SFS', 'SFS Nvelope · NV1 T · 3 m', '60 × 3000 × 50 mm', '—', 'ρ —', 'FUEGO —', 'CORTE DE STOCK'],
  ['45-kommerling-premidoor', 'HUECOS', 'VENTANAS CORREDERAS', 'KÖMMERLING', 'Ventana KÖMMERLING · PremiDoor 76 · 2400×2200', '2400 × 2200 × 179 mm', 'λ —', 'ρ —', 'FUEGO E', 'HUECO REAL'],
  ['46-technal-tigal', 'HUECOS', 'VENTANAS ALUMINIO', 'TECHNAL', 'Ventana TECHNAL · TIGAL · 1800×1400', '1800 × 1400 × 70 mm', 'λ —', 'ρ —', 'FUEGO A1', 'HUECO REAL'],
  ['47-persax-energy220', 'HUECOS', 'PERSIANAS Y CAJONES', 'PERSAX', 'Cajón de persiana · Energy 220', '220 × 1000 × 220 mm', 'λ —', 'ρ —', 'FUEGO E', 'UNIDAD LINEAL'],
  ['48-tejasborja-technica10', 'CUBIERTA', 'TEJAS CERÁMICAS', 'TEJAS BORJA', 'TECHNICA-10 · Graphite', '262 × 475 × 45 mm', '—', 'ρ —', 'FUEGO A1', 'SOLAPE 75 mm'],
  ['49-cupa-pizarra-cupa18', 'CUBIERTA', 'PIZARRA NATURAL', 'CUPA PIZARRAS', 'Pizarra CUPA · CUPA 18 · 40×25', '250 × 400 × 5 mm', '—', 'ρ —', 'FUEGO A1', 'SOLAPE 90 mm'],
  ['50-rosa-gres-serena', 'PAVIMENTO', 'PAVIMENTO TÉCNICO', 'ROSA GRES', 'Baldosa técnica Rosa Gres · Serena 60×60', '600 × 600 × 20 mm', 'λ 1 W/mK', 'ρ 2300 kg/m³', 'FUEGO A1', 'JUNTA 4 mm'],
];

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, fontSize, weight = 700) {
  let size = fontSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return size;
}

function drawText(ctx, text, x, y, maxWidth, size, color, weight = 700) {
  const fitted = fitText(ctx, text, maxWidth, size, weight);
  ctx.font = `${weight} ${fitted}px Arial`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

async function makeCard(card) {
  const [slug, family, subtype, maker, name, dimensions, p1, p2, p3, p4] = card;
  const canvas = createCanvas(680, 1024);
  const ctx = canvas.getContext('2d');
  const image = await loadImage(path.join(outDir, `card-${slug}.webp`));
  const accent = '#0e5a82';

  ctx.fillStyle = '#eef6f8';
  ctx.fillRect(0, 0, 680, 1024);
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 18, 18, 644, 988, 18);
  ctx.fill();
  ctx.strokeStyle = '#b9d6df';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = accent;
  roundedRect(ctx, 18, 18, 644, 88, 18);
  ctx.fill();
  ctx.fillRect(18, 70, 644, 36);
  drawText(ctx, `${family} · ${subtype}`, 40, 54, 550, 15, '#eafaff', 700);
  drawText(ctx, 'CONSTRUCTOPRO / FICHA REAL', 40, 85, 550, 10, '#8dd5ed', 700);

  ctx.fillStyle = '#f4f8f9';
  ctx.fillRect(38, 126, 604, 458);
  ctx.strokeStyle = '#d6e4e8';
  ctx.lineWidth = 1;
  ctx.strokeRect(38, 126, 604, 458);
  const scale = Math.min(560 / image.width, 414 / image.height);
  const iw = image.width * scale;
  const ih = image.height * scale;
  ctx.drawImage(image, 340 - iw / 2, 355 - ih / 2, iw, ih);

  drawText(ctx, maker, 42, 622, 590, 15, '#147ca2', 700);
  drawText(ctx, name, 42, 660, 590, 24, '#12344b', 700);
  drawText(ctx, dimensions, 42, 695, 590, 16, '#ba5b24', 700);

  const props = [p1, p2, p3, p4];
  const cells = [42, 192, 342, 492];
  props.forEach((value, index) => {
    ctx.fillStyle = '#f6fafb';
    ctx.fillRect(cells[index], 728, 138, 62);
    ctx.strokeStyle = '#c9dfe7';
    ctx.strokeRect(cells[index], 728, 138, 62);
    drawText(ctx, value.split(' ')[0], cells[index] + 9, 752, 120, 12, '#2180a6', 700);
    drawText(ctx, value.slice(value.indexOf(' ') + 1), cells[index] + 9, 775, 120, 11, '#325469', 700);
  });

  ctx.fillStyle = '#eaf6f9';
  ctx.fillRect(42, 812, 596, 42);
  drawText(ctx, '✓ FUENTE DE EMPRESA / MODELO PROCEDURAL PROPIO', 57, 839, 560, 12, '#19779e', 700);
  ctx.fillStyle = '#0e5a82';
  roundedRect(ctx, 42, 874, 286, 54, 8);
  ctx.fill();
  roundedRect(ctx, 352, 874, 286, 54, 8);
  ctx.fill();
  drawText(ctx, 'VER FICHA TÉCNICA', 74, 907, 220, 12, '#ffffff', 700);
  drawText(ctx, 'AÑADIR AL 3D', 433, 907, 210, 12, '#ffffff', 700);
  drawText(ctx, 'UNIDADES SIN ESTIRAR · MEDIDA COMERCIAL BLOQUEADA', 42, 972, 596, 10, '#7593a0', 700);

  fs.writeFileSync(path.join(outDir, `card-${slug}.webp`), canvas.toBuffer('image/png'));
}

(async () => {
  for (const card of cards) await makeCard(card);
  console.log(`Generated ${cards.length} complete card artworks in ${outDir}`);
})();
