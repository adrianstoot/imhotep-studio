import * as THREE from 'three';
import { MathEngine } from './mathEngine';
import { REAL_DIMENSIONS } from './config';

/**
 * v15 Texture Synthesizer — Real-scale 1m² textures
 * Each 512px canvas represents exactly 1m² of real material.
 * Materials with known dimensions (bricks, tiles, etc.) are drawn at correct scale.
 */
export class TextureSynthesizer {
  private cache: Map<string, { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture }>;
  private size: number;

  constructor() {
    this.cache = new Map();
    this.size = 512;
  }

  // 1m² = 1000mm, so 1px = 1000/512 ≈ 1.953mm
  private mmToPx(mm: number): number {
    return (mm / 1000) * this.size;
  }

  getPBRMaps(type: string, hexColor: string, textureId?: string) {
    const cacheKey = `${type}_${hexColor}_${textureId || ''}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const cvsC = document.createElement('canvas');
    const cvsH = document.createElement('canvas');
    cvsC.width = cvsH.width = this.size;
    cvsC.height = cvsH.height = this.size;

    const ctxC = cvsC.getContext('2d')!;
    const ctxH = cvsH.getContext('2d')!;

    ctxC.fillStyle = hexColor;
    ctxC.fillRect(0, 0, this.size, this.size);
    ctxH.fillStyle = '#808080';
    ctxH.fillRect(0, 0, this.size, this.size);

    const dims = textureId ? REAL_DIMENSIONS[textureId] : null;

    if (type === 'brick' && dims) {
      this.drawBrickPattern(ctxC, ctxH, hexColor, dims);
    } else if (type === 'brick') {
      this.drawBrickFallback(ctxC, ctxH, hexColor, textureId);
    } else if (type === 'concrete') {
      this.drawConcretePattern(ctxC, ctxH, hexColor, textureId);
    } else if (type === 'plaster') {
      this.drawPlasterPattern(ctxC, ctxH, hexColor, textureId);
    } else if (type === 'insulation') {
      this.drawInsulationPattern(ctxC, ctxH, hexColor, textureId);
    } else if (type === 'foam') {
      this.drawFoamPattern(ctxC, ctxH, hexColor, textureId);
    } else if (type === 'waterproof') {
      this.drawWaterproofPattern(ctxC, ctxH, hexColor);
    } else if (type === 'grava') {
      this.drawGravelPattern(ctxC, ctxH, hexColor);
    }

    // Add subtle noise to all textures for realism
    MathEngine.applyNoise(ctxC, this.size, this.size, 0.02, '', 0.04);

    const map = new THREE.CanvasTexture(cvsC);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;

    const normalMap = new THREE.CanvasTexture(MathEngine.generateNormalMap(cvsH));
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.anisotropy = 8;

    const data = { map, normalMap };
    this.cache.set(cacheKey, data);
    return data;
  }

  private drawBrickPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    dims: { w: number; h: number; jointH: number; jointV: number; stagger: boolean }
  ) {
    const bW = this.mmToPx(dims.w);
    const bH = this.mmToPx(dims.h);
    const jH = this.mmToPx(dims.jointH);
    const jV = this.mmToPx(dims.jointV);

    // Mortar background
    ctxC.fillStyle = '#b0a899';
    ctxC.fillRect(0, 0, this.size, this.size);
    ctxH.fillStyle = '#303030';
    ctxH.fillRect(0, 0, this.size, this.size);

    const totalH = bH + jH;
    const totalW = bW + jV;
    const rows = Math.ceil(this.size / totalH) + 1;
    const cols = Math.ceil(this.size / totalW) + 2;

    for (let r = 0; r < rows; r++) {
      const staggerOff = (dims.stagger && r % 2 === 1) ? totalW / 2 : 0;
      for (let c = -1; c < cols; c++) {
        const x = c * totalW + staggerOff;
        const y = r * totalH;

        // Individual brick color variation
        const variation = (Math.random() - 0.5) * 35;
        ctxC.fillStyle = MathEngine.shiftColor(hexColor, variation);
        ctxC.fillRect(x + jV / 2, y + jH / 2, bW, bH);

        // Brick texture: subtle streaks
        for (let s = 0; s < 3; s++) {
          const sy = y + jH / 2 + Math.random() * bH;
          ctxC.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.04})`;
          ctxC.lineWidth = 0.5 + Math.random();
          ctxC.beginPath();
          ctxC.moveTo(x + jV / 2, sy);
          ctxC.lineTo(x + jV / 2 + bW, sy + (Math.random() - 0.5) * 2);
          ctxC.stroke();
        }

