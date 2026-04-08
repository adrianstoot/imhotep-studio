import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, X, FileText, PieChart, Calculator, Building2, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BUDGET_CHAPTERS } from '../utils/config';
import { BudgetLine, BudgetSummary } from '../types';

interface BudgetPanelProps {
  open: boolean;
  onClose: () => void;
}

export const BudgetPanel: React.FC<BudgetPanelProps> = ({ open, onClose }) => {
  const { layers, area, setArea } = useAppContext();

  const budget = useMemo<BudgetSummary>(() => {
    const lines: BudgetLine[] = layers.filter(l => l.type !== 'Cámara de Aire').map(l => {
      const chapter = (l as any).budgetChapter || 'RRY';
      const chapterName = BUDGET_CHAPTERS[chapter] || 'Cap. 99 — Otros';
      const iveCode = (l as any).iveCode || 'GEN.01';
      return {
        chapter,
        chapterName,
        iveCode,
        description: `${l.type} — ${l.Nombre} (${l.Empresa}) | e=${l.EspesorRaw}`,
        unit: 'm²',
        quantity: area,
        unitPrice: l.PrecioNum,
        amount: l.PrecioNum * area,
      };
    });

    const pem = lines.reduce((a, l) => a + l.amount, 0);
    const gg = pem * 0.13;
    const bi = pem * 0.06;
    const pec = pem + gg + bi;
    const iva = pec * 0.21;
    const total = pec + iva;

    const chapterTotals: Record<string, { name: string; amount: number }> = {};
    lines.forEach(l => {
      if (!chapterTotals[l.chapter]) chapterTotals[l.chapter] = { name: l.chapterName, amount: 0 };
      chapterTotals[l.chapter].amount += l.amount;
    });
    const chapterBreakdown = Object.entries(chapterTotals).map(([ch, v]) => ({
      chapter: ch, name: v.name, amount: v.amount, pct: pem > 0 ? (v.amount / pem) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    return { lines, pem, gg, bi, pec, iva, total, chapterBreakdown };
  }, [layers, area]);

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="bg-[#1e293b] border border-slate-600/50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-indigo-600/10" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Presupuesto de Ejecución <span className="text-blue-400 font-medium">v14</span></h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Base de Datos Normativa — ETSIE UPV</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/5 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll">
            
            {/* Project Info */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 grid grid-cols-3 gap-4 items-center">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Proyecto</span>
                <span className="text-sm font-bold text-white">Detalle Constructivo</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Superficie Base de Cálculo</span>
                <div className="flex items-center gap-3 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-700/50 focus-within:border-blue-500 transition-colors">
                  <input 
                    type="number" 
                    min="1" 
                    step="0.5"
                    value={area}
                    onChange={(e) => setArea(parseFloat(e.target.value) || 1)}
                    className="w-20 bg-transparent text-sm font-black text-white font-mono focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 border-l border-slate-700 pl-3">m²</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Fecha</span>
                <span className="text-sm font-bold text-white">{new Date().toLocaleDateString('es-ES')}</span>
              </div>
            </div>

            {layers.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-bold">Añade materiales para generar el presupuesto</p>
              </div>
            ) : (
              <>
                {/* Line Items Table */}
                <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/30">
                  <div className="bg-slate-800/80 px-4 py-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Mediciones y Presupuesto</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800/50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-2.5 text-left">Código IVE</th>
                        <th className="px-3 py-2.5 text-left">Descripción</th>
                        <th className="px-3 py-2.5 text-center">Ud.</th>
                        <th className="px-3 py-2.5 text-right">Med.</th>
                        <th className="px-3 py-2.5 text-right">P.Unit.</th>
                        <th className="px-3 py-2.5 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.lines.map((line, i) => (
                        <tr key={i} className={`border-t border-slate-800/50 ${i % 2 === 0 ? 'bg-slate-900/30' : ''} hover:bg-slate-800/40 transition-colors`}>
                          <td className="px-3 py-2.5 font-mono text-blue-300 font-bold">{line.iveCode}</td>
                          <td className="px-3 py-2.5 text-slate-200 max-w-[300px] truncate" title={line.description}>{line.description}</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">{line.unit}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-300">{fmt(line.quantity)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-300">{fmt(line.unitPrice)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-white">{fmt(line.amount)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Chart side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  
                  {/* Pie Chart */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Distribución por Capítulo</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
                        {budget.chapterBreakdown.reduce((acc, ch, i) => {
                          const startAngle = acc.angle;
                          const sliceAngle = (ch.pct / 100) * 360;
                          const endAngle = startAngle + sliceAngle;
                          const largeArc = sliceAngle > 180 ? 1 : 0;
                          const startRad = (startAngle - 90) * Math.PI / 180;
                          const endRad = (endAngle - 90) * Math.PI / 180;
                          const x1 = 50 + 45 * Math.cos(startRad);
                          const y1 = 50 + 45 * Math.sin(startRad);
                          const x2 = 50 + 45 * Math.cos(endRad);
                          const y2 = 50 + 45 * Math.sin(endRad);
                          acc.paths.push(
                            <path key={i} d={`M50,50 L${x1},${y1} A45,45 0 ${largeArc},1 ${x2},${y2} Z`} fill={pieColors[i % pieColors.length]} opacity="0.85" stroke="#1e293b" strokeWidth="1" />
                          );
                          acc.angle = endAngle;
                          return acc;
                        }, { angle: 0, paths: [] as React.ReactNode[] }).paths}
                      </svg>
                      <div className="flex-1 space-y-1.5">
                        {budget.chapterBreakdown.map((ch, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                            <span className="text-slate-300 truncate flex-1">{ch.name.split('—')[1]?.trim() || ch.name}</span>
                            <span className="font-bold text-white font-mono">{ch.pct.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Resumen Económico</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30"><span className="text-xs text-slate-400 font-medium">PEM (Ejecución Material)</span><span className="font-mono font-bold text-white">{fmt(budget.pem)} €</span></div>
                      <div className="flex justify-between items-center py-1.5"><span className="text-[10px] text-slate-500">+ 13% Gastos Generales</span><span className="font-mono text-xs text-slate-300">{fmt(budget.gg)} €</span></div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30"><span className="text-[10px] text-slate-500">+ 6% Beneficio Industrial</span><span className="font-mono text-xs text-slate-300">{fmt(budget.bi)} €</span></div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30"><span className="text-xs text-slate-400 font-medium">PEC (Ejecución Contrata)</span><span className="font-mono font-bold text-blue-300">{fmt(budget.pec)} €</span></div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-700/30"><span className="text-[10px] text-slate-500">+ 21% IVA</span><span className="font-mono text-xs text-slate-300">{fmt(budget.iva)} €</span></div>
                      <div className="flex justify-between items-center py-3 bg-emerald-900/20 rounded-lg px-3 mt-2 border border-emerald-700/30">
                        <span className="text-sm font-black text-emerald-400 uppercase tracking-wider">TOTAL PRESUPUESTO</span>
                        <span className="font-mono font-black text-xl text-emerald-300">{fmt(budget.total)} €</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-500">
                      <Building2 className="w-3 h-3" />
                      <span>Precios IVE Comunitat Valenciana 2025. Área: {area} m²</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
