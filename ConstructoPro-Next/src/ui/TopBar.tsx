import { useRef, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileDown,
  FilePlus2,
  FolderOpen,
  MapPin,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { DETAIL_LABELS, type ProjectContextData } from '../domain/types';
import { captureSectionPng, captureViewportPng } from '../geometry/viewportCapture';
import { evaluateProject } from '../rules/cte';
import {
  CTE_CLIMATE_SOURCE,
  CTE_DB_HE_URL,
  CTE_PROVINCES,
  resolveCteClimateZone,
} from '../rules/climateZone';
import { useEditor } from '../state/EditorStore';
import { downloadProject, readProjectFile } from '../state/persistence';

function ContextModal({ onClose }: { onClose: () => void }) {
  const { project, actions } = useEditor();
  const [draft, setDraft] = useState<ProjectContextData>(project.context);
  const field = <K extends keyof ProjectContextData>(key: K, value: ProjectContextData[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateLocation = (patch: Partial<Pick<ProjectContextData, 'province' | 'altitudeM'>>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      const resolution = resolveCteClimateZone(next.province, next.altitudeM);
      return {
        ...next,
        climateZone: resolution?.zone ?? '',
        climateZoneSource: resolution ? 'cte-anejob' : 'unresolved',
      };
    });
  };
  const climate = resolveCteClimateZone(draft.province, draft.altitudeM);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="context-modal" onSubmit={(event) => { event.preventDefault(); actions.updateContext(draft); onClose(); }}>
      <header><div><small>CONTEXTO NORMATIVO</small><h2>Localización y condiciones</h2><p>Entradas auditables para los paquetes didácticos CTE.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></header>
      <div className="form-grid">
        <label><span>Municipio</span><input value={draft.municipality} onChange={(event) => field('municipality', event.target.value)} /></label>
        <label><span>Provincia CTE</span><select value={draft.province} onChange={(event) => updateLocation({ province: event.target.value })}>{CTE_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></label>
        <label><span>Altitud del emplazamiento</span><div className="input-unit"><input type="number" min="0" step="1" value={draft.altitudeM ?? ''} onChange={(event) => updateLocation({ altitudeM: event.target.value === '' ? null : Number(event.target.value) })} /><i>m</i></div></label>
        <label className="climate-result"><span>Zona climática calculada</span><input readOnly value={draft.climateZone || 'Pendiente'} /><small className={climate ? 'is-resolved' : ''}>{climate ? 'Calculada con provincia + altitud' : 'Introduce una altitud válida'}</small></label>
        <label><span>Uso</span><select value={draft.use} onChange={(event) => field('use', event.target.value as ProjectContextData['use'])}><option>Residencial</option><option>Docente</option><option>Terciario</option></select></label>
        <label><span>Exposición</span><select value={draft.exposure} onChange={(event) => field('exposure', event.target.value as ProjectContextData['exposure'])}><option>Protegida</option><option>Normal</option><option>Expuesta</option></select></label>
        <label><span>Orientación</span><select value={draft.orientation} onChange={(event) => field('orientation', event.target.value as ProjectContextData['orientation'])}>{['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Temperatura interior</span><div className="input-unit"><input type="number" value={draft.interiorTemperatureC} onChange={(event) => field('interiorTemperatureC', Number(event.target.value))} /><i>°C</i></div></label>
        <label><span>Temperatura exterior</span><div className="input-unit"><input type="number" value={draft.exteriorTemperatureC} onChange={(event) => field('exteriorTemperatureC', Number(event.target.value))} /><i>°C</i></div></label>
        <label><span>Humedad interior</span><div className="input-unit"><input type="number" min="0" max="100" value={draft.interiorHumidityPct} onChange={(event) => field('interiorHumidityPct', Number(event.target.value))} /><i>%</i></div></label>
        <label><span>Humedad exterior</span><div className="input-unit"><input type="number" min="0" max="100" value={draft.exteriorHumidityPct} onChange={(event) => field('exteriorHumidityPct', Number(event.target.value))} /><i>%</i></div></label>
      </div>
      <a className="context-source" href={CTE_DB_HE_URL} target="_blank" rel="noreferrer"><BookOpenCheck size={17} /><p><strong>{CTE_CLIMATE_SOURCE}</strong><span>La zona se obtiene de provincia y altitud; nunca del nombre del municipio por sí solo.</span></p></a>
      <footer><button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={!climate}><Check size={16} /> Aplicar contexto</button></footer>
    </form>
  </div>;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><article className="help-modal"><header><div><small>FLUJO DE TRABAJO</small><h2>Construye elemento por elemento</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header><div className="help-grid"><section><b>1</b><div><strong>Filtra el detalle</strong><p>El sistema elegido solo filtra catálogo, herramientas y reglas.</p></div></section><section><b>2</b><div><strong>Coloca productos</strong><p>La previsualización fantasma se fija libremente sobre el plano de trabajo.</p></div></section><section><b>3</b><div><strong>Extiende el paño</strong><p>Se recalculan piezas, mortero, juntas, solapes y cortes sin estirar productos.</p></div></section><section><b>4</b><div><strong>Resuelve encuentros</strong><p>El hueco regenera lo atravesado; el alumno añade remates y sellados.</p></div></section></div><div className="shortcut-table"><span><kbd>W</kbd>Mover</span><span><kbd>E</kbd>Rotar</span><span><kbd>Ctrl Z</kbd>Deshacer</span><span><kbd>Ctrl D</kbd>Duplicar</span><span><kbd>Supr</kbd>Eliminar</span><span><kbd>Esc</kbd>Cancelar</span></div><footer><button className="button button--primary" onClick={onClose}>Entendido</button></footer></article></div>;
}

export function TopBar() {
  const { project, saveState, ui, actions, past, future, qaMode } = useEditor();
  const [contextOpen, setContextOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const importFile = async (file?: File) => {
    if (!file) return;
    try { actions.importProject(await readProjectFile(file)); }
    catch (error) { actions.setUi({ toast: error instanceof Error ? error.message : 'No se pudo importar el proyecto.' }); }
    if (importRef.current) importRef.current.value = '';
  };
  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const { exportTechnicalPdf } = await import('../export/reportPdf');
      await exportTechnicalPdf(project, evaluateProject(project), captureViewportPng(), captureSectionPng(project));
      actions.setUi({ toast: 'Memoria PDF generada' });
    } catch (error) {
      actions.setUi({ toast: error instanceof Error ? error.message : 'No se pudo generar el PDF.' });
    } finally { setPdfBusy(false); }
  };

  const menuAction = (action: () => void) => { setMenuOpen(false); action(); };
  return <header className="topbar">
    <div className="brand"><div className="brand-mark"><span /><i /></div><strong>Detalles Técnicos</strong></div>
    <div className="topbar-divider" />
    <select aria-label="Sistema constructivo" className="detail-selector" value={project.detailType} onChange={(event) => actions.updateProjectMeta({ detailType: event.target.value as typeof project.detailType })}>{Object.entries(DETAIL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="detail-chevron" size={14} />
    <button className="detail-example-button" onClick={() => actions.loadDetailExample(project.detailType)} title="Cargar composición de ejemplo. Puedes deshacer para recuperar la anterior."><BookOpenCheck size={16} /><span>Cargar ejemplo</span></button>
    <div className="history-controls"><button disabled={!past.length} onClick={actions.undo} title="Deshacer"><Undo2 size={20} /></button><button disabled={!future.length} onClick={actions.redo} title="Rehacer"><Redo2 size={20} /></button></div>
    <div className={`save-indicator save-indicator--${saveState}`} title={qaMode ? 'Vista temporal. Exporta el proyecto para conservar una copia.' : 'Guardado local en este navegador'}><Save size={15} /><span>{qaMode ? 'Ejemplo temporal' : saveState === 'saving' ? 'Guardando…' : saveState === 'error' ? 'Error local' : saveState === 'loading' ? 'Recuperando…' : 'Guardado'}</span></div>
    <button className="clear-detail" disabled={!project.entities.length} onClick={() => actions.clearScene(false)}><Trash2 size={17} /><span>Vaciar detalle</span></button>
    <div className="settings-wrap"><button className={`settings-button ${menuOpen ? 'is-active' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Configuración"><Settings size={20} /></button>{menuOpen && <div className="settings-menu">
      <label className="settings-project-name"><span>Nombre del proyecto</span><input value={project.title} onChange={(event) => actions.updateProjectMeta({ title: event.target.value })} /></label>
      <button onClick={() => menuAction(() => actions.newProject(false))}><FilePlus2 size={16} /><span><strong>Proyecto vacío</strong><small>Empezar desde cero</small></span></button>
      <button onClick={() => menuAction(() => actions.loadDetailExample(project.detailType))}><RotateCcw size={16} /><span><strong>Cargar ejemplo del sistema</strong><small>{DETAIL_LABELS[project.detailType]} · acción reversible</small></span></button>
      <button onClick={() => menuAction(() => setContextOpen(true))}><MapPin size={16} /><span><strong>Contexto CTE</strong><small>{project.context.province} · {project.context.altitudeM ?? '—'} m · zona {project.context.climateZone || 'pendiente'}</small></span></button>
      <button onClick={() => importRef.current?.click()}><Upload size={16} /><span><strong>Importar proyecto</strong><small>.constructopro</small></span></button>
      <button onClick={() => menuAction(() => downloadProject(project))}><Download size={16} /><span><strong>Exportar proyecto</strong><small>Documento nativo</small></span></button>
      <button disabled={pdfBusy} onClick={() => menuAction(() => { void exportPdf(); })}><FileDown size={16} /><span><strong>{pdfBusy ? 'Generando…' : 'Memoria PDF'}</strong><small>Vistas, fuentes y avisos</small></span></button>
      <label className="settings-quality"><span>Calidad visual</span><select value={ui.quality} onChange={(event) => actions.setUi({ quality: event.target.value as typeof ui.quality })}><option value="performance">Rendimiento</option><option value="balanced">Equilibrada</option><option value="high">Alta</option></select></label>
      <button onClick={() => menuAction(() => setHelpOpen(true))}><CircleHelp size={16} /><span><strong>Ayuda y atajos</strong><small>Guía rápida</small></span></button>
    </div>}</div>
    <input ref={importRef} hidden type="file" accept=".constructopro,application/json" onChange={(event) => { void importFile(event.target.files?.[0]); }} />
    {contextOpen && <ContextModal onClose={() => setContextOpen(false)} />}{helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
  </header>;
}
