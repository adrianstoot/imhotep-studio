import React, { useState } from 'react';
import { ClipboardList, ListTree, ChevronUp, ChevronDown, Trash2, CheckCircle, XCircle, AlertTriangle, Layers, Flame, Thermometer, Droplets, Shield, Weight, TrendingDown, Edit3, AlertCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { CONSTRUCTION_SYSTEMS } from '../utils/config';
import { CarbonPanel } from './CarbonPanel';

export const SidebarRight: React.FC = () => {
  const { layers, activeSystem, selectedId, selectLayer, moveLayer, removeLayer, isCertified, uValue, mass, updateLayerThickness, normativeErrors, normativeScore, area, setArea } = useAppContext();
  const sys = CONSTRUCTION_SYSTEMS[activeSystem];
  const reqLayers = sys?.requiredLayers || [];
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasInsulation = layers.some(l => l.type === 'Aislante Térmico');
  const hasStructure = layers.some(l => l.type === 'Hoja Principal' || l.type === 'Fábrica');
  const hasWaterproof = layers.some(l => l.type === 'Barrera de Agua' || l.type === 'Revestimiento');
  const uValueOk = uValue > 0 && uValue < 0.4;
  const massOk = mass > 150;
  const allowedTypes = sys?.allowedTypes || [];
  const incompatibleLayers = layers.filter(l => !allowedTypes.includes(l.type) && l.type !== 'Cámara de Aire');
  const isFacade = activeSystem === 'SATE' || activeSystem === 'VENTILADA' || activeSystem === 'TRADICIONAL';

  const totalThickMM = layers.reduce((a, l) => a + (parseInt(l.EspesorRaw) || l.EspesorVirtualMM), 0);
  const rTotal = layers.length > 0 ? (0.17 + layers.reduce((a, l) => a + (l.lambda > 0 ? (l.EspesorVirtualMM / 1000) / l.lambda : 0), 0)) : 0;

  const getEnergyRating = () => {
    if (layers.length === 0) return { label: '--', color: '#64748b', bg: '#0f172a' };
    if (uValue <= 0.15) return { label: 'A', color: '#16a34a', bg: '#052e16' };
    if (uValue <= 0.25) return { label: 'B', color: '#22c55e', bg: '#052e16' };
    if (uValue <= 0.35) return { label: 'C', color: '#84cc16', bg: '#1a2e05' };
    if (uValue <= 0.50) return { label: 'D', color: '#eab308', bg: '#2e2505' };
    if (uValue <= 0.70) return { label: 'E', color: '#f97316', bg: '#2e1505' };
    if (uValue <= 1.00) return { label: 'F', color: '#ef4444', bg: '#2e0505' };
    return { label: 'G', color: '#dc2626', bg: '#2e0505' };
  };
  const rating = getEnergyRating();
  const condensationRisk = uValue > 0.6 && hasInsulation;

  const systemComplies = isFacade
    ? isCertified && hasInsulation && hasStructure && uValueOk && incompatibleLayers.length === 0
    : isCertified && hasStructure && incompatibleLayers.length === 0;

  return (
    <motion.aside 
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[380px] flex flex-col overflow-hidden shrink-0 z-20 border-l border-slate-700/50 shadow-[-10px_0_40px_rgba(0,0,0,0.6),inset_1px_0_0_rgba(255,255,255,0.05)] bg-slate-900/90 backdrop-blur-2xl relative"
    >
      <div className="absolute inset-0 pointer-events-none border-l border-white/5" />
      
      {/* ═══════════ NORMATIVE GUIDE ═══════════ */}
      <div id="tour-normative" className="border-b border-slate-800/80 bg-slate-900/10">
        <div className="p-4 pb-3 flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center">
            <ClipboardList className="w-4 h-4 mr-2 text-purple-500" /> Guía Normativa
          </h2>
          <div className="flex items-center gap-2">
            {layers.length > 0 && (
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                normativeScore >= 80 ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50' :
                normativeScore >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50' :
                'bg-red-900/30 text-red-400 border-red-700/50'
              }`}>
                {normativeScore}%
              </span>
            )}
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${
              layers.length === 0 ? 'bg-slate-800 text-slate-400 border-slate-700' :
              systemComplies ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50' :
              'bg-amber-900/30 text-amber-400 border-amber-700/50'
            }`}>
              {layers.length === 0 ? 'Esperando' : systemComplies ? '✓ Correcto' : '⚠ Revisar'}
            </span>
          </div>
        </div>

        {/* Norm reference */}
        {sys?.normRef && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 text-[8px] text-slate-500">
              <BookOpen className="w-3 h-3 shrink-0" />
              <span className="font-bold">{sys.normRef}</span>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 space-y-1.5 mt-1">
          {reqLayers.map((reqType, idx) => {
            const L = layers[idx];
            const isCorrect = L && L.type === reqType;
            const isWrong = L && L.type !== reqType;
            return (
              <div key={`guide-${idx}`} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                isCorrect ? 'bg-emerald-900/10 border-emerald-700/30' :
                isWrong ? 'bg-red-900/10 border-red-700/30' :
                'bg-slate-800/30 border-slate-700/30'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border ${
                  isCorrect ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                  isWrong ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                  'bg-slate-700/30 border-slate-600/30 text-slate-500'
                }`}>{isCorrect ? '✓' : idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold text-[10px] uppercase tracking-wider truncate ${isCorrect ? 'text-emerald-400' : isWrong ? 'text-red-400' : 'text-slate-400'}`}>{reqType}</span>
                    {idx === 0 && <span className="text-[8px] font-bold bg-blue-900/30 px-1.5 py-px rounded text-blue-400 border border-blue-500/20">EXT</span>}
                    {idx === reqLayers.length - 1 && <span className="text-[8px] font-bold bg-purple-900/30 px-1.5 py-px rounded text-purple-400 border border-purple-500/20">INT</span>}
                  </div>
                  {isWrong && <span className="text-[9px] font-medium text-red-300 block mt-0.5 truncate">⚠ Hay: {L.type}</span>}
                  {isCorrect && L && <span className="text-[10px] font-bold text-emerald-200/80 block truncate mt-0.5">{L.Nombre}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Normative Errors */}
        {normativeErrors.length > 0 && layers.length > 0 && (
          <div className="px-4 pb-3">
            <div className="bg-red-950/30 border border-red-800/30 rounded-lg p-2.5 space-y-1">
              {normativeErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[9px] text-red-300">
                  <AlertCircle className="w-3 h-3 shrink-0 text-red-400 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ ENERGY EFFICIENCY & METRICS ═══════════ */}
      <div id="tour-metrics" className="border-b border-slate-800/80 p-4 bg-slate-900/10">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center">
            <Flame className="w-4 h-4 mr-2" /> Eficiencia Energética
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase">Área:</span>
            <div className="relative group">
              <input 
                type="number" 
                min="1" 
                value={area}
                onChange={(e) => setArea(parseFloat(e.target.value) || 1)}
                className="w-14 bg-slate-800 border border-slate-700 text-white text-[10px] font-mono font-bold rounded px-1.5 py-0.5 text-right focus:outline-none focus:border-blue-500 transition-colors"
                title="Superficie de cálculo para el presupuesto"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity m²">m²</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-3xl border-2 shrink-0 shadow-lg" style={{ backgroundColor: rating.bg, color: rating.color, borderColor: `${rating.color}40`, textShadow: `0 0 12px ${rating.color}40` }}>
            <span translate="no">{rating.label}</span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/40">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="text-[9px] font-bold text-slate-400 uppercase">U:</span>
              <span className={`text-[11px] font-black font-mono ${uValueOk ? 'text-emerald-400' : layers.length > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {layers.length > 0 ? uValue.toFixed(2) : '--'}
              </span>
              <span className="text-[8px] font-medium text-slate-500 hidden sm:inline">W/m²K</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[9px] font-bold text-slate-400 uppercase">R:</span>
              <span className="text-[11px] font-black font-mono text-blue-300">{layers.length > 0 ? rTotal.toFixed(2) : '--'}</span>
              <span className="text-[8px] font-medium text-slate-500 hidden sm:inline">m²K/W</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Weight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[9px] font-bold text-slate-400 uppercase">Masa:</span>
              <span className={`text-[11px] font-black font-mono ${massOk ? 'text-emerald-400' : 'text-slate-400'}`}>{Math.round(mass)}</span>
              <span className="text-[8px] font-medium text-slate-500 hidden sm:inline">kg/m²</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span translate="no" className="text-[9px] font-bold text-slate-400 uppercase">ESP:</span>
              <span className="text-[11px] font-black font-mono text-slate-300">{totalThickMM}</span>
              <span className="text-[8px] font-medium text-slate-500 hidden sm:inline">mm</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-900/40 rounded-lg p-3 border border-slate-700/40">
          <div className={`flex items-center gap-1.5 text-[9px] font-bold tracking-wide ${hasInsulation ? 'text-emerald-400' : 'text-red-400'}`}>
            {hasInsulation ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            <span>HE: Aisl. {hasInsulation ? '✓' : 'falta'}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[9px] font-bold tracking-wide ${uValueOk ? 'text-emerald-400' : layers.length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
            {uValueOk ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            <span>HE: U {uValueOk ? '<0.40 ✓' : '>0.40 ⚠'}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[9px] font-bold tracking-wide ${hasWaterproof ? 'text-emerald-400' : 'text-red-400'}`}>
            {hasWaterproof ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            <span>HS: Agua {hasWaterproof ? '✓' : 'falta'}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-[9px] font-bold tracking-wide ${hasStructure ? 'text-emerald-400' : 'text-red-400'}`}>
            {hasStructure ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            <span>SE: Por. {hasStructure ? '✓' : 'falta'}</span>
          </div>
          {condensationRisk && (
            <div className="col-span-2 flex items-center gap-1.5 text-[9px] font-bold tracking-wide text-cyan-400 mt-0.5">
              <Droplets className="w-3.5 h-3.5 shrink-0" /><span>Riesgo de condensaciones intersticiales</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ INSTALLED LAYERS ═══════════ */}
      <div id="tour-layers-list" className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 shadow-md relative z-10">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center">
            <ListTree className="w-4 h-4 mr-2 text-orange-500" /> Capas Instaladas <span className="ml-2 bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-md text-[9px]">{layers.length}</span>
          </h2>
          <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-md border border-slate-700 shadow-inner">EXT ↓ INT</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
          <AnimatePresence>
            {layers.map((layer, index) => {
              const sel = layer.instanceId === selectedId;
              const isAir = layer.type === 'Cámara de Aire';
              return (
                <motion.div 
                  key={layer.instanceId}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => selectLayer(layer.instanceId)}
                  className={`flex flex-col rounded-xl border cursor-pointer transition-all overflow-hidden group ${
                    sel ? 'bg-slate-800/80 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.01]' :
                    isAir ? 'bg-cyan-900/10 border-cyan-800/30 hover:border-cyan-600/50 hover:bg-cyan-900/20' :
                    'bg-slate-800/40 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-stretch h-16">
                    <div className="w-6 shrink-0 flex flex-col text-slate-500 bg-black/30 border-r border-slate-700/30 justify-center items-center">
                      <button className={`hover:text-white p-1 hover:bg-slate-800 rounded transition-colors ${index === 0 ? 'opacity-20 pointer-events-none' : ''}`} onClick={(e) => { e.stopPropagation(); moveLayer(layer.instanceId, -1); }}><ChevronUp className="w-4 h-4" /></button>
                      <button className={`hover:text-white p-1 hover:bg-slate-800 rounded transition-colors ${index === layers.length - 1 ? 'opacity-20 pointer-events-none' : ''}`} onClick={(e) => { e.stopPropagation(); moveLayer(layer.instanceId, 1); }}><ChevronDown className="w-4 h-4" /></button>
                    </div>

                    <div className="w-16 shrink-0 relative flex items-center justify-center bg-slate-900/50 border-r border-slate-700/30 overflow-hidden">
                      {(layer as any).image && !(layer as any).image.endsWith('.svg') && !isAir ? (
                        <>
                          <img 
                            src={(() => { const base = (import.meta as any).env?.BASE_URL || '/constructopro-v12/'; const imgPath = (layer as any).image as string; return imgPath.startsWith('/') ? base.replace(/\/$/, '') + imgPath : imgPath; })()}
                            className="absolute inset-0 w-full h-full object-cover filter saturate-50 group-hover:saturate-100 transition-all duration-300 transform group-hover:scale-105" 
                            alt="" 
                          />
                          <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundColor: layer.color }} />
                          <div className="absolute inset-0 opacity-30 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none bg-[#0f172a]" />
                        </>
                      ) : (
                        <div className="w-8 h-8 rounded border flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative z-10" style={{ backgroundColor: isAir ? 'rgba(120,200,255,0.15)' : `${layer.color}25`, borderColor: isAir ? 'rgba(120,200,255,0.4)' : `${layer.color}60` }}>
                          <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: isAir ? 'rgba(120,200,255,0.6)' : layer.color }}></div>
                        </div>
                      )}
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] z-10" style={{ backgroundColor: layer.color, boxShadow: `0 0 10px ${layer.color}` }} />
                    </div>

                    <div className="flex-1 min-w-0 p-3 py-2 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-950/80 border shadow-sm" style={{ color: layer.color, borderColor: `${layer.color}40` }}>
                          {layer.type}
                        </span>
                        {index === 0 && <span className="text-[7px] font-bold bg-blue-900/30 text-blue-400 px-1 py-px rounded border border-blue-500/20">EXT</span>}
                        {index === layers.length - 1 && <span className="text-[7px] font-bold bg-purple-900/30 text-purple-400 px-1 py-px rounded border border-purple-500/20">INT</span>}
                        
                        <div className="flex items-center gap-1 group/edit ml-auto shrink-0 relative z-10">
                          {editingId === layer.instanceId ? (
                            <input 
                              type="number" 
                              min="1" max="500" 
                              defaultValue={layer.EspesorVirtualMM}
                              onBlur={(e) => { updateLayerThickness(layer.instanceId, parseInt(e.target.value) || 30); setEditingId(null); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { updateLayerThickness(layer.instanceId, parseInt((e.target as HTMLInputElement).value) || 30); setEditingId(null); } }}
                              autoFocus
                              className="w-14 text-xs font-black bg-slate-950 text-white rounded px-2 py-0.5 border border-blue-500 focus:outline-none font-mono text-right shadow-inner"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              className={`text-xs font-black font-mono px-2 py-1 rounded cursor-pointer transition-all flex items-center ${sel ? 'text-blue-300 hover:bg-blue-900/40 border border-transparent hover:border-blue-500/30' : 'text-slate-300 hover:bg-slate-700 border border-transparent hover:border-slate-500/30'}`} 
                              onClick={(e) => { e.stopPropagation(); setEditingId(layer.instanceId); }}
                              title="Haz clic para editar el espesor"
                            >
                              {layer.EspesorRaw} <Edit3 className="w-3 h-3 ml-1.5 opacity-0 group-hover/edit:opacity-100 transition-opacity text-slate-400" />
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs font-black leading-tight pr-2 truncate ${sel ? 'text-white' : 'text-slate-200'}`} title={layer.Nombre}>{layer.Nombre}</p>
                    </div>

                    <button 
                      className="w-12 shrink-0 text-slate-500 hover:text-red-400 hover:bg-red-500/15 flex items-center justify-center transition-colors border-l border-slate-700/30 relative z-10" 
                      onClick={(e) => { e.stopPropagation(); removeLayer(layer.instanceId); }}
                      title="Eliminar capa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};
