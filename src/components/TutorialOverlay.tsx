import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, ArrowRight, ArrowLeft, ChevronRight, BookOpen, GitBranch, SwatchBook, Box, ClipboardList, Wrench, Layers, Shield, Zap } from 'lucide-react';

interface TourStep {
  title: string;
  icon: React.ComponentType<any>;
  content: string;
  highlight: string;
}

const STEPS: TourStep[] = [
  {
    title: '¡Te damos la bienvenida a ConstructoPro!',
    icon: BookOpen,
    content: 'Este entorno de simulación avanzada te guiará en el diseño y validación de cerramientos y particiones constructivas según el Código Técnico de la Edificación (CTE). El objetivo es componer cerramientos eficientes que limiten la demanda de energía, aíslen acústicamente y eviten patologías como las condensaciones intersticiales.',
    highlight: '',
  },
  {
    title: '1. Selección del Sistema Constructivo',
    icon: GitBranch,
    content: 'Selecciona el tipo de cerramiento a calcular. El software incluye:\n• Fachadas: SATE (aislamiento exterior), Ventilada (cámara ventilada) o Tradicional (aislamiento interior).\n• Particiones e Interiores: Tabiquería interior (PYL o tradicional) y Soleras.\n• Cubiertas: Invertida (con XPS y grava) o Convencional (con teja).\n¡Ojo! Cambiar el sistema reiniciará las capas del editor.',
    highlight: 'tour-system-selector',
  },
  {
    title: '2. Catálogo de Materiales Técnicos',
    icon: SwatchBook,
    content: 'Explora y selecciona materiales técnicos reales procedentes de fabricantes valencianos y nacionales.\n• Filtro Automático: El catálogo filtra los materiales incompatibles por orientación (vertical/horizontal).\n• Añadir Capas: Haz clic sobre cualquier material para añadirlo al final de tu cerramiento (de exterior a interior).\n• Extras: Crea materiales propios ("+ Nuevo") o añade cámaras de aire ("Aire").',
    highlight: 'tour-catalog',
  },
  {
    title: '3. Visores Dinámicos 2D & 3D',
    icon: Box,
    content: 'Visualiza en tiempo real el comportamiento físico del cerramiento:\n• Visor 2D: Muestra la sección transversal a escala con su correspondiente leyenda. ¡Ahora es completamente interactiva! Pasa el ratón para resaltar o haz clic para inspeccionar cualquier capa.\n• Visor 3D: Modelo tridimensional texturizado e interactivo. Rótalo y haz clic en los elementos de la leyenda 3D para seleccionarlos en el editor.',
    highlight: 'tour-viewports',
  },
  {
    title: '4. Capas Instaladas y Modificación',
    icon: Layers,
    content: 'Aquí verás el orden actual de las capas de tu cerramiento, siempre dispuestas desde el Exterior (EXT, arriba) hacia el Interior (INT, abajo):\n• Reordenar: Utiliza las flechas (↑/↓) para mover las capas.\n• Espesor: Haz clic sobre el valor en milímetros (ej. "80 mm") para editarlo e introducir el grosor exacto.\n• Eliminar: Haz clic en el botón de la papelera para quitar la capa.',
    highlight: 'tour-layers-list',
  },
  {
    title: '5. Guía Normativa y Cumplimiento CTE',
    icon: Shield,
    content: 'Valida tu cerramiento frente a las exigencias normativas del CTE:\n• Requisitos: El software verifica si el cerramiento cuenta con todas las capas obligatorias en el orden recomendado (EXT→INT).\n• Puntuación: Un indicador calcula tu nivel de cumplimiento en tiempo real.\n• Alertas: Si hay errores de orden o incompatibilidad de materiales, se te notificarán aquí mismo.',
    highlight: 'tour-normative',
  },
  {
    title: '6. Indicadores de Eficiencia y Físicas',
    icon: Zap,
    content: 'Monitoriza las propiedades globales del cerramiento:\n• Transmitancia Térmica (U): El calor que pierde el muro (W/m²K). Para cumplir el CTE DB-HE debe ser menor a 0.40. ¡Menor valor = mejor aislamiento!\n• Resistencia Térmica (R), Masa Superficial (Inercia térmica) y Espesor Total.\n• Área: Modifica la superficie de cálculo para escalar el presupuesto y la huella de carbono.',
    highlight: 'tour-metrics',
  },
  {
    title: '7. Herramientas Avanzadas e Informes',
    icon: Wrench,
    content: 'Lleva tu proyecto constructivo al siguiente nivel:\n• Condensaciones (Glaser): Evalúa condensaciones intersticiales según UNE-EN ISO 13788.\n• Presupuesto: Costes y desglose de capítulos con base de precios del IVE.\n• Modo Examen: Supera retos académicos diseñados por el profesorado.\n• Memoria PDF: Genera una ficha técnica en A4 para imprimir con planos y cómputo de materiales.',
    highlight: 'tour-header-tools',
  },
];

interface RectCoords {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TutorialOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<RectCoords | null>(null);

