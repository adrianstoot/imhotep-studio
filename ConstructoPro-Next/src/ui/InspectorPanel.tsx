import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Box,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck2,
  Gauge,
  Layers3,
  Lock,
  LockOpen,
  MousePointerSquareDashed,
  PanelRight,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { PRODUCT_BY_ID } from '../data/catalog';
import { calculateProjectBudget } from '../data/budget';
import { PREMIUM_BY_PRODUCT_ID, PREMIUM_CATALOG } from '../data/catalogPresentation';
import type { RuleResult, SceneEntity, WindowInstallation } from '../domain/types';
import { computeCoverageLayout } from '../geometry/layout';
import { clampCommercialCutLength, openingsForEntity } from '../geometry/sceneResolver';
import { CTE_RULE_PACK, evaluateProject } from '../rules/cte';
import { DETAIL_GUIDES, ETSIE_LEARNING_SOURCE } from '../data/learningGuides';
import { useEditor, useSelectedEntities } from '../state/EditorStore';

function NumericField({ label, value, unit, step = 1, min, max, disabled = false, onCommit }: {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(3))));
  useEffect(() => setDraft(String(Number(value.toFixed(3)))), [value]);
  const commit = () => {
    const next = Number(draft.replace(',', '.'));
    setDraft(String(Number(value.toFixed(3))));
    if (Number.isFinite(next) && next !== value) onCommit(next);
  };
  return <label className="numeric-field"><span>{label}</span><span className="numeric-control"><input aria-label={label} disabled={disabled} inputMode="decimal" value={draft} step={step} min={min} max={max} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />{unit && <i>{unit}</i>}</span></label>;
}

function TransformEditor({ entity }: { entity: SceneEntity }) {
  const { actions } = useEditor();
  const updatePosition = (index: number, value: number) => {
    const position = [...entity.transform.position] as [number, number, number];
    position[index] = value;
    actions.updateTransform(entity.id, { ...entity.transform, position });
  };
  const updateRotation = (index: number, degrees: number) => {
    const rotation = [...entity.transform.rotation] as [number, number, number];
    rotation[index] = degrees * Math.PI / 180;
    actions.updateTransform(entity.id, { ...entity.transform, rotation });
  };
  return (
    <div className="property-section">
      <div className="section-title"><span>Transformación</span><small>mm / grados</small></div>
      <div className="axis-fields">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => <NumericField key={axis} label={axis} value={entity.transform.position[index]} unit="mm" disabled={entity.locked} onCommit={(value) => updatePosition(index, value)} />)}
      </div>
      <div className="axis-fields axis-fields--rotation">
        {(['RX', 'RY', 'RZ'] as const).map((axis, index) => <NumericField key={axis} label={axis} value={entity.transform.rotation[index] * 180 / Math.PI} unit="°" step={5} disabled={entity.locked} onCommit={(value) => updateRotation(index, value)} />)}
      </div>
    </div>
  );
}

