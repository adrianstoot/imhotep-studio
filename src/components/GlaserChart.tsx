import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Thermometer, X, AlertTriangle, CheckCircle2, Droplets, Info, BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { calculateCondensacionesDBHE } from '../utils/config';

interface GlaserChartProps {
  open: boolean;
  onClose: () => void;
}

export const GlaserChart: React.FC<GlaserChartProps> = ({ open, onClose }) => {
  const { layers } = useAppContext();

  const glaserData = useMemo(() => {
    if (layers.length === 0) return null;
    const input = layers.filter(l => l.type !== 'Cámara de Aire').map(l => ({
      name: l.Nombre.substring(0, 20),
      thicknessMM: l.EspesorVirtualMM,
      lambda: l.lambda,
      mu: (l as any).mu || 10,
    }));
    return calculateCondensacionesDBHE(input);
  }, [layers]);

  const hasCondensation = glaserData?.some(p => p.condensation) || false;

  if (!open) return null;

  // Chart config
  const W = 700, H = 280, pad = { t: 30, r: 50, b: 40, l: 55 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const renderChart = () => {
    if (!glaserData || glaserData.length < 2) return <text x={W/2} y={H/2} textAnchor="middle" fill="#64748b" fontSize="12">Añade capas para ver condensaciones</text>;

    const maxP = Math.max(...glaserData.map(p => Math.max(p.pSatVal, p.pVaporVal))) * 1.1;
    const minT = Math.min(...glaserData.map(p => p.temperature)) - 2;
    const maxT = Math.max(...glaserData.map(p => p.temperature)) + 2;
    const maxPos = Math.max(...glaserData.map(p => p.position)) || 1;

    const xScale = (pos: number) => pad.l + (pos / maxPos) * chartW;
    const yScaleP = (p: number) => pad.t + chartH - (p / maxP) * chartH;
    const yScaleT = (t: number) => pad.t + chartH - ((t - minT) / (maxT - minT)) * chartH;

    const pSatLine = glaserData.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.position)},${yScaleP(p.pSatVal)}`).join(' ');
    const pVaporLine = glaserData.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.position)},${yScaleP(p.pVaporVal)}`).join(' ');
    const tempLine = glaserData.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.position)},${yScaleT(p.temperature)}`).join(' ');

    return (
      <>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * chartH} y2={pad.t + f * chartH} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
        ))}

        {/* Condensation zones */}
        {glaserData.map((p, i) => p.condensation && i > 0 ? (
          <rect key={`cz${i}`} x={xScale(glaserData[i-1].position)} y={pad.t} width={xScale(p.position) - xScale(glaserData[i-1].position)} height={chartH} fill="rgba(239,68,68,0.08)" />
        ) : null)}

        {/* pSat line */}
        <path d={pSatLine} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        {/* pVapor line */}
        <path d={pVaporLine} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,3" strokeLinejoin="round" />
        {/* Temperature line */}
        <path d={tempLine} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,4" strokeLinejoin="round" />

        {/* Points */}
        {glaserData.map((p, i) => (
          <g key={i}>
            <circle cx={xScale(p.position)} cy={yScaleP(p.pSatVal)} r="3" fill="#3b82f6" />
            <circle cx={xScale(p.position)} cy={yScaleP(p.pVaporVal)} r="3" fill="#f59e0b" />
            {p.condensation && <circle cx={xScale(p.position)} cy={yScaleP(p.pVaporVal)} r="6" fill="none" stroke="#ef4444" strokeWidth="2" />}
          </g>
        ))}

        {/* Labels */}
        <text x={pad.l - 5} y={pad.t + chartH + 20} fontSize="8" fill="#64748b" textAnchor="start">EXT</text>
        <text x={W - pad.r + 5} y={pad.t + chartH + 20} fontSize="8" fill="#64748b" textAnchor="end">INT</text>
        <text x={pad.l - 5} y={pad.t - 10} fontSize="8" fill="#94a3b8" textAnchor="start">Presión (Pa)</text>

        {/* Legend */}
        <rect x={pad.l + 10} y={pad.t + 5} width="8" height="3" fill="#3b82f6" rx="1" />
        <text x={pad.l + 22} y={pad.t + 9} fontSize="8" fill="#93c5fd">P. Saturación</text>
        <rect x={pad.l + 100} y={pad.t + 5} width="8" height="3" fill="#f59e0b" rx="1" />
        <text x={pad.l + 112} y={pad.t + 9} fontSize="8" fill="#fcd34d">P. Vapor</text>
        <rect x={pad.l + 180} y={pad.t + 5} width="8" height="3" fill="#ef4444" rx="1" />
        <text x={pad.l + 192} y={pad.t + 9} fontSize="8" fill="#fca5a5">Temperatura</text>
      </>
    );
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-[#1e293b] border border-slate-600/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center"><Thermometer className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Condensaciones Intersticiales</h2>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest">MÉTODO UNE-EN ISO 13788 (CTE DB-HE) · ETSIE UPV (Tₑ=7°C, HR=65%)</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-900/50 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Status */}
            <div className={`rounded-xl p-3 border flex items-center gap-3 ${hasCondensation ? 'bg-red-900/20 border-red-700/30' : 'bg-emerald-900/20 border-emerald-700/30'}`}>
              {hasCondensation ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              <span className={`text-sm font-bold ${hasCondensation ? 'text-red-300' : 'text-emerald-300'}`}>
                {hasCondensation ? '⚠️ Se detectan condensaciones intersticiales. Revisa la barrera de vapor.' : '✅ No se producen condensaciones. Diseño correcto.'}
              </span>
            </div>

            {/* ═══ EDUCATIONAL GUIDE (MÉTODO CTE) ═══ */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-indigo-500/30 shadow-inner">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest">Guía Didáctica: Perfil Intersticial DB-HE</h3>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                El <strong>Análisis de Condensaciones</strong> (basado en la norma UNE-EN ISO 13788 y el CTE DB-HE) es un procedimiento gráfico-analítico utilizado en edificación para determinar el riesgo de <strong>condensaciones intersticiales</strong>. Es decir, preevalúa si el vapor de agua generado en el interior del edificio condensará dentro del propio cerramiento al atravesar las distintas capas hacia el exterior frío.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-400">Presión de Vapor (Pv)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Es la presión real que ejerce el vapor de agua presente en el aire. El vapor viaja desde las zonas de mayor presión (normalmente el interior calefactado) hacia las zonas de menor presión (el exterior). Mide la "cantidad" de vapor viajando por el muro.
                  </p>
                </div>
                
                <div className="bg-slate-900/50 p-3 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-blue-400">Presión de Saturación (Psat)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Es la presión máxima que puede soportar el aire a una temperatura dada antes de que el vapor se convierta en agua líquida. Al acercarnos al exterior (frío), la temperatura de las capas baja, y por tanto, su capacidad de albergar vapor (Psat) disminuye dramáticamente.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex items-start gap-3">
                <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>¿Cuándo hay Condensación?</strong> Si en algún punto del muro la curva de la Presión de Vapor (Pv, naranja) llega a tocar y superar la curva de la Presión de Saturación (Psat, azul), significa que el vapor no puede sostenerse en estado gaseoso y se condensa dentro del muro, creando patologías graves estructurales y moho. La curva Pv siempre debe estar por debajo de la Psat. Ubicar el aislamiento térmico por el exterior (SATE) y colocar barreras de vapor en la cara caliente ayuda a prevenir esto.
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '320px' }}>
                {renderChart()}
              </svg>
            </div>

            {/* Layer table */}
            {glaserData && glaserData.length > 0 && (
              <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/30">
                <div className="bg-slate-800/80 px-4 py-2.5 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">Datos por Capa</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800/50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2 text-left">Capa</th>
                      <th className="px-3 py-2 text-right">T (°C)</th>
                      <th className="px-3 py-2 text-right">P.Sat (Pa)</th>
                      <th className="px-3 py-2 text-right">P.Vapor (Pa)</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glaserData.map((p, i) => (
                      <tr key={i} className={`border-t border-slate-800/50 ${p.condensation ? 'bg-red-900/15' : ''}`}>
                        <td className="px-3 py-2 font-medium text-slate-300">{p.layerName}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-300">{p.temperature.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-mono text-blue-300">{p.pSatVal.toFixed(0)}</td>
                        <td className="px-3 py-2 text-right font-mono text-amber-300">{p.pVaporVal.toFixed(0)}</td>
                        <td className="px-3 py-2 text-center">{p.condensation ? <span className="text-red-400 font-bold">💧 COND.</span> : <span className="text-emerald-400">✓ OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
