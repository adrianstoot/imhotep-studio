import type { RefObject } from 'react';
import type { DraftDocument } from './Section2D';
import { DraftPatterns, patternFor } from './Section2D';

const mm = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
function lines(text: string, length = 36) {
  return text.split(' ').reduce<string[]>((all, word) => {
    const i = all.length - 1;
    if ((all[i] + ' ' + word).length > length) all.push(word); else all[i] = `${all[i]} ${word}`.trim();
    return all;
  }, ['']);
}

/** Every component intersected is listed; the sheet grows instead of silently dropping entries. */
export function TechnicalDrawing({ document: doc, denominator, svgRef }: { document: DraftDocument; denominator: number; svgRef: RefObject<SVGSVGElement | null>; expanded?: boolean }) {
  const legend = [...new Map(doc.features.map((part) => [part.entityId, part])).values()];
  const columns = legend.length > 13 ? 2 : 1, rows = Math.ceil(legend.length / columns);
  const width = columns === 2 ? 1420 : 1100;
  const rowHeight = Math.max(40, ...legend.map((part) => lines(part.label).length * 13 + 17));
  const height = Math.max(700, 120 + rows * rowHeight + 80);
  const box = { x: 90, y: 115, width: 640, height: height - 250 };
  const spanU = Math.max(1, doc.maxU - doc.minU), spanV = Math.max(1, doc.maxV - doc.minV);
  const scale = Math.min(box.width / spanU, box.height / spanV);
  const left = box.x + (box.width - spanU * scale) / 2, top = box.y + (box.height - spanV * scale) / 2;
  const u = (n: number) => left + (n - doc.minU) * scale, v = (n: number) => top + (doc.maxV - n) * scale;
  const phys = 1 / (scale * denominator), baseline = height - 94, scaleY = height - 49;
  const scaleLength = spanU > 2000 ? 1000 : spanU > 700 ? 500 : 100;
  const anchors = legend.map((part) => part.polygon.reduce((sum, point) => ({ u: sum.u + point.u / part.polygon.length, v: sum.v + point.v / part.polygon.length }), { u: 0, v: 0 }));
  const anchorOrder = anchors.map((point, i) => ({ point, i })).sort((a, b) => b.point.v - a.point.v || a.point.u - b.point.u).map((entry) => entry.i);
  return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width={`${width * phys}mm`} height={`${height * phys}mm`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${doc.title}. Componentes y uniones del modelo 3D, cotas en milímetros.`} data-drawing-scale={`1:${denominator}`} style={{ fontFamily: 'Arial, sans-serif' }}>
    <title>{doc.title}</title><desc>{doc.subtitle}. SVG a escala física 1:{denominator}. {doc.note}</desc>
    <DraftPatterns /><rect width={width} height={height} fill="#fff" />
    <text x="28" y="31" fontSize="20" fill="#203c42" fontWeight="700">{doc.title}</text>
    <text x="28" y="53" fontSize="12" fill="#687b7c">{doc.subtitle} · cotas en mm · exportación 1:{denominator}</text>
    {doc.specs && <text x="28" y="73" fontSize="11" fill="#385c58">{doc.specs}</text>}
    <line x1="28" x2={width - 28} y1={doc.specs ? 83 : 72} y2={doc.specs ? 83 : 72} stroke="#d9e3df" />
    <text x="90" y="95" fontSize="10" fill="#718582" letterSpacing="1.2">{doc.projection ? 'ALZADO · PROYECCIÓN DE COMPONENTES' : 'INTERIOR ← CORTE REAL DEL MODELO → EXTERIOR'}</text>
    {doc.features.map((part) => <polygon key={part.id} points={part.polygon.map((point) => `${u(point.u)},${v(point.v)}`).join(' ')} fill={part.envelope ? '#f2f5f3' : `url(#draft-${patternFor(part.kind)})`} fillOpacity={doc.projection ? .6 : 1} stroke={part.envelope ? '#81908a' : '#263d3d'} strokeWidth={part.envelope ? .75 : 1.05} strokeDasharray={part.envelope ? '4 3' : undefined} strokeLinejoin="round" />)}
    <line x1="775" x2="775" y1="88" y2={height - 55} stroke="#dce6e1" />
    <text x="798" y="95" fontSize="10" fill="#718582" letterSpacing="1.2">{legend.length} COMPONENTES {doc.projection ? 'EN PROYECCIÓN' : 'EN EL CORTE'}</text>
    {legend.map((part, i) => {
      const column = Math.floor(i / rows), row = i % rows, x = 800 + column * 300, y = 122 + row * rowHeight;
      const labelLines = lines(part.label);
      // Stagger leaders along the drawing margin so narrow tapes do not receive overlapping bubbles.
      const leaderY = box.y + (anchorOrder.indexOf(i) + .5) * box.height / legend.length;
      const anchor = anchors[i];
      return <g key={part.entityId}>
        {!doc.projection && <g fill="none" stroke="#688c86" strokeWidth=".65"><path d={`M${u(anchor.u)},${v(anchor.v)}L${left - 25},${leaderY}H${left - 38}`} /><circle cx={u(anchor.u)} cy={v(anchor.v)} r="2" fill="#688c86" /><circle cx={left - 48} cy={leaderY} r="8" fill="#fff" /><text x={left - 48} y={leaderY + 3} fill="#305949" stroke="none" fontSize="9" textAnchor="middle">{i + 1}</text></g>}
        <circle cx={x + 8} cy={y - 3} r="9" fill="#365e58" /><text x={x + 8} y={y + .5} fill="#fff" fontSize="10" textAnchor="middle">{i + 1}</text>
        <text x={x + 26} y={y - 3} fontSize="11.5" fill="#2c4645" fontWeight="600">{labelLines.map((line, j) => <tspan key={j} x={x + 26} dy={j ? 13 : 0}>{line}</tspan>)}</text>
        <text x={x + 26} y={y + labelLines.length * 13} fontSize="9.5" fill="#7b8d86">{part.envelope ? 'Envolvente comercial' : `Espesor representado · ${mm(part.depthMm)} mm`}</text>
      </g>;
    })}
    <g stroke="#536c62" fill="#536c62" strokeWidth=".8">
      <line x1={u(doc.minU)} x2={u(doc.maxU)} y1={baseline} y2={baseline} markerStart="url(#draft-arrow)" markerEnd="url(#draft-arrow)" />
      {[doc.minU, doc.maxU].map((n) => <line key={n} x1={u(n)} x2={u(n)} y1={baseline - 12} y2={baseline + 7} />)}
      <text x={(u(doc.minU) + u(doc.maxU)) / 2} y={baseline - 9} stroke="none" fontSize="12" textAnchor="middle">{mm(spanU)} mm</text>
      <line x1="57" x2="57" y1={v(doc.maxV)} y2={v(doc.minV)} markerStart="url(#draft-arrow)" markerEnd="url(#draft-arrow)" />
      <text x="39" y={top + spanV * scale / 2} transform={`rotate(-90 39 ${top + spanV * scale / 2})`} textAnchor="middle" stroke="none" fontSize="11">{mm(spanV)} mm · tramo representado</text>
      <line x1="90" x2={90 + scaleLength * scale} y1={scaleY} y2={scaleY} strokeWidth="2" />
      <text x="90" y={scaleY + 17} stroke="none" fontSize="10">{scaleLength} mm · referencia gráfica</text>
    </g>
    <text x="28" y={height - 10} fontSize="10" fill="#7b8b85">{doc.note}</text>
  </svg>;
}