        // Normal map: raised brick
        ctxH.fillStyle = '#e0e0e0';
        ctxH.fillRect(x + jV / 2 + 1, y + jH / 2 + 1, bW - 2, bH - 2);
        // Edges for depth
        ctxH.fillStyle = '#ffffff';
        ctxH.fillRect(x + jV / 2 + 1, y + jH / 2 + 1, bW - 2, 2);
        ctxH.fillStyle = '#b0b0b0';
        ctxH.fillRect(x + jV / 2 + 1, y + jH / 2 + bH - 3, bW - 2, 2);
      }
    }
  }

  private drawBrickFallback(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    textureId?: string
  ) {
    // Use default brick dimensions: standard gero 24x11.5cm
    const dims = { w: 240, h: 115, jointH: 10, jointV: 10, stagger: true };
    this.drawBrickPattern(ctxC, ctxH, hexColor, dims);
  }

  private drawConcretePattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    textureId?: string
  ) {
    ctxC.fillStyle = hexColor;
    ctxC.fillRect(0, 0, this.size, this.size);

    if (textureId === 'piedra-caliza' || textureId === 'madera-clt' || textureId === 'tarima' || textureId === 'composite-alu') {
      const dims = textureId ? REAL_DIMENSIONS[textureId] : null;
      if (dims && (textureId === 'tarima' || textureId === 'madera-clt')) {
        this.drawWoodPattern(ctxC, ctxH, hexColor, dims);
        return;
      }
      if (dims && textureId === 'piedra-caliza') {
        this.drawStonePattern(ctxC, ctxH, hexColor, dims);
        return;
      }
      if (textureId === 'composite-alu') {
        this.drawMetallicPattern(ctxC, ctxH, hexColor);
        return;
      }
    }

    // Standard concrete: fine aggregate texture
    for (let i = 0; i < 40000; i++) {
      const px = Math.random() * this.size;
      const py = Math.random() * this.size;
      const s = Math.random() * 2.5 + 0.3;
      const dark = Math.random() > 0.5;
      ctxC.fillStyle = dark ? `rgba(0,0,0,${0.04 + Math.random() * 0.04})` : `rgba(255,255,255,${0.03 + Math.random() * 0.03})`;
      ctxC.fillRect(px, py, s, s);
      ctxH.fillStyle = dark ? '#3a3a3a' : '#c5c5c5';
      ctxH.fillRect(px, py, s, s);
    }
    // Small pores
    for (let i = 0; i < 200; i++) {
      const px = Math.random() * this.size;
      const py = Math.random() * this.size;
      const r = 0.5 + Math.random() * 1.5;
      ctxC.fillStyle = 'rgba(0,0,0,0.08)';
      ctxC.beginPath(); ctxC.arc(px, py, r, 0, Math.PI * 2); ctxC.fill();
      ctxH.fillStyle = '#404040';
      ctxH.beginPath(); ctxH.arc(px, py, r, 0, Math.PI * 2); ctxH.fill();
    }
  }

  private drawWoodPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string, 
    dims: { w: number; h: number; jointH: number; jointV: number; stagger: boolean }
  ) {
    const plankW = this.mmToPx(dims.w);
    const plankH = this.mmToPx(dims.h);
    const cols = Math.ceil(this.size / plankH) + 1;
    const rows = Math.ceil(this.size / plankW) + 1;

    for (let c = 0; c < cols; c++) {
      const stOff = (dims.stagger && c % 2 === 1) ? plankW * 0.33 : 0;
      for (let r = -1; r < rows; r++) {
        const x = r * plankW + stOff;
        const y = c * plankH;
        ctxC.fillStyle = MathEngine.shiftColor(hexColor, (Math.random() - 0.5) * 25);
        ctxC.fillRect(x, y, plankW - 1, plankH - 1);
        // Wood grain
        for (let g = 0; g < 8; g++) {
          const gy = y + Math.random() * plankH;
          ctxC.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.06})`;
          ctxC.lineWidth = 0.3 + Math.random() * 0.7;
          ctxC.beginPath(); ctxC.moveTo(x, gy); ctxC.lineTo(x + plankW, gy + (Math.random() - 0.5) * 3); ctxC.stroke();
        }
        ctxH.fillStyle = '#c0c0c0';
        ctxH.fillRect(x + 1, y + 1, plankW - 3, plankH - 3);
      }
      // Joint line
      ctxC.strokeStyle = 'rgba(0,0,0,0.15)';
      ctxC.lineWidth = 1;
      ctxC.beginPath(); ctxC.moveTo(0, (c + 1) * plankH); ctxC.lineTo(this.size, (c + 1) * plankH); ctxC.stroke();
    }
  }

  private drawStonePattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    dims: { w: number; h: number; jointH: number; jointV: number; stagger: boolean }
  ) {
    const sW = this.mmToPx(dims.w);
    const sH = this.mmToPx(dims.h);
    const jH = this.mmToPx(dims.jointH);

    ctxC.fillStyle = '#9e9689';
    ctxC.fillRect(0, 0, this.size, this.size);
    ctxH.fillStyle = '#404040';
    ctxH.fillRect(0, 0, this.size, this.size);

    const rows = Math.ceil(this.size / (sH + jH)) + 1;
    const cols = Math.ceil(this.size / (sW + jH)) + 2;

    for (let r = 0; r < rows; r++) {
      const off = (dims.stagger && r % 2 === 1) ? (sW + jH) / 2 : 0;
      for (let c = -1; c < cols; c++) {
        const x = c * (sW + jH) + off;
        const y = r * (sH + jH);
        ctxC.fillStyle = MathEngine.shiftColor(hexColor, (Math.random() - 0.5) * 20);
        ctxC.fillRect(x + jH / 2, y + jH / 2, sW, sH);
        // Veining
        ctxC.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.06})`;
        ctxC.lineWidth = 0.3 + Math.random() * 0.5;
        ctxC.beginPath();
        ctxC.moveTo(x + jH / 2 + Math.random() * sW * 0.3, y + jH / 2 + Math.random() * sH);
        ctxC.quadraticCurveTo(x + sW / 2, y + sH / 2, x + jH / 2 + sW * 0.7 + Math.random() * sW * 0.3, y + jH / 2 + Math.random() * sH);
        ctxC.stroke();
        ctxH.fillStyle = '#d0d0d0';
        ctxH.fillRect(x + jH / 2 + 1, y + jH / 2 + 1, sW - 2, sH - 2);
      }
    }
  }

  private drawMetallicPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string
  ) {
    // Brushed horizontal lines
    for (let y = 0; y < this.size; y++) {
      const brightness = (Math.random() - 0.5) * 15;
      ctxC.fillStyle = MathEngine.shiftColor(hexColor, brightness);
      ctxC.fillRect(0, y, this.size, 1);
      ctxH.fillStyle = `rgb(${128 + brightness}, ${128 + brightness}, ${128 + brightness})`;
      ctxH.fillRect(0, y, this.size, 1);
    }
    // Subtle reflection spots
    for (let i = 0; i < 50; i++) {
      const gx = Math.random() * this.size;
      const gy = Math.random() * this.size;
      const gradient = ctxC.createRadialGradient(gx, gy, 0, gx, gy, 15 + Math.random() * 25);
      gradient.addColorStop(0, 'rgba(255,255,255,0.08)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctxC.fillStyle = gradient;
      ctxC.fillRect(gx - 40, gy - 40, 80, 80);
    }
  }

  private drawPlasterPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    textureId?: string
  ) {
    ctxC.fillStyle = hexColor;
    ctxC.fillRect(0, 0, this.size, this.size);

    if (textureId === 'monocapa-raspado') {
      // Horizontal scratch lines
      for (let y = 0; y < this.size; y += 2 + Math.random() * 3) {
        ctxC.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`;
        ctxC.lineWidth = 0.5 + Math.random();
        ctxC.beginPath(); ctxC.moveTo(0, y); ctxC.lineTo(this.size, y + (Math.random() - 0.5) * 2); ctxC.stroke();
        ctxH.strokeStyle = `rgb(${100 + Math.random() * 30}, ${100 + Math.random() * 30}, ${100 + Math.random() * 30})`;
        ctxH.lineWidth = 0.5 + Math.random();
        ctxH.beginPath(); ctxH.moveTo(0, y); ctxH.lineTo(this.size, y); ctxH.stroke();
      }
    } else {
      // Fine plaster texture
      MathEngine.applyNoise(ctxC, this.size, this.size, 0.04, '', 0.025);
      for (let i = 0; i < 15000; i++) {
        ctxH.fillStyle = Math.random() > 0.5 ? '#838383' : '#7d7d7d';
        ctxH.fillRect(Math.random() * this.size, Math.random() * this.size, 0.8, 0.8);
      }
    }
  }

  private drawInsulationPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    textureId?: string
  ) {
    MathEngine.applyNoise(ctxC, this.size, this.size, 0.15, hexColor, 0.08);
    ctxH.fillStyle = '#353535';
    ctxH.fillRect(0, 0, this.size, this.size);

    if (textureId === 'corcho') {
      // Cork: irregular cells
      for (let i = 0; i < 800; i++) {
        const cx = Math.random() * this.size;
        const cy = Math.random() * this.size;
        const r = 3 + Math.random() * 8;
        ctxC.strokeStyle = MathEngine.shiftColor(hexColor, (Math.random() - 0.5) * 40);
        ctxC.lineWidth = 0.5 + Math.random();
        ctxC.beginPath(); ctxC.arc(cx, cy, r, 0, Math.PI * 2); ctxC.stroke();
        ctxH.strokeStyle = '#707070';
        ctxH.lineWidth = 0.5;
        ctxH.beginPath(); ctxH.arc(cx, cy, r, 0, Math.PI * 2); ctxH.stroke();
      }
    } else {
      // Fibrous pattern (lana roca, lana vidrio, celulosa, lana oveja)
      for (let i = 0; i < 5000; i++) {
        ctxC.strokeStyle = MathEngine.shiftColor(hexColor, (Math.random() - 0.5) * 50);
        ctxH.strokeStyle = Math.random() > 0.4 ? '#e0e0e0' : '#606060';
        ctxC.lineWidth = ctxH.lineWidth = Math.random() * 3 + 0.5;
        const sx = Math.random() * this.size;
        const sy = Math.random() * this.size;
        const cx = sx + (Math.random() - 0.5) * 80;
        const cy = sy + (Math.random() - 0.5) * 80;
        ctxC.beginPath(); ctxC.moveTo(sx, sy); ctxC.quadraticCurveTo(cx, cy, cx + 15, cy + 15); ctxC.stroke();
        ctxH.beginPath(); ctxH.moveTo(sx, sy); ctxH.quadraticCurveTo(cx, cy, cx + 15, cy + 15); ctxH.stroke();
      }
    }
  }

  private drawFoamPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string,
    textureId?: string
  ) {
    // Closed-cell foam (XPS, EPS, PUR, Aerogel)
    const cellSize = textureId === 'aerogel' ? 1.5 : (textureId === 'eps-sate' ? 3 : 2);
    for (let i = 0; i < 35000; i++) {
      const px = Math.random() * this.size;
      const py = Math.random() * this.size;
      const r = Math.random() * cellSize + 0.3;
      ctxC.fillStyle = MathEngine.shiftColor(hexColor, (Math.random() - 0.5) * 18);
      ctxC.beginPath(); ctxC.arc(px, py, r, 0, Math.PI * 2); ctxC.fill();
      ctxH.fillStyle = Math.random() > 0.5 ? '#929292' : '#6e6e6e';
      ctxH.beginPath(); ctxH.arc(px, py, r, 0, Math.PI * 2); ctxH.fill();
    }
  }

  private drawWaterproofPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string
  ) {
    ctxC.fillStyle = hexColor;
    ctxC.fillRect(0, 0, this.size, this.size);
    // Diagonal hatching
    for (let d = -this.size; d < this.size * 2; d += 5) {
      ctxC.strokeStyle = 'rgba(255,255,255,0.12)';
      ctxC.lineWidth = 0.6;
      ctxC.beginPath(); ctxC.moveTo(d, 0); ctxC.lineTo(d - this.size, this.size); ctxC.stroke();
    }
    // Surface texture
    for (let i = 0; i < 50000; i++) {
      ctxH.fillStyle = Math.random() > 0.5 ? '#8a8a8a' : '#767676';
      ctxH.fillRect(Math.random() * this.size, Math.random() * this.size, 1.2, 1.2);
    }
  }

  private drawGravelPattern(
    ctxC: CanvasRenderingContext2D,
    ctxH: CanvasRenderingContext2D,
    hexColor: string
  ) {
    // Gravel: irregular stones ~30-60mm each
    ctxC.fillStyle = '#9e9689';
    ctxC.fillRect(0, 0, this.size, this.size);
    
    const stoneSize = this.mmToPx(40); // ~40mm average stone
    for (let i = 0; i < 600; i++) {
      const cx = Math.random() * this.size;
      const cy = Math.random() * this.size;
      const rx = stoneSize * (0.4 + Math.random() * 0.8);
      const ry = stoneSize * (0.3 + Math.random() * 0.7);
      const angle = Math.random() * Math.PI;
      
      ctxC.save();
      ctxC.translate(cx, cy);
      ctxC.rotate(angle);
      ctxC.fillStyle = MathEngine.shiftColor(hexColor, (Math.random() - 0.5) * 50);
      ctxC.beginPath(); ctxC.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctxC.fill();
      ctxC.strokeStyle = 'rgba(0,0,0,0.15)';
      ctxC.lineWidth = 0.5;
      ctxC.stroke();
      ctxC.restore();
      
      ctxH.save();
      ctxH.translate(cx, cy);
      ctxH.rotate(angle);
      ctxH.fillStyle = '#c0c0c0';
      ctxH.beginPath(); ctxH.ellipse(0, 0, rx - 1, ry - 1, 0, 0, Math.PI * 2); ctxH.fill();
      ctxH.restore();
    }
  }
}

export const PBRGenerator = new TextureSynthesizer();
