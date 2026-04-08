import React, { useRef, useEffect, useState } from 'react';
import { Database, Undo2, Redo2, Trophy, Star, Zap, Receipt, Thermometer, GraduationCap, Building2, FolderOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { getLevelInfo } from '../utils/config';

interface HeaderProps {
  onOpenBudget: () => void;
  onOpenGlaser: () => void;
  onOpenExam: () => void;
  onOpenCompanies: () => void;
  onOpenSavedDetails: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBudget, onOpenGlaser, onOpenExam, onOpenCompanies, onOpenSavedDetails }) => {
  const { isEngineOnline, loadCSV, undo, redo, canUndo, canRedo, gamification, setShowGamification } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const levelInfo = getLevelInfo(gamification.xp);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) loadCSV(ev.target.result as string); };
      reader.readAsText(file);
    }
  };

  const toolButtons = [
    { icon: FolderOpen, label: 'Mis Detalles', onClick: onOpenSavedDetails, color: 'text-teal-400', bg: 'hover:bg-teal-900/30' },
    { icon: Receipt, label: 'Presupuesto', onClick: onOpenBudget, color: 'text-blue-400', bg: 'hover:bg-blue-900/30' },
    { icon: Thermometer, label: 'Condensaciones', onClick: onOpenGlaser, color: 'text-cyan-400', bg: 'hover:bg-cyan-900/30' },
    { icon: GraduationCap, label: 'Examen', onClick: onOpenExam, color: 'text-purple-400', bg: 'hover:bg-purple-900/30' },
    { icon: Building2, label: 'Empresas', onClick: onOpenCompanies, color: 'text-amber-400', bg: 'hover:bg-amber-900/30' },
  ];

  return (
    <motion.header 
      initial={{ y: -60 }} animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-14 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_-1px_0_rgba(255,255,255,0.05)] flex items-center justify-between px-4 z-50 shrink-0 relative"
    >
      <div className="absolute inset-0 pointer-events-none border-b border-white/5" />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">CP</div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-200 flex flex-col items-start leading-tight">
          <span>Constructo<span className="text-orange-500">Pro</span> <span className="text-[10px] font-normal text-slate-400 ml-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">v14.0 ÉLITE</span></span>
          <span className="text-[9px] font-medium text-blue-400 tracking-widest uppercase mt-0.5">ETSIE, Univ. Politècnica de València</span>
        </h1>
      </div>

      {/* Tool buttons */}
      <nav className="flex items-center gap-1">
        {toolButtons.map(btn => (
          <button key={btn.label} onClick={btn.onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border border-transparent hover:border-slate-700/50 ${btn.color} ${btn.bg}`} title={btn.label}>
            <btn.icon className="w-3.5 h-3.5" /> <span className="hidden xl:inline">{btn.label}</span>
          </button>
        ))}
        <div className="h-5 w-px bg-slate-700 mx-1" />
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className={`p-1.5 rounded-md border border-slate-700/50 transition-colors ${canUndo ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'}`} title="Deshacer"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={redo} disabled={!canRedo} className={`p-1.5 rounded-md border border-slate-700/50 transition-colors ${canRedo ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'}`} title="Rehacer"><Redo2 className="w-3.5 h-3.5" /></button>
        </div>
      </nav>

      <div className="flex items-center gap-3">
        {/* XP Badge */}
        <button onClick={() => setShowGamification(true)} className="flex items-center gap-2 bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-500/30 rounded-lg px-3 py-1.5 hover:border-yellow-500/60 transition-all group cursor-pointer" title="Panel de Progreso">
          <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 group-hover:animate-spin" /><span className="text-[10px] font-black uppercase tracking-wider" style={{ color: levelInfo.color }}>Nv.{levelInfo.level}</span></div>
          <div className="h-4 w-px bg-yellow-500/30" />
          <div className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /><span className="text-xs font-black text-yellow-400">{gamification.xp}</span></div>
          <Trophy className="w-3.5 h-3.5 text-yellow-500/60 group-hover:text-yellow-400" />
        </button>

        <div className="text-right flex flex-col items-end">
          <p className="text-[9px] text-slate-500">Motor</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isEngineOnline ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`} />
            <p className={`text-[10px] font-bold ${isEngineOnline ? 'text-green-400' : 'text-blue-400'}`}>{isEngineOnline ? 'ONLINE' : 'INIT...'}</p>
          </div>
        </div>
        
        <label className="text-slate-400 hover:text-white flex items-center cursor-pointer transition-colors bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700 text-[10px] shadow-sm hover:bg-slate-800" title="Importar CSV">
          <Database className="w-3.5 h-3.5 mr-1.5 text-orange-500" />CSV
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </label>
      </div>
    </motion.header>
  );
};
