import React, { useEffect, useRef } from 'react';
import { Compass } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TEXTURE_MAP, CONSTRUCTION_SYSTEMS } from '../utils/config';

const TYPE_COLORS: Record<string, string> = {
  'Aislante Térmico': '#facc15',
  'Hoja Principal': '#ef4444',
  'Acabado Interior': '#a78bfa',
  'Barrera de Agua': '#38bdf8',
  'Cubierta': '#f97316',
  'Revestimiento': '#94a3b8',
  'Mortero Técnico': '#64748b',
  'Cámara de Aire': '#67e8f9',
  'Carpintería': '#9ca3af',
};

// Preload all photorealistic textures
const textureCache: Record<string, HTMLImageElement> = {};
const loadTexture = (textureId: string): Promise<HTMLImageElement | null> => {
  if (textureCache[textureId]) return Promise.resolve(textureCache[textureId]);
  const path = TEXTURE_MAP[textureId];
  if (!path || path.endsWith('.svg')) return Promise.resolve(null);
  
  // Determine base path for GitHub Pages
  const base = (import.meta as any).env?.BASE_URL || '/constructopro-v12/';
  const fullPath = path.startsWith('/') ? base.replace(/\/$/, '') + path : path;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { textureCache[textureId] = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = fullPath;
  });
};

