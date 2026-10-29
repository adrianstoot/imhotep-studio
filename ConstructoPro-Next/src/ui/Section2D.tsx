import { useMemo, useRef, useState } from 'react';
import { Download, Maximize2, Minimize2, ScanLine, X } from 'lucide-react';
import { PRODUCT_BY_ID } from '../data/catalog';
import type { GeometryKind } from '../domain/types';
import { clipSectionPolygon, projectEntityElevation, resolveJambSection, resolveSection, resolveWindowDetail, resolveWindowElevation, type SectionPoint, type PrimitiveMetadata } from '../geometry/sectionResolver';
import { TechnicalDrawing } from './TechnicalDrawing';
import { entityBoundsMm } from '../geometry/sceneResolver';
import { useEditor } from '../state/EditorStore';

type SectionView = 'vertical' | 'jamb' | 'opening' | 'sill' | 'head' | 'fixing' | 'support';
export interface DraftFeature { id: string; entityId: string; label: string; polygon: SectionPoint[]; kind: GeometryKind; envelope: boolean; depthMm: number }
export interface DraftDocument { title: string; subtitle: string; features: DraftFeature[]; minU: number; maxU: number; minV: number; maxV: number; cropped: boolean; note: string; specs?: string; projection?: boolean; cavity?: { from: number; to: number } }
const mm = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });

export function patternFor(kind: GeometryKind): string {
  if (kind === 'insulation') return 'insulation';
  if (kind === 'masonry') return 'masonry';
  if (kind === 'solid') return 'concrete';
  if (kind === 'window' || kind === 'glass') return 'glass';
  if (kind === 'membrane') return 'membrane';
  return 'hatch';
}