function WindowInstallationEditor({ entity }: { entity: SceneEntity }) {
  const { actions } = useEditor();
  const [installationError, setInstallationError] = useState('');
  const opening = entity.opening;
  const installation = opening?.installation;
  useEffect(() => setInstallationError(''), [entity.id, installation]);
  if (!opening || !installation) return null;
  const update = (key: keyof WindowInstallation, value: number, min: number, max: number) => {
    const next = Math.max(min, Math.min(max, value));
    const candidate = { ...installation, [key]: next };
    const fallMm = (candidate.facadeFaceOffsetMm - 42.5) * Math.tan(candidate.sillSlopeDeg * Math.PI / 180);
    if (fallMm > candidate.jointMm + candidate.preframeFaceMm - 13 + .000001) {
      setInstallationError('La pendiente/retranqueo requiere más altura bajo el marco. Aumenta la holgura o el premarco.');
      return;
    }
    setInstallationError('');
    if (next === installation[key]) return;
    actions.updateEntity(entity.id, { opening: { ...opening, installation: candidate } }, 'Montaje del hueco actualizado');
  };
  const availableFallMm = installation.jointMm + installation.preframeFaceMm - 13;
  const maxSlopeDeg = Math.floor(Math.atan2(availableFallMm, installation.facadeFaceOffsetMm - 42.5) * 180 / Math.PI * 10) / 10;
  const maxFacadeOffsetMm = Math.floor((42.5 + availableFallMm / Math.tan(installation.sillSlopeDeg * Math.PI / 180)) * 10) / 10;
  const fields: { key: keyof WindowInstallation; label: string; min: number; max: number; absoluteMax?: number; unit?: string }[] = [
    { key: 'jointMm', label: 'Holgura de montaje', min: Math.max(5, installation.revealInsulationMm - installation.preframeFaceMm + 5), max: 50 },
    { key: 'preframeFaceMm', label: 'Cara del premarco', min: Math.max(10, installation.revealInsulationMm - installation.jointMm + 5), max: 80 },
    { key: 'preframeDepthMm', label: 'Fondo del premarco', min: 30, max: 150 },
    { key: 'revealInsulationMm', label: 'Aislamiento del telar', min: 10, max: installation.jointMm + installation.preframeFaceMm - 5 },
    { key: 'facadeFaceOffsetMm', label: 'Cara exterior desde el marco', min: installation.insulationFaceOffsetMm + 25, max: Math.min(600, maxFacadeOffsetMm), absoluteMax: 600 },
    { key: 'insulationFaceOffsetMm', label: 'Cara del aislante desde el marco', min: 50, max: installation.facadeFaceOffsetMm - 25 },
    { key: 'sillSlopeDeg', label: 'Pendiente del vierteaguas', min: 1, max: Math.min(30, maxSlopeDeg), absoluteMax: 30, unit: '°' },
    { key: 'sillProjectionMm', label: 'Vuelo del vierteaguas', min: 10, max: 150 },
    { key: 'lintelHeightMm', label: 'Canto del dintel', min: 80, max: 600 },
    { key: 'lintelBearingMm', label: 'Apoyo lateral del dintel', min: 100, max: 500 },
  ];
  const clearance = installation.jointMm + installation.preframeFaceMm;
  return <div className="property-section property-section--opening">
    <div className="section-title"><span>Montaje del hueco</span><small>vinculado a la ventana</small></div>
    <div className="dimension-grid">{fields.map((field) => <NumericField key={field.key} label={field.label} value={installation[field.key]} unit={field.unit ?? 'mm'} min={field.min} max={field.max} disabled={entity.locked} onCommit={(value) => update(field.key, value, field.min, field.absoluteMax ?? field.max)} />)}</div>
    {installationError && <div className="opening-warning" role="alert"><AlertTriangle size={16} /><p>{installationError}</p></div>}
    <dl className="technical-list"><div><dt>Hueco de obra</dt><dd>{opening.widthMm + 2 * clearance} × {opening.heightMm + 2 * clearance} mm</dd></div><div><dt>Montaje</dt><dd>Premarco, calzos, anclajes y sellados</dd></div></dl>
    <div className="model-evidence"><p>Carpintería de sección genérica de 80 mm; no es un CAD validado del fabricante. Anclajes y dintel requieren dimensionado.</p></div>
  </div>;
}

