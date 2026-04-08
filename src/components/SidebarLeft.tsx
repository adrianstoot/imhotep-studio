import React, { useState } from 'react';
import { Search, Plus, Layers, SwatchBook, GitBranch, Box, BrickWall, Square, Droplets, Home, Hammer, Wrench, Zap, Shield, Weight, Wind, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { CONSTRUCTION_SYSTEMS } from '../utils/config';
import { CustomMaterialModal } from './CustomMaterialModal';

const IconMap: Record<string, any> = { Layers, Box, BrickWall, Square, Droplets, Home, Hammer, Wrench };

const TYPE_ACCENTS: Record<string, { glow: string; bg: string; text: string }> = {
  'Aislante Térmico': { glow: '#facc15', bg: 'rgba(250,204,21,0.12)', text: '#fde68a' },
  'Hoja Principal':   { glow: '#ef4444', bg: 'rgba(239,68,68,0.12)',  text: '#fca5a5' },
  'Acabado Interior': { glow: '#a78bfa', bg: 'rgba(167,139,250,0.12)', text: '#c4b5fd' },
  'Barrera de Agua':  { glow: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  text: '#7dd3fc' },
  'Cubierta':         { glow: '#f97316', bg: 'rgba(249,115,22,0.12)',  text: '#fdba74' },
  'Revestimiento':    { glow: '#94a3b8', bg: 'rgba(148,163,184,0.12)', text: '#cbd5e1' },
  'Mortero Técnico':  { glow: '#64748b', bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
  'Pavimento':        { glow: '#78716c', bg: 'rgba(120,113,108,0.12)', text: '#a8a29e' },
};

const DEFAULT_ACCENT = { glow: '#475569', bg: 'rgba(71,85,105,0.12)', text: '#94a3b8' };

export const SidebarLeft: React.FC = () => {
  const { catalog, activeSystem, setSystem, searchTerm, setSearchTerm, addLayer, addAirChamber } = useAppContext();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);

  const sys = CONSTRUCTION_SYSTEMS[activeSystem];

  const groups = catalog.reduce((acc, mat) => {
    const isVerticalSystem = sys?.orientation === 'vertical';
    const isHorizontalSystem = sys?.orientation === 'horizontal';
    const matOrientation = mat.orientationType || 'ambos';
    
    // Filtrado de incompatibles por orientación:
    if (isVerticalSystem && matOrientation === 'horizontal') return acc;
    if (isHorizontalSystem && matOrientation === 'vertical') return acc;

    if (!acc[mat.Categoria]) acc[mat.Categoria] = [];
    acc[mat.Categoria].push(mat);
    return acc;
  }, {} as Record<string, typeof catalog>);

  const toggleGroup = (cat: string) => {
    setExpandedGroups(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <>
    <motion.aside 
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[300px] flex flex-col z-20 border-r border-slate-700/50 shadow-[10px_0_40px_rgba(0,0,0,0.6),inset_-1px_0_0_rgba(255,255,255,0.05)] bg-slate-900/90 backdrop-blur-2xl relative"
    >
      <div className="absolute inset-0 pointer-events-none border-r border-white/5" />

      {/* System Selector */}
      <div className="p-4 pb-3 border-b border-slate-800/60">
        <label className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center">
          <GitBranch className="w-3.5 h-3.5 mr-1.5" /> 1. Tipo de Cerramiento
        </label>
        <div className="relative">
          <select 
            value={activeSystem}
            onChange={(e) => setSystem(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 appearance-none focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            {Object.entries(CONSTRUCTION_SYSTEMS).map(([k, s]) => (
              <option key={k} value={k}>{s.name}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <p className="text-[9px] text-slate-500 mt-1.5">{sys?.description}</p>
      </div>

      {/* Catalog Header + Air Chamber */}
      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-orange-500 flex items-center">
          <SwatchBook className="w-3.5 h-3.5 mr-1.5" /> 2. Catálogo {sys?.orientation === 'vertical' ? '(Vertical)' : '(Horizontal)'}
        </h2>
        <div className="flex gap-1.5">
          <button 
            onClick={() => addAirChamber()}
            className="bg-cyan-600/15 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all flex items-center"
            title="Añadir cámara de aire"
          >
            <Wind className="w-3 h-3 mr-1" /> Aire
          </button>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all flex items-center"
          >
            <Plus className="w-3 h-3 mr-1" /> Nuevo
          </button>
        </div>
      </div>

      {/* Search + Cards */}
      <div className="flex-1 overflow-y-auto custom-scroll p-2.5 flex flex-col">
        <div className="mb-3 relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-xs py-1.5 pl-8 pr-3 focus:outline-none focus:border-orange-500 transition-all text-slate-300 placeholder-slate-600" 
            placeholder="Buscar material..." 
            type="text"
          />
        </div>

        {/* Orientation filter banner */}
        <div className="mb-3 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-blue-400" />
            <span className="text-[8px] font-bold text-blue-300 uppercase tracking-tighter">Filtro ETSIE Activo: {sys?.orientation}</span>
          </div>
          <div className="flex items-center gap-1 text-[7px] text-slate-500 italic">
            <span>Automático</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {Object.entries(groups).map(([cat, items]) => {
            const filtered = (items as typeof catalog).filter(i => 
              i.Nombre.toLowerCase().includes(searchTerm) || i.Empresa.toLowerCase().includes(searchTerm)
            );
            if (!filtered.length) return null;

            const isExpanded = expandedGroups[cat] === true;

            return (
              <div key={cat} className="mb-1">
                {/* Category Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer group px-2.5 py-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/20 hover:border-slate-600/40 transition-all select-none"
                  onClick={() => toggleGroup(cat)}
                >
                  <h3 className="text-[9px] font-bold uppercase tracking-widest flex items-center text-slate-300 group-hover:text-white transition-colors">
                    <ChevronRight className={`w-3.5 h-3.5 mr-1.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-orange-400' : 'text-slate-500'}`} />
                    {cat}
                  </h3>
                  <span className="text-[8px] text-slate-400 bg-slate-900/50 px-1.5 py-0.5 rounded-full border border-slate-700/30 font-bold">{filtered.length}</span>
                </div>

                {/* Cards — only when expanded */}
                {isExpanded && (
                  <div className="space-y-2 pt-2">
                    {filtered.map(mat => {
                      const IconComponent = IconMap[mat.icon] || Box;
                      const accent = TYPE_ACCENTS[mat.type] || DEFAULT_ACCENT;
                      const rVal = ((parseInt(mat.EspesorRaw) || 10) / 1000 / (mat.lambda || 1)).toFixed(2);

                      return (
                        <div 
                          key={mat.id}
                          onClick={() => addLayer(mat.id)}
                          className="cyberpunk-card group cursor-pointer relative overflow-hidden"
                          style={{ '--accent-color': accent.glow, '--accent-bg': accent.bg } as React.CSSProperties}
                        >
                          {/* Left glow bar */}
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] glow-bar" style={{ backgroundColor: accent.glow, boxShadow: `0 0 10px ${accent.glow}` }} />

                          <div className="flex">
                            {/* Material Texture Thumbnail */}
                            <div 
                              className="w-14 shrink-0 relative overflow-hidden flex items-center justify-center rounded-l-[9px]"
                              style={{ borderRight: `1px solid ${accent.glow}30` }}
                            >
                              {(mat as any).image && !(mat as any).image.endsWith('.svg') ? (
                                <>
                                  <img 
                                    src={(() => { const base = (import.meta as any).env?.BASE_URL || '/'; const imgPath = (mat as any).image as string; return imgPath.startsWith('/') ? base.replace(/\/$/, '') + imgPath : imgPath; })()}
                                    className="absolute inset-0 w-full h-full object-cover filter saturate-50 group-hover:saturate-100 transition-all duration-500 scale-100 group-hover:scale-110" 
                                    alt={mat.type}
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 transition-opacity duration-500 opacity-40 group-hover:opacity-0 mix-blend-multiply" style={{ backgroundColor: accent.glow }} />
                                  <div className="absolute inset-0 transition-opacity duration-500 opacity-30 group-hover:opacity-0" style={{ backgroundColor: '#0f172a' }} />
                                </>
                              ) : (
                                <>
                                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent.glow}25 0%, ${accent.glow}08 100%)` }} />
                                  <IconComponent className="w-5 h-5 relative z-10" style={{ color: accent.glow, opacity: 0.7 }} />
                                </>
                              )}
                            </div>

                            <div className="p-2.5 pl-3 flex-1 min-w-0">
                              {/* Type + thickness */}
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[7px] font-bold uppercase tracking-widest px-1.5 py-px rounded-sm border" style={{ color: accent.text, borderColor: `${accent.glow}25`, backgroundColor: accent.bg }}>
                                  {mat.type}
                                </span>
                                <span className="text-[8px] font-mono text-slate-500">{mat.EspesorRaw}</span>
                              </div>

                              {/* Name */}
                              <h4 className="text-[11px] font-extrabold text-slate-100 group-hover:text-white leading-tight mb-1 truncate" title={mat.Nombre}>
                                {mat.Nombre}
                              </h4>

                              {/* Properties + Price */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-0.5" title="λ">
                                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                                    <span className="text-[8px] font-mono font-bold text-amber-300">{mat.lambda > 0 ? mat.lambda.toFixed(2) : '--'}</span>
                                  </div>
                                  <div className="flex items-center gap-0.5" title="ρ">
                                    <Weight className="w-2.5 h-2.5 text-blue-400" />
                                    <span className="text-[8px] font-mono font-bold text-blue-300">{mat.density}</span>
                                  </div>
                                  <div className="flex items-center gap-0.5" title="R">
                                    <Shield className="w-2.5 h-2.5 text-emerald-400" />
                                    <span className="text-[8px] font-mono font-bold text-emerald-300">{rVal}</span>
                                  </div>
                                </div>
                                <span className="text-[12px] font-extrabold" style={{ color: '#f59e0b' }}>
                                  {mat.PrecioNum.toFixed(0)} <span className="text-[8px] font-normal text-slate-500">€/m²</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hover add icon */}
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center">
                              <Plus className="w-3 h-3 text-emerald-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.aside>
    <CustomMaterialModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