export function DraftPatterns({ prefix = 'draft' }: { prefix?: string }) {
  return <defs>
    <pattern id={`${prefix}-hatch`} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#f4f3ee" /><path d="M-2 2L2-2M0 10L10 0M8 12L12 8" stroke="#b7b7af" strokeWidth=".65" /></pattern>
    <pattern id={`${prefix}-masonry`} width="28" height="14" patternUnits="userSpaceOnUse"><rect width="28" height="14" fill="#f2e2d9" /><path d="M0 0H28V14H0ZM14 0V7M0 7H28M7 7V14M21 7V14" fill="none" stroke="#b07b62" strokeWidth=".7" /></pattern>
    <pattern id={`${prefix}-insulation`} width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#f7efcc" /><path d="M0 6C4-2 8 14 12 6S20-2 24 6" fill="none" stroke="#a08a39" strokeWidth=".9" /></pattern>
    <pattern id={`${prefix}-concrete`} width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#eeeeeb" /><path d="M3 3l3 1-2 3zM12 10l3 2-3 3z" fill="#a6aaa7" /><circle cx="6" cy="14" r=".8" fill="#989e99" /></pattern>
    <pattern id={`${prefix}-glass`} width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#edf6f5" /><path d="M0 16L16 0" stroke="#8bb7b0" strokeWidth=".7" /></pattern>
    <pattern id={`${prefix}-membrane`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#b7c4c4" /><path d="M0 8L8 0" stroke="#687c7b" strokeWidth=".7" /></pattern>
    <marker id={`${prefix}-arrow`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M7 1L1 4L7 7" fill="none" stroke="#475652" strokeWidth="1" /></marker>
  </defs>;
}

/** Small proportional preview. The separate hidden sheet retains the full scaled SVG export. */
function TechnicalPreview({ document }: { document: DraftDocument }) {
  const rangeU = Math.max(1, document.maxU - document.minU), rangeV = Math.max(1, document.maxV - document.minV);
  const scale = Math.min(266 / rangeU, 137 / rangeV);
  const left = 47 + (266 - rangeU * scale) / 2, top = 24 + (137 - rangeV * scale) / 2;
  const u = (value: number) => left + (value - document.minU) * scale;
  const v = (value: number) => top + (document.maxV - value) * scale;
  return <svg viewBox="0 0 360 210" role="img" aria-label="Vista previa proporcional del corte técnico" style={{ width: '100%', height: '100%', display: 'block', fontFamily: 'Arial, sans-serif' }}>
    <DraftPatterns prefix="mini" /><rect width="360" height="210" fill="#fff" />
    {document.features.map((feature) => <polygon key={feature.id} points={feature.polygon.map((point) => `${u(point.u)},${v(point.v)}`).join(' ')} fill={feature.envelope ? '#f0f4f2' : `url(#mini-${patternFor(feature.kind)})`} stroke={feature.envelope ? '#83918a' : '#293d32'} strokeWidth={feature.envelope ? .7 : 1.2} strokeDasharray={feature.envelope ? '4 2' : undefined} strokeLinejoin="round" />)}
    <g stroke="#6b7d73" fill="#52685b" strokeWidth=".8">
      <line x1={u(document.minU)} x2={u(document.maxU)} y1="178" y2="178" markerStart="url(#mini-arrow)" markerEnd="url(#mini-arrow)" />
      <line x1={u(document.minU)} x2={u(document.minU)} y1="170" y2="184" /><line x1={u(document.maxU)} x2={u(document.maxU)} y1="170" y2="184" />
      <text x={(u(document.minU) + u(document.maxU)) / 2} y="196" textAnchor="middle" fontSize="13" stroke="none">{mm(rangeU)} mm</text>
      <line x1="28" x2="28" y1={v(document.maxV)} y2={v(document.minV)} markerStart="url(#mini-arrow)" markerEnd="url(#mini-arrow)" />
      <text x="19" y={(v(document.minV) + v(document.maxV)) / 2} transform={`rotate(-90 19 ${(v(document.minV) + v(document.maxV)) / 2})`} textAnchor="middle" fontSize="11" stroke="none">{mm(rangeV)} mm</text>
    </g>
    {document.cavity && <text x="180" y="13" textAnchor="middle" fill="#5c7564" fontSize="10.5">Cámara geométrica · {mm(document.cavity.to - document.cavity.from)} mm</text>}
  </svg>;
}

export function Section2D() {
  const { project, ui, actions } = useEditor();
  const svgRef = useRef<SVGSVGElement>(null);
  const [requestedView, setRequestedView] = useState<SectionView>('sill');
  const [fullExtent, setFullExtent] = useState(false);
  const section = useMemo(() => resolveSection(project), [project]);
  const jamb = useMemo(() => resolveJambSection(project, ui.selectedIds[0]), [project, ui.selectedIds]);
  const activeView: SectionView = requestedView !== 'vertical' && !jamb.openingEntity ? 'vertical' : requestedView;
  const bounds = project.entities.filter((entity) => entity.visible).flatMap((entity) => entityBoundsMm(entity) ?? []);
  const minX = Math.min(project.section.offsetMm, ...bounds.map((entry) => entry.minX), -1000);
  const maxX = Math.max(project.section.offsetMm, ...bounds.map((entry) => entry.maxX), 1000);
  const document = useMemo<DraftDocument>(() => {
    const source = activeView === 'jamb' ? jamb.primitives : section.primitives;
    const convert = (primitive: PrimitiveMetadata): DraftFeature => {
      return { id: primitive.id, entityId: `${primitive.entity.id}|${primitive.label}`, label: primitive.label, polygon: primitive.polygon, kind: primitive.kind, envelope: primitive.representation === 'commercial-envelope', depthMm: primitive.nominalThicknessMm };
    };
    if (['sill', 'head', 'fixing', 'support'].includes(activeView)) {
      const detail = resolveWindowDetail(project, activeView as 'sill' | 'head' | 'fixing' | 'support', ui.selectedIds[0]);
      if (detail) return {
        title: activeView === 'sill' ? 'Alféizar · acristalamiento y vierteaguas' : activeView === 'head' ? 'Dintel · drenaje y ventilación' : activeView === 'support' ? 'Apoyo · calzo portante y premarco' : 'Jamba · fijación y sellados',
        subtitle: `Plano ${detail.axis.toUpperCase()} = ${mm(detail.offset)} mm · montaje vinculado a la ventana`,
        features: detail.primitives.map(convert), minU: detail.minU, maxU: detail.maxU, minV: detail.minV, maxV: detail.maxV, cropped: true,
        specs: detail.entity.opening?.installation ? (() => {
          const i = detail.entity.opening!.installation!;
          return `Junta ${mm(i.jointMm)} mm · Premarco ${mm(i.preframeFaceMm)} × ${mm(i.preframeDepthMm)} × 2 mm · Retorno ${mm(i.revealInsulationMm)} mm · Pendiente ${mm(i.sillSlopeDeg)}° · Vuelo ${mm(i.sillProjectionMm)} mm · Goterón ${mm(i.sillProjectionMm - 5)} mm`;
        })() : undefined,
        note: 'Solución genérica dimensionada. Secciones interiores esquemáticas; fijaciones y dintel requieren cálculo de proyecto.',
      };
    }
    if (activeView === 'opening' && jamb.openingEntity?.opening) {
      const entity = jamb.openingEntity, opening = entity.opening!;
      const [x, y] = entity.transform.position;
      const assembly = resolveWindowElevation(entity);
      const features: DraftFeature[] = assembly.length ? assembly.map(convert) : [{ id: entity.id, entityId: entity.id, label: `${entity.name} · alzado`, polygon: projectEntityElevation(entity), kind: 'window', envelope: true, depthMm: PRODUCT_BY_ID.get(entity.productId)!.variants[0].depthMm }];
      const points = features.flatMap((part) => part.polygon);
      return { title: 'Alzado del hueco · montaje completo', subtitle: `${mm(opening.widthMm)} × ${mm(opening.heightMm)} mm · antepecho ${mm(opening.sillMm)} mm`, features, minU: Math.min(x - opening.widthMm / 2, ...points.map((p) => p.u)), maxU: Math.max(x + opening.widthMm / 2, ...points.map((p) => p.u)), minV: Math.min(y - opening.heightMm / 2, ...points.map((p) => p.v)), maxV: Math.max(y + opening.heightMm / 2, ...points.map((p) => p.v)), cropped: false, projection: true, note: 'Proyección superpuesta de componentes. Consulta Alféizar, Dintel y Fijación para inspeccionar sus secciones reales.' };
    }
    let minU = activeView === 'jamb' ? jamb.minZ : section.minZ, maxU = activeView === 'jamb' ? jamb.maxZ : section.maxZ;
    let minV = activeView === 'jamb' ? jamb.minX : section.minY, maxV = activeView === 'jamb' ? jamb.maxX : section.maxY;
    const cropped = !fullExtent && activeView === 'vertical' && maxV - minV > 1800 && maxU - minU < 1500;
    if (cropped) { const centre = (minV + maxV) / 2; const halfHeight = project.section.expanded ? 500 : 200; minV = centre - halfHeight; maxV = centre + halfHeight; }
    const features = source.map(convert).map((feature) => ({ ...feature, polygon: clipSectionPolygon(clipSectionPolygon(feature.polygon, 'v', minV, true), 'v', maxV, false) })).filter((feature) => feature.polygon.length >= 3);
    if (cropped && features.length) { minU = Math.min(...features.flatMap((feature) => feature.polygon.map((point) => point.u))); maxU = Math.max(...features.flatMap((feature) => feature.polygon.map((point) => point.u))); }
    let cavity: DraftDocument['cavity'];
    if (activeView === 'vertical' && project.detailType === 'fachada-ventilada') {
      const axisAligned = (feature: DraftFeature) => project.entities.find((entity) => feature.entityId.startsWith(entity.id))?.transform.rotation.every((angle) => Math.abs(angle) < .00001);
      const insulating = features.filter((feature) => feature.kind === 'insulation' && axisAligned(feature));
      const panels = features.filter((feature) => feature.kind === 'cladding' && axisAligned(feature));
      if (insulating.length && panels.length) {
        let from = Math.max(...insulating.flatMap((feature) => feature.polygon.map((point) => point.u)));
        const to = Math.min(...panels.flatMap((feature) => feature.polygon.map((point) => point.u)));
        const membranes = features.filter((feature) => feature.kind === 'membrane' && axisAligned(feature)).flatMap((feature) => feature.polygon.map((point) => point.u));
        from = Math.max(from, ...membranes.filter((value) => value > from && value < to));
        if (to - from > 1) cavity = { from, to };
      }
    }
    return { title: activeView === 'jamb' ? 'Jamba · corte en planta' : 'Sección constructiva · capas', subtitle: activeView === 'jamb' ? `Plano Y = ${mm(jamb.cutY)} mm · hueco seleccionado` : `Plano X = ${mm(project.section.offsetMm)} mm${cropped ? ' · tramo ampliado' : ' · conjunto'}`, features, minU, maxU, minV, maxV, cropped, cavity, note: 'Geometría proporcional al documento 3D. Pantalla ajustada; escala física indicada para el SVG exportado.' };
  }, [activeView, fullExtent, jamb, project.detailType, project.entities, project.section.expanded, project.section.offsetMm, section, ui.selectedIds]);

  const download = () => {
    if (!svgRef.current) return;
    const raw = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${raw}`], { type: 'image/svg+xml;charset=utf-8' });
    const link = window.document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `${project.title.replace(/[^a-z0-9áéíóúñ]+/gi, '-')}-${activeView}-1-${project.section.scale}.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  const expandPreview = () => actions.updateSection({ open: true, expanded: true });
  if (!project.section.open) return <button className="section-peek" aria-label="Mostrar dibujo técnico" onClick={() => actions.updateSection({ open: true, expanded: false })}><ScanLine size={16} /><span>Sección 2D</span></button>;
  return <section className={`section-window ${project.section.expanded ? 'is-expanded' : ''}`} aria-label="Sección técnica 2D sincronizada">
    <header><div role={project.section.expanded ? undefined : 'button'} tabIndex={project.section.expanded ? undefined : 0} aria-label={project.section.expanded ? undefined : 'Abrir plano ampliado'} style={{ cursor: project.section.expanded ? undefined : 'zoom-in' }} onClick={project.section.expanded ? undefined : expandPreview} onKeyDown={project.section.expanded ? undefined : (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); expandPreview(); } }}><strong>Dibujo técnico</strong><span>{document.title} · {new Set(document.features.map((feature) => feature.entityId)).size} elementos</span></div><nav>
      <button onClick={download} title="Descargar SVG a escala"><Download size={15} /></button><button onClick={() => actions.updateSection({ expanded: !project.section.expanded })} title={project.section.expanded ? 'Reducir' : 'Ampliar'}>{project.section.expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button><button onClick={() => actions.updateSection({ open: false, expanded: false })} title="Cerrar"><X size={16} /></button>
    </nav></header>
    <div className={`section-window__canvas ${project.section.expanded ? '' : 'section-preview-canvas'}`} role={project.section.expanded ? undefined : 'button'} tabIndex={project.section.expanded ? undefined : 0} aria-label={project.section.expanded ? undefined : 'Ampliar dibujo técnico'} title={project.section.expanded ? undefined : 'Pulsa para ampliar el dibujo técnico'} style={{ cursor: project.section.expanded ? undefined : 'zoom-in' }} onClick={project.section.expanded ? undefined : expandPreview} onKeyDown={project.section.expanded ? undefined : (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); expandPreview(); } }}>
      {document.features.length ? project.section.expanded ? <TechnicalDrawing document={document} denominator={project.section.scale} svgRef={svgRef} expanded /> : <><TechnicalPreview document={document} /><div style={{ display: 'none' }} aria-hidden="true"><TechnicalDrawing document={document} denominator={project.section.scale} svgRef={svgRef} expanded /></div></> : <div className="section-empty"><ScanLine size={24} /><strong>El plano no intersecta el modelo</strong><span>Desplaza el corte X para encontrar las capas.</span></div>}
    </div>
    <footer><select aria-label="Vista técnica" className="section-view-select" value={activeView} onChange={(event) => setRequestedView(event.target.value as SectionView)}><option value="vertical">Capas</option><option value="sill" disabled={!jamb.openingEntity}>Alféizar</option><option value="support" disabled={!jamb.openingEntity}>Apoyo</option><option value="head" disabled={!jamb.openingEntity}>Dintel</option><option value="fixing" disabled={!jamb.openingEntity}>Fijación</option><option value="jamb" disabled={!jamb.openingEntity}>Jamba</option><option value="opening" disabled={!jamb.openingEntity}>Alzado</option></select>
      {activeView === 'vertical' ? <label><span>Corte X</span><input aria-label="Posición del plano de corte X" type="range" min={Math.floor(minX / 100) * 100} max={Math.ceil(maxX / 100) * 100} step="25" value={project.section.offsetMm} onChange={(event) => actions.updateSection({ offsetMm: Number(event.target.value) })} /></label> : <div className="section-linked-cut"><span /> Hueco vinculado</div>}
      {activeView === 'vertical' && <button type="button" onClick={() => setFullExtent((value) => !value)} title="Alternar detalle de capas y conjunto" style={{ border: '1px solid #d6ded7', background: '#fff', borderRadius: 4, color: '#445b4c', fontSize: 10, padding: '4px 7px', cursor: 'pointer' }}>{fullExtent ? 'Detalle' : 'Conjunto'}</button>}
      <select aria-label="Escala de exportación SVG" value={project.section.scale} onChange={(event) => actions.updateSection({ scale: Number(event.target.value) as 5 | 10 | 20 })}><option value="5">1:5</option><option value="10">1:10</option><option value="20">1:20</option></select><i><span /> SVG a escala</i>
    </footer>
  </section>;
}
