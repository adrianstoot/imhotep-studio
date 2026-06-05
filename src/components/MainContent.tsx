import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Viewport2D } from './Viewport2D';
import { Viewport3D } from './Viewport3D';
import { Footer } from './Footer';
import { MaterialDetails } from './MaterialDetails';
import { useAppContext } from '../context/AppContext';

export const MainContent: React.FC = () => {
  const { selectedId, layers, selectLayer } = useAppContext();
  
  const activeLayer = useMemo(() => {
    if (!selectedId) return null;
    return layers.find(l => l.instanceId === selectedId) || null;
  }, [selectedId, layers]);

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col min-w-0 bg-slate-900 relative"
    >
      <div id="tour-viewports" className="flex-1 flex flex-col relative w-full h-full min-h-0">
        <Viewport2D />
        <Viewport3D />
        
        {/* Material Details Overlay */}
        <AnimatePresence>
          {activeLayer && (
            <MaterialDetails 
              key="material-overlay" 
              layer={activeLayer} 
              onClose={() => selectLayer(null)} 
            />
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </motion.section>
  );
};
