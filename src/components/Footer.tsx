import React from 'react';
import { FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { exportPDF } from '../utils/pdfExport';

export const Footer: React.FC = () => {
  const state = useAppContext();
  const { layers, uValue, mass, pem } = state;

  const totalCost = pem;
  
  const acoustic = mass > 0 ? Math.round(20 * Math.log10(mass) + 18.5) : 0;
  const carbon = mass * 0.286;

  const handleExport = () => {
    const canvas2D = document.getElementById('canvas2D') as HTMLCanvasElement;
    const canvas3D = document.getElementById('canvas3D-webgl') as HTMLCanvasElement;
    exportPDF(state, canvas2D, canvas3D);
  };

  return (
    <motion.footer 
      id="tour-footer"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-[100px] shrink-0 w-full glass-panel border-t border-slate-800 bg-[#070b14] flex items-center justify-between px-0 gap-0 relative z-30 shadow-[0_-15px_40px_rgba(0,0,0,0.8)]"
    >
      
      {/* Card 1: Transmitancia U */}
      <div className={`flex-1 h-full rounded-none flex flex-col items-center justify-center p-2 text-center transition-all border-r ${
        layers.length === 0 ? 'bg-slate-900 border-slate-800 shadow-[inset_0_0_15px_rgba(100,116,139,0.05)]' :
        uValue > 0.40 ? 'bg-red-950/80 border-red-500/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]' : 'bg-emerald-950/80 border-emerald-500/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]'
      }`}>
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-1">Transmitancia U</span>
        <div className="flex items-baseline justify-center gap-1 leading-none">
          <span className={`text-2xl font-black font-mono leading-none ${uValue > 0.40 && layers.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {layers.length > 0 ? uValue.toFixed(3) : '--'}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">W/m²K</span>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${layers.length === 0 ? 'text-slate-600' : uValue > 0.40 ? 'text-red-500' : 'text-emerald-500'}`}>
          {layers.length === 0 ? 'ESPERANDO' : uValue > 0.40 ? 'INCUMPLE' : 'CUMPLE'}
        </span>
      </div>

      {/* Card 2: Aislamiento Acústico */}
      <div className={`flex-1 h-full rounded-none flex flex-col items-center justify-center p-2 text-center transition-all border-r ${
        layers.length === 0 ? 'bg-slate-900 border-slate-800 shadow-[inset_0_0_15px_rgba(100,116,139,0.05)]' : 'bg-emerald-950/80 border-emerald-500/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]'
      }`}>
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-1">Aisl. Acústico</span>
        <div className="flex items-baseline justify-center gap-1 leading-none">
          <span className={`text-2xl font-black font-mono leading-none ${layers.length > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
            {layers.length > 0 ? `~${acoustic}` : '--'}
          </span>
          <span className="text-[10px] text-emerald-400/80 font-bold">dB</span>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${layers.length > 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
          {layers.length > 0 ? 'CONFORME' : 'ESPERANDO'}
        </span>
      </div>

      {/* Card 3: Masa Superficial */}
      <div className={`flex-1 h-full rounded-none flex flex-col items-center justify-center p-2 text-center transition-all border-r ${
        layers.length === 0 ? 'bg-slate-900 border-slate-800 shadow-[inset_0_0_15px_rgba(100,116,139,0.05)]' : 'bg-slate-900/90 border-slate-700 shadow-[inset_0_0_15px_rgba(203,213,225,0.05)]'
      }`}>
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-1">Masa Superficial</span>
        <div className="flex items-baseline justify-center gap-1 leading-none">
          <span className={`text-2xl font-black font-mono leading-none ${layers.length > 0 ? 'text-white' : 'text-slate-600'}`}>
            {layers.length > 0 ? Math.round(mass) : '--'}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">kg/m²</span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mt-1">
          Inercia Térmica
        </span>
      </div>

      {/* Card 4: Huella de Carbono */}
      <div className={`flex-1 h-full rounded-none flex flex-col items-center justify-center p-2 text-center transition-all border-r ${
        layers.length === 0 ? 'bg-slate-900 border-slate-800 shadow-[inset_0_0_15px_rgba(100,116,139,0.05)]' : 'bg-slate-900/90 border-slate-700 shadow-[inset_0_0_15px_rgba(203,213,225,0.05)]'
      }`}>
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-1">Huella Carbono</span>
        <div className="flex items-baseline justify-center gap-1 leading-none">
          <span className={`text-2xl font-black font-mono leading-none ${layers.length > 0 ? 'text-white' : 'text-slate-600'}`}>
            {layers.length > 0 ? carbon.toFixed(1) : '--'}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">kgCO₂/m²</span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mt-1">
          Embodied Carbon
        </span>
      </div>

      {/* Card 5: Coste Directo */}
      <div className={`flex-1 h-full rounded-none flex flex-col items-center justify-center p-2 text-center transition-all border-r ${
        layers.length === 0 ? 'bg-slate-900 border-slate-800 shadow-[inset_0_0_15px_rgba(100,116,139,0.05)]' : 'bg-slate-900/90 border-slate-700 shadow-[inset_0_0_15px_rgba(203,213,225,0.05)]'
      }`}>
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-1">Coste Estimado</span>
        <div className="flex items-baseline justify-center gap-1 leading-none">
          <span className={`text-2xl font-black font-mono leading-none ${layers.length > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>
            {layers.length > 0 ? Math.round(totalCost) : '--'}
          </span>
          <span className="text-[10px] text-yellow-500/70 font-bold">€/m²</span>
        </div>
        <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mt-1">
          Ejecución Material
        </span>
      </div>

      {/* Card 6: Export PDF */}
      <button 
        onClick={handleExport}
        title="Generar Memoria PDF en formato A4"
        className="flex-1 h-full rounded-none bg-blue-600 hover:bg-blue-500 text-white flex flex-col items-center justify-center p-2 text-center transition-all border-l border-blue-400/50 shadow-[inset_0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
      >
        <FileText className="w-5 h-5 mb-1 text-white" />
        <span className="text-[11px] font-black tracking-widest uppercase">Memoria PDF</span>
      </button>
      
    </motion.footer>
  );
};