function PropertiesTab() {
  const { project, actions } = useEditor();
  const selected = useSelectedEntities();
  if (!selected.length) return <div className="inspector-empty"><MousePointerSquareDashed size={30} /><strong>Selecciona un objeto</strong><p>Haz clic en el modelo o en el árbol para editar dimensiones, posición y producto.</p></div>;
  if (selected.length > 1) return <div className="multi-selection"><div className="multi-selection__icon">{selected.length}</div><strong>Selección múltiple</strong><p>Puedes mover, rotar, duplicar, aislar u ocultar los objetos seleccionados como grupo.</p><div className="selection-list">{selected.map((entity) => <button key={entity.id} onClick={() => actions.select(entity.id)}><Box size={13} />{entity.name}</button>)}</div></div>;

  const entity = selected[0];
  const product = PRODUCT_BY_ID.get(entity.productId);
  if (!product) return null;
  const premium = PREMIUM_BY_PRODUCT_ID.get(product.id) ?? PREMIUM_CATALOG.find((item) => item.product.manufacturer === product.manufacturer && item.product.geometryKind === product.geometryKind);
  const variant = product.variants.find((entry) => entry.id === entity.variantId) ?? product.variants[0];
  const openings = openingsForEntity(entity, project.entities);
  const hasIndependentOpeningTrims = entity.opening && ['vierteaguas', 'dintel', 'jamba izquierda', 'jamba derecha']
    .every((token) => project.entities.some((candidate) => candidate.visible && candidate.name.toLocaleLowerCase('es').includes(token)));
  const layout = entity.coverage && ['masonry', 'insulation', 'membrane', 'cladding', 'board', 'paver', 'roof-tile'].includes(product.geometryKind)
    ? computeCoverageLayout(entity.coverage, variant, openings)
    : null;

  return (
    <div className="properties-scroll">
      <div className="selected-product-head">
        <button className="selected-product-head__art" type="button" title="Abrir ficha visual de la serie" onClick={() => actions.setUi({ catalogDetailId: premium?.product.id ?? null })}>
          {premium ? <img src={premium.artwork} alt={`Carta de ${product.name}`} /> : <span style={{ background: product.color }} />}
        </button>
        <div className="selected-product-head__copy"><small>{product.manufacturer} · {product.sku}</small><strong>{entity.name}</strong><p>{product.name}</p><div><b>{product.source.quality === 'documented' ? 'FUENTE DOCUMENTADA' : 'FUENTE ENLAZADA'}</b><span>{variant.widthMm} × {variant.heightMm} × {variant.depthMm} mm</span></div></div>
      </div>
      <TransformEditor entity={entity} />
      {entity.coverage && <div className="property-section">
        <div className="section-title"><span>Paño construido</span><small>unidades sin estirar</small></div>
        <div className="dimension-grid">
          <NumericField label="Ancho" value={entity.coverage.widthMm} unit="mm" step={100} disabled={entity.locked} onCommit={(widthMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, widthMm: Math.max(1, widthMm) } }, 'Ancho del paño actualizado')} />
          <NumericField label="Alto" value={entity.coverage.heightMm} unit="mm" step={100} disabled={entity.locked} onCommit={(heightMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, heightMm: Math.max(1, heightMm) } }, 'Alto del paño actualizado')} />
          {product.geometryKind === 'masonry' ? <>
            <NumericField label="Tendel horizontal" value={entity.coverage.bedJointMm ?? entity.coverage.jointMm} unit="mm" step={1} disabled={entity.locked} onCommit={(bedJointMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, bedJointMm: Math.max(0, bedJointMm) } }, 'Tendel de mortero actualizado')} />
            <NumericField label="Llaga vertical" value={entity.coverage.headJointMm ?? entity.coverage.jointMm} unit="mm" step={1} disabled={entity.locked} onCommit={(headJointMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, headJointMm: Math.max(0, headJointMm) } }, 'Llaga de mortero actualizada')} />
          </> : <NumericField label="Junta" value={entity.coverage.jointMm} unit="mm" step={1} disabled={entity.locked} onCommit={(jointMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, jointMm: Math.max(0, jointMm), bedJointMm: Math.max(0, jointMm), headJointMm: Math.max(0, jointMm) } }, 'Junta actualizada')} />}
          <NumericField label={product.geometryKind === 'roof-tile' ? 'Encaje longitudinal' : 'Solape'} value={entity.coverage.overlapMm} unit="mm" step={5} disabled={entity.locked} onCommit={(overlapMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, overlapMm: Math.max(0, overlapMm) } }, 'Solape actualizado')} />
          {product.geometryKind === 'roof-tile' && <NumericField label="Encaje transversal" value={entity.coverage.sideOverlapMm ?? 0} unit="mm" step={1} disabled={entity.locked} onCommit={(sideOverlapMm) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, sideOverlapMm: Math.max(0, sideOverlapMm) } }, 'Encaje transversal actualizado')} />}
        </div>
        <label className="switch-row"><span><strong>Aparejo alterno</strong><small>Desfase de media pieza</small></span><input type="checkbox" checked={entity.coverage.stagger} onChange={(event) => actions.updateEntity(entity.id, { coverage: { ...entity.coverage!, stagger: event.target.checked } })} /></label>
        {layout && <div className="coverage-metrics"><div><strong>{layout.requestedAreaM2.toFixed(2)}</strong><span>m² solicitados</span></div><div><strong>{layout.fullUnits}</strong><span>piezas enteras</span></div><div><strong>{layout.cutUnits}</strong><span>piezas con corte</span></div><div><strong>{product.geometryKind === 'masonry' ? layout.joints.length : layout.hiddenUnits}</strong><span>{product.geometryKind === 'masonry' ? 'juntas modeladas' : 'excepciones'}</span></div></div>}
      </div>}
      {entity.opening && <div className="property-section property-section--opening">
        <div className="section-title"><span>Hueco paramétrico real</span><small>{entity.opening.affectedEntities.length} elementos regenerados</small></div>
        <div className="dimension-grid"><NumericField label="Ancho comercial" value={entity.opening.widthMm} unit="mm" disabled onCommit={() => undefined} /><NumericField label="Alto comercial" value={entity.opening.heightMm} unit="mm" disabled onCommit={() => undefined} /><NumericField label="Antepecho" value={entity.opening.sillMm} unit="mm" disabled={entity.locked} onCommit={(sillMm) => actions.updateEntity(entity.id, { transform: { ...entity.transform, position: [entity.transform.position[0], sillMm + entity.opening!.heightMm / 2, entity.transform.position[2]] }, opening: { ...entity.opening!, sillMm } })} /></div>
        <div className={`opening-warning ${entity.opening.installation || hasIndependentOpeningTrims ? 'is-resolved' : ''}`}><AlertTriangle size={16} /><p>{entity.opening.installation ? 'Premarco, fijaciones, sellados, telares y vierteaguas se regeneran con esta ventana y sus cortes 2D.' : hasIndependentOpeningTrims ? 'Este hueco conserva remates independientes. Revisa su ajuste al mover la ventana.' : 'Este hueco no tiene montaje definido. Faltan premarco, anclajes, sellados y remates.'}</p></div>
      </div>}
      <WindowInstallationEditor entity={entity} />
      <div className="property-section">
        <div className="section-title"><span>Medida comercial</span><small>bloqueada</small></div>
        <div className="commercial-size"><span>{variant.widthMm}</span><i>×</i><span>{variant.heightMm}</span><i>×</i><span>{variant.depthMm}</span><b>mm</b></div>
        {product.placementKind === 'linear' && <div className="cut-length"><NumericField label="Longitud de corte" value={entity.cutLengthMm ?? variant.stockLengthMm ?? variant.heightMm} unit="mm" step={variant.cutIncrementMm ?? 1} disabled={entity.locked} onCommit={(cutLengthMm) => actions.updateEntity(entity.id, { cutLengthMm: clampCommercialCutLength(product, variant, cutLengthMm) }, 'Longitud de corte válida aplicada')} /><small>Stock: {variant.stockLengthMm ?? variant.heightMm} mm · mínimo {variant.minCutLengthMm ?? 1} mm</small></div>}
      </div>
      <div className="property-section">
        <div className="section-title"><span>Propiedades declaradas</span><small>{product.source.quality === 'documented' ? 'datos cargados' : 'sin usar'}</small></div>
        <dl className="technical-list"><div><dt>λ</dt><dd>{product.properties.lambdaWmK ? `${product.properties.lambdaWmK} W/mK` : '—'}</dd></div><div><dt>Densidad</dt><dd>{product.properties.densityKgM3 ? `${product.properties.densityKgM3} kg/m³` : '—'}</dd></div><div><dt>μ</dt><dd>{product.properties.vaporMu ?? '—'}</dd></div><div><dt>Fuego</dt><dd>{product.properties.fireClass ?? '—'}</dd></div></dl>
        <a className="document-link" href={product.source.url} target="_blank" rel="noreferrer"><FileCheck2 size={15} /><span>{product.source.documentTitle}</span><ChevronRight size={14} /></a>
        <details className="model-evidence"><summary>Alcance de esta representación</summary><p>{product.evidence.geometry === 'verified-dimensions' ? 'Dimensiones comerciales cargadas. El modelo de fabricación y sus uniones deben cotejarse con la ficha exacta.' : 'Geometría didáctica aproximada; no equivale a un plano de fabricación.'}</p><ul>{product.evidence.speculation.map((item) => <li key={item}>{item}</li>)}</ul><p>Fuente revisada: {product.source.reviewedAt}</p></details>
      </div>
    </div>
  );
}