export const Viewport2D: React.FC = () => {
  const { layers, selectedId, hoveredId, setHoveredId, activeSystem } = useAppContext();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Preload all current layer textures
    const textureIds = layers.map(l => l.textureId).filter(Boolean) as string[];
    const uniqueIds = [...new Set(textureIds)];
    
    Promise.all(uniqueIds.map(id => loadTexture(id))).then((loaded) => {
      draw();
    });

    const drawHatch = (ctx: CanvasRenderingContext2D, type: string, x: number, y: number, w: number, h: number, color: string, textureId?: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      // Try to use photorealistic texture first
      const texImg = textureId ? textureCache[textureId] : null;
      if (texImg) {
        // Draw photorealistic image as tiled pattern
        const pattern = ctx.createPattern(texImg, 'repeat');
        if (pattern) {
          // v15: Scale based on real-world: texture image = 1m²
          // Calculate pixels-per-mm for the current viewport
          const layerThickPx = Math.max(w, h); // use the larger visible axis
          const scale = Math.min(0.5, Math.max(0.08, (layerThickPx / texImg.width) * 0.25));

          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w / scale, h / scale);
          ctx.restore();
          
          // Subtle edge darkening for depth
          const gradient = ctx.createLinearGradient(x, y, x + w, y);
          gradient.addColorStop(0, 'rgba(0,0,0,0.12)');
          gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, w, h);
        }
      } else {
        // Fallback: procedural hatching
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        if (type === 'brick') {
          const isCaravista = textureId?.includes('caravista');
          const isHueco = textureId?.includes('hueco');
          const isTermo = textureId?.includes('termoarcilla');
          
          if (isTermo) {
            const bH = 12, bW = 28;
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
            for (let dy = y; dy < y + h; dy += bH) { ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + w, dy); ctx.stroke(); }
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            for (let dy = y + 3; dy < y + h; dy += bH) { for (let dx = x + 4; dx < x + w; dx += 8) { ctx.beginPath(); ctx.arc(dx, dy + 3, 2, 0, Math.PI * 2); ctx.fill(); } }
          } else if (isHueco) {
            const bH = 6, bW = 14;
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
            for (let dy = y; dy < y + h; dy += bH) {
              ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + w, dy); ctx.stroke();
              const off = (Math.floor((dy - y) / bH) % 2) === 0 ? 0 : bW / 2;
              for (let dx = x + off; dx < x + w; dx += bW) { ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, Math.min(dy + bH, y + h)); ctx.stroke(); }
            }
          } else if (isCaravista) {
            const bH = 5, bW = 16;
            ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
            for (let dy = y; dy < y + h; dy += bH) {
              ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + w, dy); ctx.stroke();
              const off = (Math.floor((dy - y) / bH) % 2) === 0 ? 0 : bW / 2;
              for (let dx = x + off; dx < x + w; dx += bW) { ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, Math.min(dy + bH, y + h)); ctx.stroke(); }
            }
          } else {
            const bH = 6, bW = 16;
            ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
            for (let dy = y; dy < y + h; dy += bH) {
              ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + w, dy); ctx.stroke();
              const off = (Math.floor((dy - y) / bH) % 2) === 0 ? 0 : bW / 2;
              for (let dx = x + off; dx < x + w; dx += bW) { ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, Math.min(dy + bH, y + h)); ctx.stroke(); }
            }
          }
        } else if (type === 'insulation') {
          for (let pass = 0; pass < 2; pass++) {
            ctx.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            for (let dy = y + 4 + pass * 4; dy < y + h; dy += 8) {
              ctx.beginPath(); ctx.moveTo(x, dy);
              for (let dx = x; dx < x + w; dx += 6) ctx.quadraticCurveTo(dx + 3, dy - 4, dx + 6, dy);
              ctx.stroke();
            }
          }
        } else if (type === 'foam') {
          ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.3;
          for (let i = 0; i < (w * h) / 20; i++) { ctx.beginPath(); ctx.arc(x + Math.random() * w, y + Math.random() * h, 0.3 + Math.random() * 1.2, 0, Math.PI * 2); ctx.stroke(); }
        } else if (type === 'waterproof') {
          ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.7;
          for (let d = -h; d < w + h; d += 4) { ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d - h, y + h); ctx.stroke(); }
        } else if (type === 'plaster') {
          ctx.fillStyle = 'rgba(0,0,0,0.03)';
          for (let i = 0; i < (w * h) / 8; i++) ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 0.5, 0.5);
        } else if (type === 'air') {
          ctx.strokeStyle = 'rgba(100,200,255,0.2)'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]);
          for (let d = -h; d < w + h; d += 8) { ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h, y + h); ctx.stroke(); }
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          for (let i = 0; i < (w * h) / 12; i++) ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 0.8, 0.8);
        }
      }
      ctx.restore();
    };

    const draw = () => {
      const cvs = canvasRef.current;
      const wWrapper = wrapperRef.current;
      if (!cvs || !wWrapper) return;

      const dpr = window.devicePixelRatio || 1;
      cvs.width = wWrapper.clientWidth * dpr;
      cvs.height = wWrapper.clientHeight * dpr;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      const w = wWrapper.clientWidth;
      const h = wWrapper.clientHeight;

      ctx.clearRect(0, 0, w, h);

      // Fine grid
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.03)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let gx = 0; gx <= w; gx += 15) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
      for (let gy = 0; gy <= h; gy += 15) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
      ctx.stroke();

      if (!layers.length) return;

      const legendW = 220;
      const padX = 50, padTop = 40, padBot = 35;
      const usableW = w - padX * 2 - legendW;
      const dH = h - padTop - padBot;
      const tMm = layers.reduce((a, l) => a + Math.max(l.EspesorVirtualMM, 5), 0);
      
      const isHorizontal = CONSTRUCTION_SYSTEMS[activeSystem]?.orientation === 'horizontal';

      if (isHorizontal) {
        const dW = usableW * 0.6;
        const drawX = padX + (usableW - dW) / 2;
        const scH = Math.min(tMm > 0 ? dH / Math.max(tMm, 200) : 1, dH / 80) * 0.45;
        let cy = padTop + (dH - (tMm * scH)) / 2;

        // EXT / SUP
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXT / SUP', drawX + dW / 2, cy - 18);
        ctx.strokeStyle = '#60a5fa40';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(drawX, cy - 8); ctx.lineTo(drawX + dW, cy - 8); ctx.stroke();

        // Dimension Line Left
        ctx.strokeStyle = '#60a5fa';
        ctx.beginPath();
        ctx.moveTo(drawX - 16, cy);
        ctx.lineTo(drawX - 16, cy + (tMm * scH));
        ctx.stroke();
        for (const ay of [cy, cy + (tMm * scH)]) {
          ctx.beginPath(); ctx.moveTo(drawX - 20, ay); ctx.lineTo(drawX - 12, ay); ctx.stroke();
        }
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.save();
        ctx.translate(drawX - 24, cy + (tMm * scH) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${tMm} mm`, 0, 0);
        ctx.restore();

        // Layers
        layers.forEach(l => {
          const rh = Math.max(l.EspesorVirtualMM * scH, 4);
          const isTargeted = hoveredId ? (hoveredId === l.instanceId) : (selectedId ? selectedId === l.instanceId : false);
          const isFaded = (hoveredId || selectedId) && !isTargeted;
          
          ctx.globalAlpha = isFaded ? 0.25 : 1.0;
          drawHatch(ctx, l.textureClass, drawX, cy, dW, rh, l.color, l.textureId);
          
          ctx.strokeStyle = isTargeted ? '#f97316' : 'rgba(15,23,42,0.7)';
          ctx.lineWidth = isTargeted ? 2 : 0.8;
          if (isTargeted) { ctx.shadowColor = 'rgba(249,115,22,0.4)'; ctx.shadowBlur = 6; }
          ctx.strokeRect(drawX, cy, dW, rh);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;

          if (rh > 8) {
            const rawMM = parseInt(l.EspesorRaw) || l.EspesorVirtualMM;
            ctx.fillStyle = isFaded ? 'rgba(148,163,184,0.3)' : '#94a3b8';
            ctx.font = '600 7px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${rawMM}mm`, drawX + dW + 8, cy + rh / 2 + 3);
          }

          cy += rh;
        });

        // INT / INF
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('INT / INF', drawX + dW / 2, cy + 18);
        ctx.strokeStyle = '#a78bfa40';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(drawX, cy + 8); ctx.lineTo(drawX + dW, cy + 8); ctx.stroke();

      } else {

        const sc = Math.min(tMm > 0 ? usableW / Math.max(tMm, 200) : 1, usableW / 80) * 0.5;
        let cx = padX + (usableW - (tMm * sc)) / 2;
        const drawY = padTop;

        // EXT label
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXT', cx - 18, drawY + dH / 2 + 3);
        ctx.strokeStyle = '#60a5fa40';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8, drawY); ctx.lineTo(cx - 8, drawY + dH); ctx.stroke();

        // Total dimension line
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, drawY - 12);
        ctx.lineTo(cx + (tMm * sc), drawY - 12);
        ctx.stroke();
        for (const ax of [cx, cx + tMm * sc]) {
          ctx.beginPath(); ctx.moveTo(ax, drawY - 16); ctx.lineTo(ax, drawY - 8); ctx.stroke();
        }
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${tMm} mm`, cx + (tMm * sc) / 2, drawY - 18);

        // Draw layers
        layers.forEach(l => {
          const rw = Math.max(l.EspesorVirtualMM * sc, 4);
          const isTargeted = hoveredId ? (hoveredId === l.instanceId) : (selectedId ? selectedId === l.instanceId : false);
          const isFaded = (hoveredId || selectedId) && !isTargeted;
          
          ctx.globalAlpha = isFaded ? 0.25 : 1.0;
          drawHatch(ctx, l.textureClass, cx, drawY, rw, dH, l.color, l.textureId);
          
          ctx.strokeStyle = isTargeted ? '#f97316' : 'rgba(15,23,42,0.7)';
          ctx.lineWidth = isTargeted ? 2 : 0.8;
          if (isTargeted) { ctx.shadowColor = 'rgba(249,115,22,0.4)'; ctx.shadowBlur = 6; }
          ctx.strokeRect(cx, drawY, rw, dH);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;

          // Per-layer thickness label
          if (rw > 10) {
            const rawMM = parseInt(l.EspesorRaw) || l.EspesorVirtualMM;
            ctx.fillStyle = isFaded ? 'rgba(148,163,184,0.3)' : '#94a3b8';
            ctx.font = '600 7px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${rawMM}`, cx + rw / 2, drawY + dH + 12);
          }

          // Tick marks
          ctx.strokeStyle = '#60a5fa55';
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(cx, drawY - 14); ctx.lineTo(cx, drawY - 10); ctx.stroke();

          cx += rw;
        });

        // Final tick
        ctx.beginPath(); ctx.moveTo(cx, drawY - 14); ctx.lineTo(cx, drawY - 10); ctx.stroke();

        // INT label
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('INT', cx + 18, drawY + dH / 2 + 3);
        ctx.strokeStyle = '#a78bfa40';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx + 8, drawY); ctx.lineTo(cx + 8, drawY + dH); ctx.stroke();
      }

      // ═══ LEGEND ═══
      const legX = w - legendW - 10;
      const legY = 12;
      const lineH = 18;
      const legH = layers.length * lineH + 46;

      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.strokeStyle = 'rgba(71,85,105,0.4)';
      ctx.lineWidth = 1;
      const rr = 6;
      ctx.beginPath();
      ctx.moveTo(legX + rr, legY);
      ctx.lineTo(legX + legendW - rr, legY);
      ctx.quadraticCurveTo(legX + legendW, legY, legX + legendW, legY + rr);
      ctx.lineTo(legX + legendW, legY + legH - rr);
      ctx.quadraticCurveTo(legX + legendW, legY + legH, legX + legendW - rr, legY + legH);
      ctx.lineTo(legX + rr, legY + legH);
      ctx.quadraticCurveTo(legX, legY + legH, legX, legY + legH - rr);
      ctx.lineTo(legX, legY + rr);
      ctx.quadraticCurveTo(legX, legY, legX + rr, legY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Legend title
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 8px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LEYENDA — SECCIÓN 2D', legX + 8, legY + 13);

      // Column headers
      ctx.fillStyle = '#64748b';
      ctx.font = '600 6.5px "JetBrains Mono", monospace';
      ctx.fillText('CAPA', legX + 22, legY + 26);
      ctx.textAlign = 'right';
      ctx.fillText('ESP', legX + legendW - 55, legY + 26);
      ctx.fillText('λ', legX + legendW - 25, legY + 26);
      ctx.fillText('POS', legX + legendW - 8, legY + 26);
      ctx.textAlign = 'left';

      layers.forEach((l, i) => {
        const ly = legY + 32 + i * lineH;
        
        // If we have a texture image, draw it as the swatch
        const texImg = l.textureId ? textureCache[l.textureId] : null;
        if (texImg) {
          ctx.drawImage(texImg, legX + 8, ly, 8, 10);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(legX + 8, ly, 8, 10);
        } else {
          ctx.fillStyle = l.color;
          ctx.fillRect(legX + 8, ly, 8, 10);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(legX + 8, ly, 8, 10);
        }
        
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 7px "Inter", sans-serif';
        ctx.textAlign = 'left';
        const name = l.Nombre.length > 22 ? l.Nombre.slice(0, 22) + '…' : l.Nombre;
        ctx.fillText(name, legX + 22, ly + 7);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${parseInt(l.EspesorRaw) || l.EspesorVirtualMM}mm`, legX + legendW - 45, ly + 7);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(l.lambda > 0 ? l.lambda.toFixed(2) : '--', legX + legendW - 22, ly + 7);

        ctx.fillStyle = i === 0 ? '#60a5fa' : i === layers.length - 1 ? '#a78bfa' : '#475569';
        ctx.font = 'bold 6px "Inter", sans-serif';
        ctx.fillText(i === 0 ? 'EXT' : i === layers.length - 1 ? 'INT' : `${i + 1}`, legX + legendW - 8, ly + 7);
        ctx.textAlign = 'left';
      });
    };

    draw();
    const resizeObserver = new ResizeObserver(() => draw());
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current);
    return () => { resizeObserver.disconnect(); };
  }, [layers, selectedId, hoveredId, activeSystem]);

  return (
    <div className="h-[50%] border-b border-slate-700/50 relative flex flex-col shadow-inner" style={{ background: 'radial-gradient(circle at center, #1a2332 0%, #0c1220 100%)' }}>
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 pointer-events-none">
        <span className="bg-blue-500/10 text-blue-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-500/20 flex items-center backdrop-blur-sm">
          <Compass className="w-3 h-3 mr-1" /> SECCIÓN 2D
        </span>
      </div>
      <div className="flex-1 w-full h-full relative" ref={wrapperRef}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" id="canvas2D"></canvas>
      </div>
    </div>
  );
};
