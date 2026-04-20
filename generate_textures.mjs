/**
 * Texture Generator — Creates PNG textures for construction materials
 * that still lack proper photorealistic images.
 * Uses raw Canvas API to produce procedural textures.
 */
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const SIZE = 512;

function noise(ctx, w, h, intensity = 0.05) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * intensity;
    d[i]     = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(id, 0, 0);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function shiftColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = v => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

// ═══ 1. Bituminous Asphalt Membrane (lamina_asfaltica) ═══
function generateAsphaltMembrane() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Dark base
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Granular aggregate spots
  for (let i = 0; i < 80000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const s = Math.random() * 2 + 0.3;
    const bright = Math.random() > 0.6;
    ctx.fillStyle = bright ? `rgba(60,60,60,${0.3 + Math.random() * 0.3})` : `rgba(10,10,10,${0.3 + Math.random() * 0.4})`;
    ctx.fillRect(x, y, s, s);
  }
  // Subtle diagonal weave
  ctx.strokeStyle = 'rgba(50,50,50,0.15)';
  ctx.lineWidth = 0.5;
  for (let d = -SIZE; d < SIZE * 2; d += 8) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - SIZE, SIZE); ctx.stroke();
  }
  noise(ctx, SIZE, SIZE, 0.06);
  return cvs;
}

// ═══ 2. Vapor Barrier (PE film) ═══
function generateVaporBarrier() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Translucent silvery base
  ctx.fillStyle = '#8a9aaa';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Plastic film folds/wrinkles
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * SIZE;
    const grad = ctx.createLinearGradient(0, y - 2, 0, y + 2);
    grad.addColorStop(0, `rgba(255,255,255,${0.05 + Math.random() * 0.1})`);
    grad.addColorStop(0.5, `rgba(180,195,210,${0.03})`);
    grad.addColorStop(1, `rgba(100,110,120,${0.05 + Math.random() * 0.08})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, SIZE, 2 + Math.random() * 3);
  }
  // Vertical fold lines
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * SIZE;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 10, SIZE); ctx.stroke();
  }
  // Light reflection spots
  for (let i = 0; i < 40; i++) {
    const gx = Math.random() * SIZE;
    const gy = Math.random() * SIZE;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 20 + Math.random() * 30);
    gr.addColorStop(0, 'rgba(200,210,220,0.08)');
    gr.addColorStop(1, 'rgba(200,210,220,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(gx - 50, gy - 50, 100, 100);
  }
  noise(ctx, SIZE, SIZE, 0.03);
  return cvs;
}

// ═══ 3. Gravel ═══
function generateGravel() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Sandy base
  ctx.fillStyle = '#9e9689';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Draw stones
  const baseColor = '#a8a29e';
  for (let i = 0; i < 600; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const rx = 4 + Math.random() * 12;
    const ry = 3 + Math.random() * 10;
    const angle = Math.random() * Math.PI;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const variation = (Math.random() - 0.5) * 60;
    ctx.fillStyle = shiftColor(baseColor, variation);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // Shadow edge
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Highlight
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
    ctx.beginPath(); ctx.ellipse(-rx * 0.2, -ry * 0.3, rx * 0.4, ry * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  noise(ctx, SIZE, SIZE, 0.04);
  return cvs;
}

// ═══ 4. Green Substrate (vegetal soil) ═══
function generateSubstrate() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Dark earth base
  ctx.fillStyle = '#3d3022';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Soil granules
  for (let i = 0; i < 60000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const s = 0.5 + Math.random() * 2;
    const shade = Math.random();
    if (shade > 0.85) {
      ctx.fillStyle = `rgba(60,90,30,${0.3 + Math.random() * 0.3})`;
    } else if (shade > 0.6) {
      ctx.fillStyle = `rgba(80,60,40,${0.3 + Math.random() * 0.3})`;
    } else {
      ctx.fillStyle = `rgba(50,40,25,${0.2 + Math.random() * 0.3})`;
    }
    ctx.fillRect(x, y, s, s);
  }
  // Small plant roots / organic debris
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    ctx.strokeStyle = `rgba(80,120,40,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.3 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 20, y + Math.random() * 15, x + (Math.random() - 0.5) * 15, y + 10 + Math.random() * 10);
    ctx.stroke();
  }
  noise(ctx, SIZE, SIZE, 0.05);
  return cvs;
}

// ═══ 5. Onduline (corrugated bitumen sheet) ═══
function generateOnduline() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Dark red-brown base
  ctx.fillStyle = '#4a1c1c';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Corrugated wave pattern
  const waveHeight = 12;
  const wavePeriod = 35;
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const wave = Math.sin((x / wavePeriod) * Math.PI * 2);
      const brightness = wave * waveHeight;
      const r = Math.max(0, Math.min(255, 74 + brightness * 2.5));
      const g = Math.max(0, Math.min(255, 28 + brightness * 1));
      const b = Math.max(0, Math.min(255, 28 + brightness * 1));
      ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  noise(ctx, SIZE, SIZE, 0.04);
  return cvs;
}