  // Se ignora localStorage para que el tutorial siempre se active de inicio al recargar/reiniciar
  const dismissed = false;

  // Check element position of active step
  const updateTargetRect = () => {
    const current = STEPS[step];
    if (!current.highlight) {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(current.highlight);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (visible) {
      updateTargetRect();
      
      // Delay to ensure rendering is stable and then update
      const timer = setTimeout(updateTargetRect, 100);
      
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect);
      };
    }
  }, [visible, step]);

  useEffect(() => {
    // Activar siempre el tutorial al iniciar
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const current = STEPS[step];
  const Icon = current.icon;

  // Calculate dynamic guide card styles
  const getCardStyle = (): React.CSSProperties => {
    const defaultStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 100,
      width: 'min(calc(100vw - 32px), 440px)',
    };

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (windowWidth < 1024 || !targetRect) {
      // For mobile / small screens or no target: center the modal
      return {
        ...defaultStyle,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Check if there is enough space to the right or left
    const spaceRight = windowWidth - (targetRect.left + targetRect.width);
    const spaceLeft = targetRect.left;

    if (targetRect.top < 80) {
      // Top target -> place below
      return {
        ...defaultStyle,
        left: `${Math.max(16, Math.min(windowWidth - 456, targetCenterX - 220))}px`,
        top: `${targetRect.top + targetRect.height + 20}px`,
      };
    } else if (spaceRight >= 460) {
      // Enough space on the right -> place to the right of the target
      return {
        ...defaultStyle,
        left: `${targetRect.left + targetRect.width + 20}px`,
        top: `${Math.max(16, Math.min(windowHeight - 380, targetCenterY - 140))}px`,
      };
    } else if (spaceLeft >= 460) {
      // Enough space on the left -> place to the left of the target
      return {
        ...defaultStyle,
        left: `${targetRect.left - 460}px`,
        top: `${Math.max(16, Math.min(windowHeight - 380, targetCenterY - 140))}px`,
      };
    } else {
      // Fallback: place below target or center
      return {
        ...defaultStyle,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }
  };

  return (
    <>
      {/* Help button always visible */}
      <button 
        onClick={() => { setStep(0); setVisible(true); }} 
        className="fixed bottom-5 right-5 z-[60] w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95 border border-indigo-400/30" 
        title="Mostrar Tutorial"
      >
        <HelpCircle className="w-5.5 h-5.5" />
      </button>

      <AnimatePresence>
        {visible && (
          <div className="fixed inset-0 z-[90] overflow-hidden">
            {/* Spotlight Mask using SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left - 8}
                      y={targetRect.top - 8}
                      width={targetRect.width + 16}
                      height={targetRect.height + 16}
                      rx="12"
                      ry="12"
                      fill="black"
                      className="transition-all duration-300 ease-out"
                    />
                  )}
                </mask>
              </defs>
              {/* Semi-transparent backdrop with mask applied */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(8, 11, 20, 0.82)"
                mask="url(#spotlight-mask)"
                className="pointer-events-auto"
                onClick={dismiss}
              />
            </svg>

            {/* Glowing spotlight ring around target */}
            {targetRect && (
              <div 
                className="absolute border border-indigo-500/50 rounded-xl pointer-events-none transition-all duration-300 ease-out"
                style={{
                  left: `${targetRect.left - 8}px`,
                  top: `${targetRect.top - 8}px`,
                  width: `${targetRect.width + 16}px`,
                  height: `${targetRect.height + 16}px`,
                  boxShadow: '0 0 25px rgba(99, 102, 241, 0.4), inset 0 0 10px rgba(99, 102, 241, 0.3)',
                }}
              />
            )}

            {/* Card Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={getCardStyle()}
              className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
            >
              {/* Card Header Gradient */}
              <div className="relative h-28 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 flex items-center justify-between px-6 overflow-hidden border-b border-slate-800">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase">TUTORIAL DE INICIO</span>
                    <h4 className="text-xs font-black text-slate-100 uppercase tracking-wide">Paso {step + 1} de {STEPS.length}</h4>
                  </div>
                </div>
                <button 
                  onClick={dismiss} 
                  className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 max-h-[300px] overflow-y-auto custom-scroll">
                <h3 className="text-sm font-black text-white mb-3 tracking-wide leading-snug">{current.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-line">{current.content}</p>
              </div>

              {/* Card Footer with actions */}
              <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between">
                {/* Visual Indicators (Capsules) */}
                <div className="flex gap-1">
                  {STEPS.map((_, i) => (
                    <div 
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? 'w-5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'w-1.5 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={dismiss}
                    className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-white px-2.5 py-1.5 transition-colors cursor-pointer"
                  >
                    Omitir
                  </button>
                  
                  {step > 0 && (
                    <button 
                      onClick={prev} 
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Atrás
                    </button>
                  )}
                  
                  <button 
                    onClick={next} 
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-black text-white transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 cursor-pointer"
                  >
                    {step < STEPS.length - 1 ? (
                      <>Siguiente <ArrowRight className="w-3 h-3" /></>
                    ) : (
                      <>Comenzar <ChevronRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