function SceneTab() {
  const { project, ui, actions } = useEditor();
  const grouped = useMemo(() => {
    const groups = new Map<string, SceneEntity[]>();
    project.entities.forEach((entity) => {
      const category = PRODUCT_BY_ID.get(entity.productId)?.category ?? 'Sin categoría';
      groups.set(category, [...(groups.get(category) ?? []), entity]);
    });
    return [...groups.entries()];
  }, [project.entities]);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(grouped.filter(([, entities]) => entities.length > 8).map(([category]) => category)),
  );
  return <div className="scene-tree">
    <div className="scene-tree__intro"><div><Layers3 size={19} /><span><small>COMPOSICIÓN ACTIVA</small><strong>Capas y productos</strong></span></div><b><i />SINCRONIZADA</b></div>
    <div className="tree-summary"><div><strong>{project.entities.length}</strong><span>objetos</span></div><div><strong>{grouped.length}</strong><span>familias</span></div><div><strong>{project.entities.filter((entry) => entry.opening).length}</strong><span>huecos</span></div></div>
    {grouped.map(([category, entities]) => {
      const closed = collapsed.has(category);
      return <section className="tree-group" key={category}><button className="tree-group__head" onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; })}>{closed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<span>{category}</span><b>{entities.length}</b></button>{!closed && <div className="tree-cards">{entities.map((entity, index) => {
        const product = PRODUCT_BY_ID.get(entity.productId);
        if (!product) return null;
        const premium = PREMIUM_BY_PRODUCT_ID.get(product.id) ?? PREMIUM_CATALOG.find((item) => item.product.manufacturer === product.manufacturer && item.product.geometryKind === product.geometryKind);
        const variant = product.variants.find((candidate) => candidate.id === entity.variantId) ?? product.variants[0];
        return <article className={`tree-entity ${ui.selectedIds.includes(entity.id) ? 'is-selected' : ''} ${!entity.visible ? 'is-hidden' : ''}`} key={entity.id}>
          <button className="tree-select" onClick={(event) => actions.select(entity.id, event.shiftKey)}>
            <span className="tree-entity__art">{premium ? <img src={premium.artwork} alt="" loading="lazy" /> : <i style={{ background: `linear-gradient(145deg,${product.color},#edf8fd)` }} />}</span>
            <span className="tree-entity__copy"><small>{String(index + 1).padStart(2, '0')} · {product.manufacturer}</small><strong>{entity.name}</strong><em>{variant.widthMm} × {variant.heightMm} × {variant.depthMm} mm</em></span>
            {entity.opening && <b>HUECO</b>}
          </button>
          <div className="tree-entity__actions"><button className="tree-action" title={entity.visible ? 'Ocultar' : 'Mostrar'} onClick={() => actions.toggleVisibility(entity.id)}>{entity.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button className="tree-action" title={entity.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => actions.toggleLock(entity.id)}>{entity.locked ? <Lock size={14} /> : <LockOpen size={14} />}</button></div>
        </article>;
      })}</div>}</section>;
    })}
    {!project.entities.length && <div className="inspector-empty"><Layers3 size={28} /><strong>Escena vacía</strong><p>Añade productos individualmente desde la biblioteca.</p></div>}
  </div>;
}

