import { lazy, Suspense, useState } from 'react';
import { Boxes, Calculator, FileCheck2, Grid2X2, Layers3, Magnet, PanelBottom, PanelLeft, PanelRight, Ruler } from 'lucide-react';
import { CatalogPanel } from './CatalogPanel';
import { InspectorPanel } from './InspectorPanel';
import { Section2D } from './Section2D';
import { TopBar } from './TopBar';
import { useEditor } from '../state/EditorStore';
import { QaReferenceBoard } from './QaReferenceBoard';
import type { EditorUiState } from '../domain/types';

const ThreeViewport = lazy(async () => {
  const module = await import('../geometry/ThreeViewport');
  return { default: module.ThreeViewport };
});

interface PanelControls {
  catalogOpen: boolean;
  inspectorOpen: boolean;
  onCatalogToggle: () => void;
  onInspectorToggle: () => void;
}

function WorkspaceRail({ catalogOpen, onCatalogToggle, onInspectorOpen }: { catalogOpen: boolean; onCatalogToggle: () => void; onInspectorOpen: () => void }) {
  const { ui, actions } = useEditor();
  const openTab = (inspectorTab: EditorUiState['inspectorTab']) => {
    actions.setUi({ inspectorTab, measuring: false, pieceMode: false });
    onInspectorOpen();
  };
  return <nav className="workspace-rail" aria-label="Módulos del editor">
    <button className={catalogOpen ? 'is-active' : ''} title="Mostrar u ocultar materiales" aria-pressed={catalogOpen} onClick={onCatalogToggle}><Boxes size={21} /></button>
    <i />
    <button title="Árbol de capas" className={ui.inspectorTab === 'scene' ? 'is-active' : ''} onClick={() => openTab('scene')}><Layers3 size={21} /></button>
    <button title="Presupuesto por m²" className={ui.inspectorTab === 'budget' ? 'is-active' : ''} onClick={() => openTab('budget')}><Calculator size={21} /></button>
    <button title="Normativa" className={ui.inspectorTab === 'cte' ? 'is-active' : ''} onClick={() => openTab('cte')}><FileCheck2 size={21} /></button>
    <i />
    <button title="Regla de medición" className={ui.measuring ? 'is-active' : ''} aria-pressed={ui.measuring} onClick={() => actions.setUi({ measuring: !ui.measuring, pieceMode: false })}><Ruler size={21} /></button>
  </nav>;
}

function StatusBar({ catalogOpen, inspectorOpen, onCatalogToggle, onInspectorToggle }: PanelControls) {
  const { project, ui, actions } = useEditor();
  return <footer className="statusbar">
    <p>Unidades <strong>mm</strong></p><i /><p>Plano <strong>1:{project.section.scale}</strong></p><i />
    <button onClick={() => actions.setUi({ snapping: !ui.snapping })}>Ajuste <strong className={ui.snapping ? 'is-on' : ''}>{ui.snapping ? '50 mm · 5°' : 'Libre'}</strong></button>
    <span /><p className="statusbar__project">{project.entities.length} objetos · {ui.selectedIds.length} seleccionados</p>
    <button title="Mostrar u ocultar materiales" aria-label="Mostrar u ocultar materiales" aria-pressed={catalogOpen} onClick={onCatalogToggle}><PanelLeft size={16} /></button>
    <button title="Mostrar u ocultar plano 2D" aria-label="Mostrar u ocultar plano 2D" aria-pressed={project.section.open} onClick={() => actions.updateSection({ open: !project.section.open, expanded: false })}><PanelBottom size={16} /></button>
    <button title="Mostrar u ocultar propiedades" aria-label="Mostrar u ocultar propiedades" aria-pressed={inspectorOpen} onClick={onInspectorToggle}><PanelRight size={16} /></button><i />
    <button title="Modo pieza" aria-pressed={ui.pieceMode} onClick={() => actions.setUi({ pieceMode: !ui.pieceMode })}><Grid2X2 size={16} /></button>
    <button title="Ajuste de posición y giro" aria-pressed={ui.snapping} onClick={() => actions.setUi({ snapping: !ui.snapping })}><Magnet size={16} /></button>
  </footer>;
}

export function ConstructoProApp() {
  const { hydrated, ui } = useEditor();
  const [catalogOpen, setCatalogOpen] = useState(() => window.innerWidth >= 760);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth >= 760);
  const qaMode = new URLSearchParams(window.location.search).get('qa');
  const toggleCatalog = () => setCatalogOpen((open) => !open);
  const toggleInspector = () => setInspectorOpen((open) => !open);
  return <div className={`constructopro-app ${qaMode ? 'is-qa' : ''}`}>
    <TopBar />
    <div className={`cad-workspace ${catalogOpen ? '' : 'is-catalog-hidden'} ${inspectorOpen ? '' : 'is-inspector-hidden'}`}>
      <WorkspaceRail catalogOpen={catalogOpen} onCatalogToggle={toggleCatalog} onInspectorOpen={() => setInspectorOpen(true)} />
      <CatalogPanel />
      <main className="design-stage">
        <div className="model-stage"><Suspense fallback={<div className="viewport-loading">Iniciando motor 3D…</div>}><ThreeViewport /></Suspense></div>
        <Section2D />
      </main>
      <InspectorPanel />
    </div>
    <StatusBar catalogOpen={catalogOpen} inspectorOpen={inspectorOpen} onCatalogToggle={toggleCatalog} onInspectorToggle={toggleInspector} />
    {qaMode === 'reference' && hydrated && <QaReferenceBoard />}
    {qaMode === 'performance' && hydrated && <div className="performance-route-badge"><strong>QA 12×12 m</strong><span>Escena temporal · no se guarda</span></div>}
    {!hydrated && <div className="boot-screen"><div className="brand-mark brand-mark--large"><span /><i /></div><strong>DETALLES TÉCNICOS</strong><p>Recuperando el estudio local…</p><span className="boot-line" /></div>}
    {ui.toast && <div className="toast"><span />{ui.toast}</div>}
  </div>;
}