// ═══ 6. Geotextile fabric ═══
function generateGeotextile() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Light grey-white base
  ctx.fillStyle = '#d4cfc9';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Non-woven fiber pattern
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    ctx.strokeStyle = shiftColor('#c0bab3', (Math.random() - 0.5) * 30);
    ctx.lineWidth = 0.3 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const ex = x + (Math.random() - 0.5) * 30;
    const ey = y + (Math.random() - 0.5) * 30;
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 15, y + (Math.random() - 0.5) * 15, ex, ey);
    ctx.stroke();
  }
  noise(ctx, SIZE, SIZE, 0.03);
  return cvs;
}

// ═══ 7. Bentonite clay ═══
function generateBentonite() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Warm grey-brown
  ctx.fillStyle = '#6b6359';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Clay crackle pattern
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    ctx.strokeStyle = `rgba(40,35,30,${0.15 + Math.random() * 0.15})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x, cy = y;
    for (let s = 0; s < 3 + Math.random() * 4; s++) {
      cx += (Math.random() - 0.5) * 40;
      cy += (Math.random() - 0.5) * 40;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  // Fine granules
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(90,80,70,0.3)` : `rgba(50,45,38,0.3)`;
    ctx.fillRect(x, y, 1, 1);
  }
  noise(ctx, SIZE, SIZE, 0.05);
  return cvs;
}

// ═══ 8. EPDM rubber membrane ═══
function generateEPDM() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Very dark grey-black
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Subtle rubber dimple pattern
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const s = 0.5 + Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(35,32,28,0.4)` : `rgba(20,17,14,0.4)`;
    ctx.fillRect(x, y, s, s);
  }
  // Matte rubber surface — very subtle circular patterns
  for (let i = 0; i < 100; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const r = 2 + Math.random() * 5;
    ctx.strokeStyle = `rgba(40,36,30,${0.1 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  noise(ctx, SIZE, SIZE, 0.03);
  return cvs;
}

// ═══ 9. Weberdry thermoplastic membrane ═══
function generateWeberdry() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Medium grey
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Cross-hatched reinforcement pattern
  ctx.strokeStyle = 'rgba(90,90,100,0.12)';
  ctx.lineWidth = 0.5;
  for (let d = -SIZE; d < SIZE * 2; d += 6) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - SIZE, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + SIZE, SIZE); ctx.stroke();
  }
  // Surface micro-texture
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(70,70,80,0.25)` : `rgba(50,50,55,0.25)`;
    ctx.fillRect(x, y, 1, 1);
  }
  noise(ctx, SIZE, SIZE, 0.04);
  return cvs;
}

// ═══ 10. Danosa membrane ═══
function generateDanosa() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Very dark
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Granular self-protected surface
  for (let i = 0; i < 70000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const s = 0.5 + Math.random() * 2;
    ctx.fillStyle = Math.random() > 0.7 ? `rgba(60,55,50,0.35)` : `rgba(25,22,20,0.35)`;
    ctx.fillRect(x, y, s, s);
  }
  // Mineral aggregate sprinkle
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const r = 0.5 + Math.random() * 1.5;
    ctx.fillStyle = `rgba(80,75,65,${0.2 + Math.random() * 0.2})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  noise(ctx, SIZE, SIZE, 0.04);
  return cvs;
}

// ═══ 11. Aljibe (drainage nodular) ═══
function generateAljibe() {
  const cvs = createCanvas(SIZE, SIZE);
  const ctx = cvs.getContext('2d');
  // Dark blue-black
  ctx.fillStyle = '#1a2540';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Nodular dimple pattern (drainage cups)
  const spacing = 18;
  for (let y = 0; y < SIZE + spacing; y += spacing) {
    const offset = ((y / spacing) % 2) * (spacing / 2);
    for (let x = -spacing; x < SIZE + spacing; x += spacing) {
      const cx = x + offset;
      const cy = y;
      // Cup depression
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spacing * 0.4);
      grad.addColorStop(0, 'rgba(10,15,30,0.7)');
      grad.addColorStop(0.7, 'rgba(25,35,60,0.3)');
      grad.addColorStop(1, 'rgba(25,35,60,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - spacing / 2, cy - spacing / 2, spacing, spacing);
      // Rim highlight
      ctx.strokeStyle = 'rgba(40,55,90,0.25)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, spacing * 0.35, 0, Math.PI * 2); ctx.stroke();
    }
  }
  noise(ctx, SIZE, SIZE, 0.03);
  return cvs;
}

// ═══ Generate all and save ═══
const textures = [
  { fn: generateAsphaltMembrane, name: 'lamina_asfaltica_real.png' },
  { fn: generateVaporBarrier, name: 'barrera_vapor_real.png' },
  { fn: generateGravel, name: 'grava_real.png' },
  { fn: generateSubstrate, name: 'sustrato_vegetal_real.png' },
  { fn: generateOnduline, name: 'onduline_real.png' },
  { fn: generateGeotextile, name: 'geotextil_real.png' },
  { fn: generateBentonite, name: 'bentonita_real.png' },
  { fn: generateEPDM, name: 'epdm_real.png' },
  { fn: generateWeberdry, name: 'weberdry_real.png' },
  { fn: generateDanosa, name: 'danosa_real.png' },
  { fn: generateAljibe, name: 'aljibe_real.png' },
];

const outDir = './public/texturas/';

for (const { fn, name } of textures) {
  console.log(`Generating: ${name}...`);
  const canvas = fn();
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outDir + name, buffer);
  console.log(`  ✅ Saved ${name} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

console.log('\n🎉 All textures generated!');