function BudgetTab() {
  const { project, actions } = useEditor();
  const summary = useMemo(() => calculateProjectBudget(project), [project]);
  const settings = project.budget;
  const money = (value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const quantity = (value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: value < 10 ? 2 : 1, maximumFractionDigits: 2 });

  return <div className="budget-panel">
    <div className="budget-hero"><div><Calculator size={20} /><span><small>PRESUPUESTO VIVO</small><strong>{money(summary.totalPerM2Eur)} €/m²</strong></span></div><b>{summary.lines.length} PRODUCTOS</b></div>
    <div className="budget-controls">
      <NumericField label="Superficie objetivo" value={settings.areaM2} unit="m²" step={1} onCommit={(areaM2) => actions.updateBudget({ areaM2: Math.max(.01, areaM2) })} />
      <NumericField label="Merma superficial" value={settings.wastePct} unit="%" step={.5} onCommit={(wastePct) => actions.updateBudget({ wastePct: Math.max(0, wastePct) })} />
      <NumericField label="IVA" value={settings.vatPct} unit="%" step={1} onCommit={(vatPct) => actions.updateBudget({ vatPct: Math.max(0, vatPct) })} />
    </div>
    <div className="budget-note"><AlertTriangle size={14} /><span><strong>Tarifas docentes editables.</strong> El cálculo está ligado a los productos colocados y se escala automáticamente al cambiar los m². No representa una oferta comercial.</span></div>
    <div className="budget-list-head"><span>Materiales colocados</span><b>{summary.referenceAreaM2.toLocaleString('es-ES', { maximumFractionDigits: 2 })} m² modelados</b></div>
    <div className="budget-lines">{summary.lines.map((line) => {
      const premium = PREMIUM_BY_PRODUCT_ID.get(line.product.id) ?? PREMIUM_CATALOG.find((item) => item.product.manufacturer === line.product.manufacturer && item.product.geometryKind === line.product.geometryKind);
      return <article className="budget-line" key={line.product.id}>
        <button className="budget-line__product" onClick={() => { actions.select(line.entityIds[0]); actions.setUi({ inspectorTab: 'properties' }); }} title="Seleccionar en el editor">
          <span className="budget-line__art">{premium ? <img src={premium.artwork} alt="" /> : <i style={{ background: line.product.color }} />}</span>
          <span><small>{line.product.manufacturer}</small><strong>{line.product.name}</strong><em>{line.entityIds.length} objeto{line.entityIds.length === 1 ? '' : 's'} · {quantity(line.quantityPerM2)} {line.unit}/m²</em></span>
        </button>
        <a className="budget-line__source" href={line.product.source.url} target="_blank" rel="noreferrer" title="Abrir fuente del producto"><ExternalLink size={13} /></a>
        <div className="budget-line__numbers"><span><small>Cantidad</small><b>{quantity(line.projectedQuantity)} {line.unit}</b></span><label><small>Tarifa editable</small><span><input inputMode="decimal" value={Number(line.rateEur.toFixed(2))} onChange={(event) => { const rate = Number(event.target.value); if (Number.isFinite(rate)) actions.updateBudget({ rateOverrides: { ...settings.rateOverrides, [line.product.id]: Math.max(0, rate) } }); }} /><i>€/{line.unit}</i></span></label><span className="budget-line__subtotal"><small>Importe</small><b>{money(line.totalCostEur)} €</b></span></div>
      </article>;
    })}</div>
    <div className="budget-totals"><div><span>Materiales</span><b>{money(summary.baseCostEur)} €</b></div><div><span>Merma</span><b>{money(summary.wasteCostEur)} €</b></div><div><span>IVA {settings.vatPct.toLocaleString('es-ES')}%</span><b>{money(summary.vatEur)} €</b></div><div className="budget-totals__grand"><span>Total · {settings.areaM2.toLocaleString('es-ES', { maximumFractionDigits: 2 })} m²</span><strong>{money(summary.totalEur)} €</strong></div></div>
  </div>;
}

