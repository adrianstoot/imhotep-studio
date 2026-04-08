import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, X, Clock, PlayCircle, CheckCircle2, XCircle, Trophy, AlertTriangle, Zap, RotateCcw, ChevronRight, Target, BookOpen, Shield, Flame, Award, Star, TrendingUp, Maximize2, Minimize2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EXAM_CHALLENGES, CONSTRUCTION_SYSTEMS } from '../utils/config';
import { ExamChallenge, ExamResult } from '../types';

interface ExamModeProps {
  open: boolean;
  onClose: () => void;
}

type ExamPhase = 'selection' | 'briefing' | 'active' | 'results';

const DIFF_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; gradient: string }> = {
  'Principiante': { color: '#4ade80', bg: 'from-emerald-900/40 to-emerald-800/20', border: 'border-emerald-600/40', icon: '🌱', gradient: 'from-emerald-600 to-emerald-700' },
  'Intermedio': { color: '#60a5fa', bg: 'from-blue-900/40 to-blue-800/20', border: 'border-blue-600/40', icon: '⚡', gradient: 'from-blue-600 to-indigo-700' },
  'Avanzado': { color: '#fbbf24', bg: 'from-amber-900/40 to-amber-800/20', border: 'border-amber-600/40', icon: '🔥', gradient: 'from-amber-600 to-orange-700' },
  'Experto': { color: '#f43f5e', bg: 'from-rose-900/40 to-rose-800/20', border: 'border-rose-600/40', icon: '💎', gradient: 'from-rose-600 to-red-700' },
};

