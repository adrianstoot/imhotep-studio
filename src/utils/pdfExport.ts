import { AppState } from '../types';
import { CONSTRUCTION_SYSTEMS, calculateCondensacionesDBHE } from './config';

export const exportPDF = (state: AppState, canvas2D: HTMLCanvasElement | null, canvas3D: HTMLCanvasElement | null) => {
  if (state.layers.length === 0) {
    alert("Debe añadir capas al sistema para generar la memoria técnica.");
    return;
  }

  try {
    if ((window as any).__force3DRender) (window as any).__force3DRender();
  } catch (e) { console.warn('Force 3D render failed:', e); }

  const w = window.open('', '_blank');
  if (!w) { alert("Por favor, permita las ventanas emergentes."); return; }

  const i2d = canvas2D ? canvas2D.toDataURL("image/png") : '';
  let i3d = '';
  if (canvas3D) {
    try {
      if ((window as any).__force3DRender) (window as any).__force3DRender();
      i3d = canvas3D.toDataURL("image/png");
    } catch (e) {
      try {
        const container = document.getElementById('canvas3D-container');
        if (container) { const c = container.querySelector('canvas'); if (c) i3d = c.toDataURL("image/png"); }
      } catch {}
    }
  }

  const sys = CONSTRUCTION_SYSTEMS[state.activeSystem];
  const isHorizontal = sys.orientation === 'horizontal';

  let r = 0, mass = 0, pem = 0, co2 = 0;
  state.layers.forEach(l => {
    if (l.lambda > 0) r += (l.EspesorVirtualMM / 1000) / l.lambda;
    mass += (l.EspesorVirtualMM / 1000) * l.density;
    pem += l.PrecioNum;
    if (l.co2PerKg) co2 += l.co2PerKg * ((l.EspesorVirtualMM / 1000) * l.density);
  });
  
  const u = state.layers.length > 0 ? 1 / (0.17 + r) : 0;
  const rTotal = 0.17 + r;
  const gg = pem * 0.13;
  const bi = pem * 0.06;
  const pec = pem + gg + bi;
  const iva = pec * 0.21;
  const budgetTotal = (pec + iva) * state.area;
  const totalMM = state.layers.reduce((a, l) => a + (parseInt(l.EspesorRaw) || l.EspesorVirtualMM), 0);
  const date = new Date().toLocaleDateString('es-ES');
  const docId = `DOC-V15-${Math.random().toString(36).substring(2,8).toUpperCase()}`;

  const cumpleCTE = u <= 0.4 && state.layers.some(l => l.type === 'Barrera de Agua' || l.type === 'Revestimiento') && state.layers.some(l => l.type === 'Hoja Principal');
  const normScore = state.normativeScore || 0;

  const getLabel = () => {
    if (u <= 0.15) return { l: 'A', c: '#16a34a', bg: '#f0fdf4' };
    if (u <= 0.25) return { l: 'B', c: '#22c55e', bg: '#f0fdf4' };
    if (u <= 0.35) return { l: 'C', c: '#84cc16', bg: '#f7fee7' };
    if (u <= 0.50) return { l: 'D', c: '#eab308', bg: '#fefce8' };
    if (u <= 0.70) return { l: 'E', c: '#f97316', bg: '#fff7ed' };
    if (u <= 1.00) return { l: 'F', c: '#ef4444', bg: '#fef2f2' };
    return { l: 'G', c: '#dc2626', bg: '#fef2f2' };
  };
  const energyLabel = getLabel();

  // Generate Glaser data
  const glaserLayers = state.layers.map(l => ({
    name: l.Nombre, thicknessMM: parseInt(l.EspesorRaw) || l.EspesorVirtualMM, lambda: l.lambda, mu: l.mu || 10
  }));
  const glaserPoints = calculateCondensacionesDBHE(glaserLayers);
  const hasCondensation = glaserPoints.some(p => p.condensation);

  // Build Glaser SVG chart
  const glaserSVG = buildGlaserSVG(glaserPoints, totalMM);

  // Layer table
  let tableRows = '';
  state.layers.forEach((l, i) => {
    const lR = l.lambda > 0 ? ((l.EspesorVirtualMM / 1000) / l.lambda) : 0;
    const bgClass = i % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    const label = isHorizontal ? (i === 0 ? 'SUP' : (i === state.layers.length - 1 ? 'INF' : String(i + 1))) : (i === 0 ? 'EXT' : (i === state.layers.length - 1 ? 'INT' : String(i + 1)));
    const lCO2 = l.co2PerKg ? (l.co2PerKg * ((l.EspesorVirtualMM / 1000) * l.density)).toFixed(2) : '--';
    
    tableRows += `
    <tr class="${bgClass} border-b border-slate-100/50">
      <td class="px-2 py-2.5 text-center"><span class="inline-block w-6 h-6 rounded leading-6 text-center text-[9px] font-black ${i === 0 ? 'bg-blue-100 text-blue-700' : i === state.layers.length - 1 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">${label}</span></td>
      <td class="px-2 py-2.5"><div class="flex items-center gap-2"><div class="w-5 h-5 rounded border border-slate-200 flex-shrink-0" style="background-color:${l.color}"></div><div><div class="font-bold text-slate-800 text-[10px]">${l.Nombre}</div><div class="text-[8px] text-slate-400">${l.type} · ${l.Empresa}</div></div></div></td>
      <td class="px-2 py-2.5 text-center font-mono text-[10px] text-slate-700 font-semibold">${parseInt(l.EspesorRaw) || l.EspesorVirtualMM}</td>
      <td class="px-2 py-2.5 text-center font-mono text-[10px] text-slate-600">${l.lambda > 0 ? l.lambda.toFixed(3) : '--'}</td>
      <td class="px-2 py-2.5 text-center font-mono text-[10px] text-slate-600">${l.density}</td>
      <td class="px-2 py-2.5 text-center font-mono text-[10px] text-slate-600">${l.mu || '--'}</td>
      <td class="px-2 py-2.5 text-right font-mono text-[10px] font-bold text-indigo-600">${lR > 0 ? lR.toFixed(3) : '--'}</td>
      <td class="px-2 py-2.5 text-right font-mono text-[10px] text-slate-500">${lCO2}</td>
      <td class="px-2 py-2.5 text-right font-mono text-[10px] font-bold text-emerald-600">${l.PrecioNum.toFixed(2)}</td>
    </tr>`;
  });

  // Budget chapter breakdown
  const chapters: Record<string, number> = {};
  state.layers.forEach(l => {
    const ch = l.budgetChapter || 'GEN';
    chapters[ch] = (chapters[ch] || 0) + l.PrecioNum;
  });
  let chapterRows = '';
  Object.entries(chapters).forEach(([ch, amount]) => {
    const pct = pem > 0 ? ((amount / pem) * 100).toFixed(1) : '0';
    chapterRows += `<tr class="border-b border-slate-100"><td class="py-1.5 px-3 text-[10px] font-bold text-slate-700">${ch}</td><td class="py-1.5 px-3 text-right font-mono text-[10px] text-slate-600">${amount.toFixed(2)} €/m²</td><td class="py-1.5 px-3 text-right text-[10px] text-slate-500">${pct}%</td></tr>`;
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8"/>
    <title>Memoria Técnica — ${sys.name} — ETSIE UPV</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;600&family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>
    <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f8fafc; color: #0f172a; }
        .title-font { font-family: 'Playfair Display', serif; }
        .mono { font-family: 'Roboto Mono', monospace; }
        @page { size: A4 portrait; margin: 14mm 12mm; }
        @media print {
            body { background: white; margin: 0; padding: 0; }
            .no-print { display: none; }
            .break-before { break-before: page; }
            .break-avoid { break-inside: avoid; }
        }
        .page { max-width: 210mm; margin: 0 auto; background: white; min-height: 297mm; position: relative; padding: 30px 35px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); margin-bottom: 20px; }
        @media print { .page { box-shadow: none; margin-bottom: 0; padding: 0; } }
        .metric-card { border-top: 4px solid; padding: 16px; border-radius: 0 0 8px 8px; background: white; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .energy-bar { display: flex; flex-direction: column; gap: 3px; }
        .energy-bar span { display: block; padding: 2px 8px; font-size: 9px; font-weight: 800; border-radius: 3px; text-align: center; color: white; }
    </style>
</head>
<body class="p-4">

    <!-- ═══════════════════════════════════════════════════ PAGE 1: COVER ═══════════════════════════════════════════════════ -->
    <div class="page flex flex-col">
        <!-- Header -->
        <header class="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-8">
            <div>
                <div class="text-2xl font-black tracking-tighter text-red-600">ETSIE<span class="text-slate-900">UPV</span></div>
                <div class="text-[8px] uppercase tracking-[0.25em] text-slate-500 font-semibold mt-1 leading-relaxed">Escuela Técnica Superior de Ingeniería de Edificación<br/>Universitat Politècnica de València</div>
            </div>
            <div class="text-right">
                <h1 class="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-800">Memoria de Detalle Constructivo</h1>
                <p class="text-[9px] text-slate-500 mt-1 mono">Fecha: ${date} · ID: ${docId}</p>
            </div>
        </header>

        <!-- Title Block -->
        <section class="mb-8">
            <span class="inline-block px-3 py-1 bg-slate-100 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 rounded mb-4 border border-slate-200">${sys.normRef || 'CTE'}</span>
            <h2 class="title-font text-4xl font-extrabold text-slate-900 leading-[1.1] mb-3">${sys.name}</h2>
            <p class="text-[11px] leading-relaxed text-slate-600 max-w-lg">${sys.description}</p>
        </section>

        <!-- Key Metrics -->
        <section class="grid grid-cols-5 gap-3 mb-8">
            <div class="metric-card" style="border-top-color: #6366f1">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Transmitancia U</span>
                <div class="flex items-end gap-1"><span class="text-3xl font-black text-slate-800 leading-none">${u.toFixed(2)}</span><span class="text-[10px] text-slate-500 mb-1">W/m²K</span></div>
            </div>
            <div class="metric-card" style="border-top-color: #10b981">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Huella CO₂</span>
                <div class="flex items-end gap-1"><span class="text-3xl font-black text-slate-800 leading-none">${co2.toFixed(1)}</span><span class="text-[10px] text-slate-500 mb-1">kgCO₂/m²</span></div>
            </div>
            <div class="metric-card" style="border-top-color: #f59e0b">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Resistencia Rt</span>
                <div class="flex items-end gap-1"><span class="text-3xl font-black text-slate-800 leading-none">${rTotal.toFixed(2)}</span><span class="text-[10px] text-slate-500 mb-1">m²K/W</span></div>
            </div>
            <div class="metric-card" style="border-top-color: #71717a">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Masa Sup.</span>
                <div class="flex items-end gap-1"><span class="text-3xl font-black text-slate-800 leading-none">${mass.toFixed(0)}</span><span class="text-[10px] text-slate-500 mb-1">kg/m²</span></div>
            </div>
            <div class="metric-card" style="border-top-color: ${energyLabel.c}">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Calificación</span>
                <div class="flex items-center gap-2">
                    <span class="text-4xl font-black leading-none" style="color:${energyLabel.c}">${energyLabel.l}</span>
                    <div class="energy-bar flex-1">
                        ${['A','B','C','D','E','F','G'].map(lbl => `<span style="background:${lbl===energyLabel.l ? energyLabel.c : '#e2e8f0'}; color:${lbl===energyLabel.l ? 'white' : '#94a3b8'}; ${lbl===energyLabel.l ? 'transform:scale(1.05);' : 'opacity:0.4;'}">${lbl}</span>`).join('')}
                    </div>
                </div>
            </div>
        </section>

        <!-- Normative / Academic badges -->
        <section class="flex gap-4 mb-8">
            <div class="flex-1 px-5 py-4 rounded-xl border-2 ${cumpleCTE ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <span class="text-[8px] font-bold uppercase tracking-widest ${cumpleCTE ? 'text-green-600' : 'text-red-600'} block mb-1">Evaluación Normativa</span>
                <span class="text-sm font-black ${cumpleCTE ? 'text-green-700' : 'text-red-700'}">${cumpleCTE ? '✓ CUMPLE CTE DB-HE' : '✗ NO CUMPLE CTE'}</span>
            </div>
            <div class="flex-1 px-5 py-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                <span class="text-[8px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Puntuación Académica</span>
                <span class="text-2xl font-black ${normScore >= 80 ? 'text-green-600' : normScore >= 50 ? 'text-amber-600' : 'text-red-600'}">${normScore}<span class="text-sm text-slate-400">/100</span></span>
            </div>
            <div class="flex-1 px-5 py-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                <span class="text-[8px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Espesor Total</span>
                <span class="text-2xl font-black text-slate-800">${totalMM}<span class="text-sm text-slate-400">mm</span></span>
            </div>
            <div class="flex-1 px-5 py-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                <span class="text-[8px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Condensaciones</span>
                <span class="text-sm font-black ${hasCondensation ? 'text-red-600' : 'text-green-600'}">${hasCondensation ? '⚠ RIESGO' : '✓ SIN RIESGO'}</span>
            </div>
        </section>

        <!-- Graphics: 2D + 3D -->
        <section class="flex gap-4 flex-1">
            <div class="w-1/2 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex flex-col items-center justify-center relative p-3">
                ${i3d ? `<img src="${i3d}" style="max-height:100%;max-width:100%;object-fit:contain;" />` : `<span class="text-slate-400 text-xs">3D No Disponible</span>`}
                <div class="absolute bottom-2 left-2 bg-white/90 px-2.5 py-1 rounded border border-slate-200 shadow-sm backdrop-blur-sm">
                    <span class="text-[7px] font-bold tracking-widest uppercase text-slate-600">Vista Isométrica 3D</span>
                </div>
            </div>
            <div class="w-1/2 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative p-3">
                ${i2d ? `<img src="${i2d}" style="max-height:100%;max-width:100%;object-fit:contain;" />` : `<span class="text-slate-400 text-xs">2D No Disponible</span>`}
                <div class="absolute bottom-2 left-2 bg-white/90 px-2.5 py-1 rounded border border-slate-200 shadow-sm backdrop-blur-sm">
                    <span class="text-[7px] font-bold tracking-widest uppercase text-slate-600">Sección Transversal 2D</span>
                </div>
            </div>
        </section>

        <footer class="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
            <p class="text-[7px] text-slate-400">Generado por <strong>ConstructoPro v15.0</strong> — ETSIE UPV · Herramienta Educativa</p>
            <p class="text-[7px] text-slate-400 mono">Pág. 1 de 3</p>
        </footer>
    </div>

    <!-- ═══════════════════════════════════════════════════ PAGE 2: STRATIGRAPHY ═══════════════════════════════════════════════════ -->
    <div class="page break-before">
        <header class="flex justify-between items-center border-b border-slate-200 pb-3 mb-6">
            <div class="text-lg font-black tracking-tighter text-red-600">ETSIE<span class="text-slate-900">UPV</span></div>
            <div class="text-[8px] text-slate-400 mono">${docId} · ${date}</div>
        </header>

        <h3 class="text-xs font-black uppercase tracking-[0.15em] text-slate-800 mb-4 flex items-center gap-2">
            <span class="w-1 h-4 bg-indigo-600 rounded-full inline-block"></span>
            Desglose Estratigráfico — ${state.layers.length} Capas · ${totalMM} mm
        </h3>

        <table class="w-full text-left mb-8 break-avoid">
            <thead>
                <tr class="text-[8px] uppercase tracking-wider text-slate-400 font-bold border-b-2 border-slate-300">
                    <th class="px-2 py-2 text-center w-8">Pos</th>
                    <th class="px-2 py-2">Material / Descripción</th>
                    <th class="px-2 py-2 text-center">mm</th>
                    <th class="px-2 py-2 text-center">λ</th>
                    <th class="px-2 py-2 text-center">ρ</th>
                    <th class="px-2 py-2 text-center">μ</th>
                    <th class="px-2 py-2 text-right">R (m²K/W)</th>
                    <th class="px-2 py-2 text-right">CO₂</th>
                    <th class="px-2 py-2 text-right">€/m²</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
                <tr class="bg-slate-900 text-white font-bold">
                    <td class="px-2 py-3 text-center text-[9px]" colspan="2">TOTAL</td>
                    <td class="px-2 py-3 text-center mono text-[10px]">${totalMM}</td>
                    <td class="px-2 py-3" colspan="3"></td>
                    <td class="px-2 py-3 text-right mono text-[10px] text-indigo-300">${rTotal.toFixed(3)}</td>
                    <td class="px-2 py-3 text-right mono text-[10px] text-slate-400">${co2.toFixed(2)}</td>
                    <td class="px-2 py-3 text-right mono text-[10px] text-emerald-400">${pem.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>

        <!-- Glaser Diagram -->
        <h3 class="text-xs font-black uppercase tracking-[0.15em] text-slate-800 mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
            Análisis de Condensaciones (Método de Glaser)
        </h3>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <div class="flex items-center gap-3 mb-3">
                <span class="text-[9px] font-bold ${hasCondensation ? 'text-red-600' : 'text-green-600'} uppercase tracking-wider">${hasCondensation ? '⚠ Riesgo de condensación intersticial detectado' : '✓ No se detecta riesgo de condensación intersticial'}</span>
                <span class="text-[8px] text-slate-400">T_ext=7°C HR_ext=65% | T_int=20°C HR_int=55%</span>
            </div>
            ${glaserSVG}
            <div class="flex gap-6 mt-3">
                <div class="flex items-center gap-1.5"><div class="w-3 h-0.5 bg-red-500"></div><span class="text-[8px] text-slate-500">P. Saturación (pSat)</span></div>
                <div class="flex items-center gap-1.5"><div class="w-3 h-0.5 bg-blue-500"></div><span class="text-[8px] text-slate-500">P. Vapor (pVapor)</span></div>
                <div class="flex items-center gap-1.5"><div class="w-3 h-0.5 bg-amber-500"></div><span class="text-[8px] text-slate-500">Temperatura (°C)</span></div>
            </div>
        </div>

        <footer class="absolute bottom-[30px] left-[35px] right-[35px] pt-3 border-t border-slate-200 flex justify-between items-center">
            <p class="text-[7px] text-slate-400">ConstructoPro v15.0 — ETSIE UPV</p>
            <p class="text-[7px] text-slate-400 mono">Pág. 2 de 3</p>
        </footer>
    </div>

    <!-- ═══════════════════════════════════════════════════ PAGE 3: BUDGET ═══════════════════════════════════════════════════ -->
    <div class="page break-before">
        <header class="flex justify-between items-center border-b border-slate-200 pb-3 mb-6">
            <div class="text-lg font-black tracking-tighter text-red-600">ETSIE<span class="text-slate-900">UPV</span></div>
            <div class="text-[8px] text-slate-400 mono">${docId} · ${date}</div>
        </header>

        <h3 class="text-xs font-black uppercase tracking-[0.15em] text-slate-800 mb-6 flex items-center gap-2">
            <span class="w-1 h-4 bg-emerald-600 rounded-full inline-block"></span>
            Estudio Económico — Presupuesto de Medición (${state.area.toFixed(2)} m²)
        </h3>
        
        <div class="flex gap-6 mb-8">
            <!-- Left: Budget table -->
            <div class="w-3/5">
                <table class="w-full text-left bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <tbody class="text-[10px]">
                        <tr class="border-b border-slate-200"><td class="font-semibold text-slate-700 py-3 px-4">Presupuesto Ejecución Material (PEM)</td><td class="text-right mono font-bold text-slate-800 py-3 px-4">${pem.toFixed(2)} €/m²</td></tr>
                        <tr class="border-b border-slate-200 bg-slate-50"><td class="text-slate-500 py-2.5 px-4">Gastos Generales (13%)</td><td class="text-right mono text-slate-600 py-2.5 px-4">${gg.toFixed(2)} €/m²</td></tr>
                        <tr class="border-b border-slate-200"><td class="text-slate-500 py-2.5 px-4">Beneficio Industrial (6%)</td><td class="text-right mono text-slate-600 py-2.5 px-4">${bi.toFixed(2)} €/m²</td></tr>
                        <tr class="bg-indigo-50 border-b-2 border-indigo-200"><td class="font-bold text-indigo-900 py-3 px-4 uppercase tracking-wider text-[9px]">P.E.C. (Subtotal)</td><td class="text-right mono font-black text-indigo-900 py-3 px-4">${pec.toFixed(2)} €/m²</td></tr>
                        <tr class="border-b border-slate-200"><td class="text-slate-500 py-2.5 px-4">IVA (21%)</td><td class="text-right mono text-slate-600 py-2.5 px-4">${iva.toFixed(2)} €/m²</td></tr>
                        <tr class="bg-slate-900 text-white"><td class="font-bold py-3 px-4 uppercase tracking-wider text-[9px]">Coste Total Unitario</td><td class="text-right mono font-black py-3 px-4 text-emerald-400">${(pec + iva).toFixed(2)} €/m²</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Right: Chapter breakdown -->
            <div class="w-2/5">
                <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div class="px-3 py-2 border-b border-slate-200"><span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">Desglose por Capítulos</span></div>
                    <table class="w-full"><tbody>${chapterRows}</tbody></table>
                </div>
            </div>
        </div>

        <!-- Total budget block -->
        <div class="p-8 bg-gradient-to-r from-slate-100 to-slate-50 border-2 border-slate-200 rounded-2xl relative overflow-hidden mb-8">
            <div class="absolute -right-6 -top-6 opacity-5">
                <svg width="140" height="140" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.74 0-2.1-.78-2.17-1.28H8.14c.1 1.37 1.11 2.58 2.76 2.93V19h2.33v-1.63c1.55-.37 2.8-1.48 2.8-2.92 0-1.89-1.64-2.78-3.72-3.31z"/></svg>
            </div>
            <h4 class="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Presupuesto Base de Licitación Total</h4>
            <p class="text-[8px] text-slate-400 mb-4">Superficie de cálculo: ${state.area.toFixed(2)} m² · IVA incluido</p>
            <div class="flex items-baseline gap-3">
                <span class="text-5xl font-black text-slate-900 tracking-tighter">${budgetTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span class="text-lg font-bold text-slate-400">EUR</span>
            </div>
        </div>

        <!-- Disclaimer -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6">
            <p class="text-[8px] text-amber-800 leading-relaxed"><strong>Nota Importante:</strong> Los datos calculados son estimaciones pedagógicas basadas en el Código Técnico de la Edificación (CTE) y la base de datos de precios IVE. No sustituyen el cálculo oficial de un proyecto visado por técnico competente. Los precios reflejan valores medios del mercado valenciano 2024-2025.</p>
        </div>

        <footer class="absolute bottom-[30px] left-[35px] right-[35px] pt-3 border-t border-slate-200 flex justify-between items-center">
            <p class="text-[7px] text-slate-400">Documento generado por <strong>ConstructoPro v15.0 Élite</strong> — Herramienta Educativa de la Universitat Politècnica de València (ETSIE)</p>
            <p class="text-[7px] text-slate-400 mono">Pág. 3 de 3</p>
        </footer>
    </div>

</body>
</html>`;

  w.document.write(htmlContent);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 1000);
};

function buildGlaserSVG(points: any[], totalMM: number): string {
  if (points.length < 2) return '<div class="text-[9px] text-slate-400 text-center py-8">Datos insuficientes para diagrama</div>';

  const svgW = 600, svgH = 160, padL = 45, padR = 15, padT = 15, padB = 25;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const maxP = Math.max(...points.map(p => Math.max(p.pSatVal || 0, p.pVaporVal || 0)), 2500);
  const maxPos = Math.max(...points.map(p => p.position), totalMM || 1);

  const xOf = (pos: number) => padL + (pos / maxPos) * plotW;
  const yOfP = (p: number) => padT + plotH - (p / maxP) * plotH;

  let satPath = '', vapPath = '';
  points.forEach((p, i) => {
    const x = xOf(p.position);
    satPath += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yOfP(p.pSatVal).toFixed(1)} `;
    vapPath += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yOfP(p.pVaporVal).toFixed(1)} `;
  });

  // Condensation zones
  let condensZones = '';
  points.forEach((p, i) => {
    if (p.condensation) {
      const x = xOf(p.position);
      condensZones += `<rect x="${(x-4).toFixed(1)}" y="${padT}" width="8" height="${plotH}" fill="rgba(239,68,68,0.1)" />`;
      condensZones += `<circle cx="${x.toFixed(1)}" cy="${yOfP(p.pVaporVal).toFixed(1)}" r="4" fill="#ef4444" opacity="0.7" />`;
    }
  });

  return `<svg viewBox="0 0 ${svgW} ${svgH}" class="w-full" style="max-height:180px">
    <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.5"/>
    ${condensZones}
    <path d="${satPath}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>
    <path d="${vapPath}" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <text x="${padL-5}" y="${padT+8}" text-anchor="end" class="text-[7px]" fill="#94a3b8">${maxP.toFixed(0)} Pa</text>
    <text x="${padL-5}" y="${padT+plotH}" text-anchor="end" class="text-[7px]" fill="#94a3b8">0</text>
    <text x="${padL}" y="${svgH-5}" class="text-[7px]" fill="#94a3b8">EXT (0mm)</text>
    <text x="${padL+plotW}" y="${svgH-5}" text-anchor="end" class="text-[7px]" fill="#94a3b8">INT (${totalMM}mm)</text>
  </svg>`;
}