function RuleCard({ item }: { item: RuleResult }) {
  const icon = item.severity === 'pass' ? <BadgeCheck size={17} /> : item.severity === 'info' ? <CircleHelp size={17} /> : <AlertTriangle size={17} />;
  return <article className={`rule-card rule-card--${item.severity}`}><header>{icon}<strong>{item.title}</strong><span>{item.severity === 'pass' ? 'COMPROBADO' : item.severity === 'error' ? 'REVISAR' : item.severity === 'warning' ? 'PENDIENTE' : 'DATOS'}</span></header><p>{item.message}</p>{item.inputs && <details><summary>Entradas y resultado</summary><dl>{Object.entries(item.inputs).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></details>}<a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel} <ChevronRight size={13} /></a></article>;
}

function CteTab() {
  const { project } = useEditor();
  const results = useMemo(() => evaluateProject(project), [project]);
  const errors = results.filter((entry) => entry.severity === 'error').length;
  const warnings = results.filter((entry) => entry.severity === 'warning').length;
  const guide = DETAIL_GUIDES[project.detailType];
  return <div className="cte-panel">
    <div className="cte-overview"><ShieldCheck size={22} /><div><small>CTE · revisión {CTE_RULE_PACK.reviewedAt}</small><strong>Revisión constructiva</strong><p>{errors} por revisar · {warnings} pendientes · {project.context.municipality}</p></div></div>
    <details className="learning-guide" open key={project.detailType}>
      <summary><span>{guide.course}</span><strong>{guide.topic}</strong></summary>
      <h4>Secuencia de ejecución</h4><ol>{guide.sequence.map((item) => <li key={item}>{item}</li>)}</ol>
      <h4>Puntos de revisión</h4><ul>{guide.review.map((item) => <li key={item}>{item}</li>)}</ul>
      <a href={ETSIE_LEARNING_SOURCE} target="_blank" rel="noreferrer">Bloques docentes publicados por UPV <ExternalLink size={12} /></a>
      {project.entities.some((entity) => entity.opening?.installation) && <a href="https://wuolah.com/apuntes/construccion-iii/construccion-iii-trabajo-final-fachada-ventilada-pdf-7811286" target="_blank" rel="noreferrer">Trabajo de Construcción III · UPV · vista pública en Wuolah <ExternalLink size={12} /></a>}
    </details>
    <div className="context-mini-grid"><div className="context-mini"><span>Provincia / altitud</span><strong>{project.context.province || 'Pendiente'} · {project.context.altitudeM ?? '—'} m</strong></div><div className="context-mini"><span>Zona DB-HE</span><strong>{project.context.climateZone || 'Pendiente'} · {project.context.climateZoneSource === 'cte-anejob' ? 'calculada' : 'sin resolver'}</strong></div></div>
    <div className="educational-notice"><AlertTriangle size={15} />Cada resultado comprueba el criterio indicado. La justificación del edificio y la validación del sistema requieren los datos de proyecto y sus documentos técnicos.</div>
    <div className="rule-list">{results.map((item) => <RuleCard key={item.id} item={item} />)}</div>
  </div>;
}

export function InspectorPanel() {
  const { ui, actions } = useEditor();
  return <aside className="panel panel--inspector"><nav className="inspector-tabs"><button className={ui.inspectorTab === 'properties' ? 'is-active' : ''} onClick={() => actions.setUi({ inspectorTab: 'properties' })}><SlidersHorizontal size={15} /><span>Prop.</span></button><button className={ui.inspectorTab === 'scene' ? 'is-active' : ''} onClick={() => actions.setUi({ inspectorTab: 'scene' })}><PanelRight size={15} /><span>Capas</span></button><button className={ui.inspectorTab === 'budget' ? 'is-active' : ''} onClick={() => actions.setUi({ inspectorTab: 'budget' })}><Calculator size={15} /><span>Costes</span></button><button className={ui.inspectorTab === 'cte' ? 'is-active' : ''} onClick={() => actions.setUi({ inspectorTab: 'cte' })}><Gauge size={15} /><span>CTE</span></button></nav>{ui.inspectorTab === 'properties' ? <PropertiesTab /> : ui.inspectorTab === 'scene' ? <SceneTab /> : ui.inspectorTab === 'budget' ? <BudgetTab /> : <CteTab />}</aside>;
}