export const ExamMode: React.FC<ExamModeProps> = ({ open, onClose }) => {
  const { layers, activeSystem, uValue, normativeErrors, normativeScore, isCertified, completeMission, setSystem } = useAppContext();

  const [phase, setPhase] = useState<ExamPhase>('selection');
  const [selectedExam, setSelectedExam] = useState<ExamChallenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [examHistory, setExamHistory] = useState<ExamResult[]>(() => {
    try { const s = localStorage.getItem('constructopro_exams'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [isMinimized, setIsMinimized] = useState(false);

  // Timer
  useEffect(() => {
    if (phase !== 'active' || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { submitExam(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const co2Total = useMemo(() => {
    return layers.reduce((total, l) => {
      const co2 = (l as any).co2PerKg || 0.5;
      const massPerM2 = (l.EspesorVirtualMM / 1000) * l.density;
      return total + co2 * massPerM2;
    }, 0);
  }, [layers]);

  const selectExam = (exam: ExamChallenge) => {
    setSelectedExam(exam);
    setPhase('briefing');
  };

  const startExam = () => {
    if (!selectedExam) return;
    if (selectedExam.systemKey && selectedExam.systemKey !== activeSystem) {
      setSystem(selectedExam.systemKey);
    }
    setTimeLeft(selectedExam.timeMinutes * 60);
    setResult(null);
    setPhase('active');
    setIsMinimized(false);
  };

  const submitExam = useCallback(() => {
    if (!selectedExam) return;

    const details: { criterion: string; points: number; maxPoints: number; comment: string }[] = [];
    let totalPoints = 0;
    
    const hasOrderError = normativeErrors.some(e => e.toLowerCase().includes('orden'));
    let forceFail = false;
    let failReason = '';

    selectedExam.rubric.forEach(r => {
      let pts = 0;
      let comment = '';
      
      const critLower = r.criterion.toLowerCase();

      if (critLower.includes('orden') || critLower.includes('normativo')) {
        if (!hasOrderError && normativeScore >= 80 && layers.length >= 2) { 
          pts = r.maxPoints; comment = '✅ Orden perfecto según normativa'; 
        } else { 
          pts = 0; 
          comment = '❌ ORDEN INCORRECTO: Suspenso automático'; 
          forceFail = true;
          failReason = 'Un detalle constructivo con las capas mal ordenadas (EXT→INT) es irrealizable e incumple el CTE.';
        }
      } else if (r.criterion.includes('U') && r.criterion.includes('≤')) {
        const target = selectedExam.targetU;
        if (uValue > 0 && uValue <= target) { pts = r.maxPoints; comment = `✅ U = ${uValue.toFixed(3)} ≤ ${target}`; }
        else if (uValue > 0 && uValue <= target * 1.3) { pts = Math.floor(r.maxPoints * 0.5); comment = `⚠️ U = ${uValue.toFixed(3)} (objetivo: ${target})`; }
        else if (uValue > 0) { pts = 0; comment = `❌ U = ${uValue.toFixed(3)} >> ${target}`; }
        else { pts = 0; comment = '❌ No hay capas configuradas'; }
      } else if (critLower.includes('co') && r.criterion.includes('<')) {
        const tgtMatch = r.criterion.match(/(\d+)/);
        const target = tgtMatch ? parseInt(tgtMatch[1]) : 30;
        if (co2Total > 0 && co2Total < target) { pts = r.maxPoints; comment = `✅ CO₂ = ${co2Total.toFixed(1)} < ${target}`; }
        else if (co2Total > 0 && co2Total < target * 1.5) { pts = Math.floor(r.maxPoints * 0.4); comment = `⚠️ CO₂ = ${co2Total.toFixed(1)} (objetivo: < ${target})`; }
        else { pts = 0; comment = `❌ CO₂ = ${co2Total.toFixed(1)} >> ${target}`; }
      } else if (critLower.includes('compatib') || critLower.includes('tipos')) {
        const typeErrors = normativeErrors.filter(e => e.includes('no es compatible'));
        if (typeErrors.length === 0 && layers.length > 0) { pts = r.maxPoints; comment = '✅ Todos los materiales compatibles'; }
        else if (typeErrors.length <= 1) { pts = Math.floor(r.maxPoints * 0.5); comment = `⚠️ ${typeErrors.length} tipo(s) incompatible(s)`; }
        else { pts = 0; comment = `❌ ${typeErrors.length} tipos incompatibles`; }
      } else if (critLower.includes('todos') || critLower.includes('requeridos') || critLower.includes('completo')) {
        const missingErrors = normativeErrors.filter(e => e.includes('Falta'));
        if (missingErrors.length === 0 && layers.length >= 2) { pts = r.maxPoints; comment = '✅ Todos los tipos requeridos presentes'; }
        else if (missingErrors.length === 1) { pts = Math.floor(r.maxPoints * 0.5); comment = `⚠️ Falta 1 tipo requerido`; }
        else { pts = 0; comment = `❌ Faltan ${missingErrors.length} tipos requeridos`; }
      } else if (critLower.includes('xps') || critLower.includes('impermeab') || critLower.includes('grava') || critLower.includes('barrera') || critLower.includes('teja') || critLower.includes('lana')) {
        const hasIt = layers.some(l => critLower.split(' ').some(w => w.length > 3 && (l.Nombre.toLowerCase().includes(w) || l.type.toLowerCase().includes(w))));
        if (hasIt) { pts = r.maxPoints; comment = `✅ Material/capa presente`; }
        else { pts = 0; comment = `❌ No se encontró la capa requerida`; }
      } else {
        pts = isCertified && layers.length >= 2 ? r.maxPoints : layers.length >= 1 ? Math.floor(r.maxPoints * 0.3) : 0;
        comment = isCertified ? '✅ Criterio cumplido' : '⚠️ Parcialmente cumplido';
      }

      totalPoints += pts;
      details.push({ criterion: r.criterion, points: pts, maxPoints: r.maxPoints, comment });
    });

    const maxScore = selectedExam.rubric.reduce((a, r) => a + r.maxPoints, 0);
    const pct = (totalPoints / maxScore) * 100;
    let grade = pct >= 90 ? 'Matrícula de Honor' : pct >= 75 ? 'Notable' : pct >= 50 ? 'Aprobado' : 'Suspendido';

    if (forceFail || normativeErrors.length > 3) {
      grade = 'Suspendido';
      if (forceFail) {
        totalPoints = Math.min(totalPoints, Math.floor(maxScore * 0.4)); // Forzar suspender numéricamente
        details.unshift({ criterion: '🛑 SUSPENSO DISCIPLINARIO', points: 0, maxPoints: 0, comment: failReason });
      }
    }

    const examResult: ExamResult = { challengeId: selectedExam.id, score: totalPoints, maxScore, grade, timestamp: Date.now(), details };
    setResult(examResult);
    setPhase('results');
    setIsMinimized(false);

    const newHistory = [...examHistory, examResult].slice(-20);
    setExamHistory(newHistory);
    localStorage.setItem('constructopro_exams', JSON.stringify(newHistory));

    if (grade !== 'Suspendido') completeMission('mission_sate');
  }, [selectedExam, layers, uValue, normativeErrors, normativeScore, isCertified, co2Total, completeMission, examHistory]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const resetExam = () => {
    setPhase('selection');
    setSelectedExam(null);
    setResult(null);
  };

  const quitExam = () => {
    if (phase === 'active' && !window.confirm('¿Seguro que quieres abandonar el examen? Perderás todo el progreso.')) return;
    resetExam();
    onClose();
  };

  if (!open) return null;

  const passedExams = examHistory.filter(r => r.grade !== 'Suspendido').length;
  const avgScore = examHistory.length > 0 ? Math.round(examHistory.reduce((a, r) => a + (r.score / r.maxScore) * 100, 0) / examHistory.length) : 0;

  // ═══ ACTIVE FLOATING WIDGET ═══
  if (phase === 'active' && selectedExam) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: 50, scale: 0.9 }} 
          className={`fixed bottom-6 right-[290px] z-50 ${isMinimized ? 'w-[250px]' : 'w-[400px]'} bg-slate-900/95 backdrop-blur-xl border-t border-l border-r border-slate-600/50 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}
        >
          {/* Draggable header / status bar */}
          <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 p-3 flex justify-between items-center cursor-move border-b border-indigo-500/30">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white uppercase tracking-wider leading-none">Examen Activo</span>
                {!isMinimized && <span className="text-[9px] text-indigo-300 font-bold">{selectedExam.title}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.div animate={{ scale: timeLeft < 60 ? [1, 1.05, 1] : 1 }} transition={{ repeat: timeLeft < 60 ? Infinity : 0, duration: 0.5 }}
                className={`px-2 py-0.5 rounded border font-mono font-black text-xs ${timeLeft < 60 ? 'bg-red-900/60 text-red-300 border-red-500/50' : 'bg-slate-900/60 text-cyan-300 border-slate-700/50'}`}>
                {formatTime(timeLeft)}
              </motion.div>
              <button onClick={() => setIsMinimized(!isMinimized)} className="text-slate-400 hover:text-white transition-colors">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={quitExam} className="text-slate-400 hover:text-red-400 transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scroll">
              <div className="flex justify-between items-center bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 shadow-inner">
                <div className="text-center">
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Objetivo U</div>
                  <div className="text-xs font-mono font-bold text-cyan-400">≤ {selectedExam.targetU}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Actual U</div>
                  <div className={`text-xs font-mono font-black ${uValue > 0 && uValue <= selectedExam.targetU ? 'text-emerald-400' : uValue > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {uValue > 0 ? uValue.toFixed(3) : '--.---'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Progreso</div>
                  <div className={`text-xs font-mono font-black ${layers.length >= 2 && normativeScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {layers.length} capas
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-indigo-400" /> Rúbrica de Evaluación
                </h5>
                {selectedExam.rubric.map((r, i) => {
                  let status: 'pass' | 'partial' | 'fail' = 'fail';
                  const critLower = r.criterion.toLowerCase();
                  if (critLower.includes('u') && critLower.includes('≤')) {
                    status = uValue > 0 && uValue <= selectedExam.targetU ? 'pass' : uValue > 0 ? 'partial' : 'fail';
                  } else if (critLower.includes('orden') || critLower.includes('normativo')) {
                    status = normativeScore >= 90 ? 'pass' : normativeScore >= 40 ? 'partial' : 'fail';
                  } else if (critLower.includes('compatib') || critLower.includes('tipos')) {
                    const typeErrs = normativeErrors.filter(e => e.includes('no es compatible')).length;
                    status = typeErrs === 0 && layers.length > 0 ? 'pass' : typeErrs === 1 ? 'partial' : 'fail';
                  } else if (critLower.includes('todos') || critLower.includes('requeridos') || critLower.includes('completo')) {
                    const missing = normativeErrors.filter(e => e.includes('Falta')).length;
                    status = missing === 0 && layers.length >= 2 ? 'pass' : missing === 1 ? 'partial' : 'fail';
                  } else {
                    status = layers.length >= 2 ? 'partial' : 'fail';
                  }
                  
                  const activeColor = { pass: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/10', partial: 'text-amber-400 border-amber-500/30 bg-amber-900/10', fail: 'text-slate-500 border-slate-700/50 bg-slate-800/30' };
                  const activeIcon = { pass: <CheckCircle2 className="w-3.5 h-3.5" />, partial: <AlertTriangle className="w-3.5 h-3.5" />, fail: <XCircle className="w-3.5 h-3.5" /> };
                  
                  return (
                    <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded border transition-all ${activeColor[status]}`}>
                      <div className="mt-0.5">{activeIcon[status]}</div>
                      <span className="text-[10px] font-medium leading-tight flex-1">{r.criterion}</span>
                      <span className="text-[9px] font-mono font-bold shrink-0">{r.maxPoints}p</span>
                    </div>
                  );
                })}
              </div>

              <button onClick={submitExam} className="mt-2 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 rounded-lg font-black text-white text-xs transition-all shadow-lg flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> ENTREGAR AHORA
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ═══ FULL SCREEN MODAL (Selection, Briefing, Results) ═══
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/95 backdrop-blur-2xl border-t border-l border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-700/50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-indigo-900/15 to-blue-900/20" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_10px_20px_rgba(99,102,241,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Modo Examen Interactivo</h2>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest">EVALUACIÓN PRÁCTICA CONSTRUCTIVA • RÚBRICA AUTOMÁTICA CTE</p>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              {phase === 'selection' && examHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-emerald-900/30 border border-emerald-700/30 px-2.5 py-1 rounded-lg shadow-inner">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">{passedExams}/{examHistory.length}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-900/30 border border-amber-700/30 px-2.5 py-1 rounded-lg shadow-inner">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">{avgScore}%</span>
                  </div>
                </div>
              )}
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-red-900/50 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all border border-slate-700/30 shadow-sm"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scroll">
            <AnimatePresence mode="wait">
              
              {/* ═══ PHASE: SELECTION ═══ */}
              {phase === 'selection' && (
                <motion.div key="selection" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-1">Selecciona un Reto Práctico</h3>
                    <p className="text-xs text-slate-500">Configura el detalle en vivo en el simulador. Se evaluará automáticamente cuando entregues.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {EXAM_CHALLENGES.map(exam => {
                      const dc = DIFF_CONFIG[exam.difficulty];
                      const prevResult = examHistory.filter(r => r.challengeId === exam.id).pop();
                      const prevPct = prevResult ? Math.round((prevResult.score / prevResult.maxScore) * 100) : null;
                      return (
                        <motion.div key={exam.id} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                          className={`relative rounded-2xl overflow-hidden cursor-pointer border ${dc.border} group transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
                          style={{ boxShadow: `0 10px 30px ${dc.color}15, inset 0 1px 1px rgba(255,255,255,0.1)` }}
                          onClick={() => selectExam(exam)}>
                          <div className={`h-1.5 bg-gradient-to-r ${dc.gradient}`} />
                          <div className={`p-4 bg-gradient-to-b ${dc.bg}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl filter drop-shadow-md">{dc.icon}</span>
                                <div>
                                  <h4 className="text-sm font-bold text-white leading-tight drop-shadow-md">{exam.title}</h4>
                                  <span className="text-[8px] font-bold uppercase tracking-widest drop-shadow-sm" style={{ color: dc.color }}>{exam.difficulty}</span>
                                </div>
                              </div>
                              {prevPct !== null && (
                                <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shadow-inner ${prevPct >= 50 ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/30' : 'text-red-300 bg-red-900/30 border-red-700/30'}`}>
                                  {prevPct}%
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-300 mb-4 leading-relaxed line-clamp-2">{exam.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-3 text-[9px] text-slate-400 font-bold">
                                <span className="flex items-center gap-1 bg-slate-950/40 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3 text-blue-400" /> {exam.timeMinutes}m</span>
                                <span className="flex items-center gap-1 bg-slate-950/40 px-1.5 py-0.5 rounded"><Target className="w-3 h-3 text-emerald-400" /> U≤{exam.targetU}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ═══ PHASE: BRIEFING ═══ */}
              {phase === 'briefing' && selectedExam && (
                <motion.div key="briefing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto space-y-5">
                  {(() => { const dc = DIFF_CONFIG[selectedExam.difficulty]; return (
                    <>
                      <div className={`rounded-2xl overflow-hidden border ${dc.border} shadow-[0_15px_35px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)]`}>
                        <div className={`h-2 bg-gradient-to-r ${dc.gradient}`} />
                        <div className={`p-6 bg-gradient-to-b ${dc.bg}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl filter drop-shadow-lg">{dc.icon}</span>
                            <div>
                              <h3 className="text-xl font-black text-white">{selectedExam.title}</h3>
                              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: dc.color }}>{selectedExam.difficulty} • {selectedExam.timeMinutes} minutos</span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed mb-4">{selectedExam.description}</p>
                          {selectedExam.systemKey && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-700/30">
                              <BookOpen className="w-4 h-4 text-blue-400" />
                              <span>Sistema normativo base: <strong className="text-white">{CONSTRUCTION_SYSTEMS[selectedExam.systemKey]?.name || selectedExam.systemKey}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700/50 shadow-inner">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="w-5 h-5 text-indigo-400" />
                          <h4 className="text-sm font-black text-indigo-300 uppercase tracking-wider">Rúbrica de Evaluación</h4>
                        </div>
                        <div className="space-y-2">
                          {selectedExam.rubric.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-slate-800/40 rounded-xl border border-slate-700/30 hover:border-indigo-500/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-indigo-200 shadow-inner">{i + 1}</div>
                                <span className="text-xs text-slate-200 font-medium">{r.criterion}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950/60 px-2 py-1 rounded shadow-inner border border-slate-700/50">{r.maxPoints} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button onClick={resetExam} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-all border border-slate-600/50 shadow-md flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4" /> Cancelar
                        </button>
                        <button onClick={startExam} className={`flex-[2] py-4 bg-gradient-to-r ${dc.gradient} hover:brightness-110 rounded-xl text-sm font-black text-white transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2`}>
                          <PlayCircle className="w-5 h-5" /> ENTRAR AL SIMULADOR
                        </button>
                      </div>
                    </>
                  ); })()}
                </motion.div>
              )}

              {/* ═══ PHASE: RESULTS ═══ */}
              {phase === 'results' && result && selectedExam && (() => {
                const nextExam = selectedExam.evolvesToId ? EXAM_CHALLENGES.find(e => e.id === selectedExam.evolvesToId) : null;
                const passed = result.grade !== 'Suspendido';
                return (
                <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto space-y-6">
                  <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className={`rounded-3xl p-8 text-center border shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] overflow-hidden relative ${result.grade === 'Suspendido' ? 'bg-gradient-to-b from-red-900/40 to-red-950/30 border-red-700/50' : result.grade === 'Matrícula de Honor' ? 'bg-gradient-to-b from-amber-900/40 to-amber-950/30 border-amber-500/50' : 'bg-gradient-to-b from-emerald-900/40 to-emerald-950/30 border-emerald-600/50'}`}>
                    {result.grade === 'Matrícula de Honor' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.15),transparent_70%)]" />}
                    
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-7xl mb-4 drop-shadow-xl">
                      {result.grade === 'Matrícula de Honor' ? '🏆' : result.grade === 'Notable' ? '🎉' : result.grade === 'Aprobado' ? '✅' : '❌'}
                    </motion.div>
                    
                    <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-4xl font-black text-white mb-2 drop-shadow-md tracking-tight">{result.grade}</motion.h3>
                    
                    <div className="flex items-center justify-center gap-4 text-xl bg-slate-950/40 inline-flex px-5 py-2 rounded-xl border border-white/5 shadow-inner">
                      <span className="font-mono font-bold text-white">{result.score} <span className="text-slate-500 text-base">/ {result.maxScore}</span></span>
                      <span className={`font-black ${((result.score / result.maxScore) * 100) >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {((result.score / result.maxScore) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>

                  <div className="bg-slate-900/60 rounded-3xl overflow-hidden border border-slate-700/50 shadow-xl">
                    <div className="px-6 py-4 bg-slate-800/60 flex items-center gap-2 border-b border-slate-700/50">
                      <Award className="w-5 h-5 text-indigo-400" />
                      <span className="text-sm font-black text-indigo-300 uppercase tracking-widest">Desglose del Proyecto</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {result.details.map((d, i) => {
                        const pct = d.maxPoints > 0 ? (d.points / d.maxPoints) * 100 : 0;
                        return (
                          <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 * i }}
                            className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-slate-200">{d.criterion}</span>
                              <span className={`text-sm font-mono font-black ${pct >= 70 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                {d.points} <span className="opacity-50">/ {d.maxPoints}</span>
                              </span>
                            </div>
                            <div className="h-2 bg-slate-950/80 rounded-full overflow-hidden mb-2 shadow-inner">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + 0.1 * i, duration: 0.5 }}
                                className={`h-full rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ${pct >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : pct > 0 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`} />
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800">{d.comment}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4 flex-wrap">
                    {passed && nextExam && (
                      <button onClick={() => selectExam(nextExam)} className="w-full mb-2 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-xl text-sm font-black text-white transition-all shadow-[0_10px_20px_rgba(249,115,22,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2">
                        <Flame className="w-5 h-5" /> EVOLUCIONAR RETO: {nextExam.title}
                      </button>
                    )}
                    <button onClick={resetExam} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-all border border-slate-600/50 shadow-md flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Seleccionar Otro Examen
                    </button>
                    <button onClick={onClose} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 rounded-xl text-sm font-black text-white transition-all shadow-[0_10px_20px_rgba(79,70,229,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2">
                      <ChevronRight className="w-5 h-5" /> Volver al Modo Libre
                    </button>
                  </div>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
