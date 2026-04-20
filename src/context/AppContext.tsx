import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Papa from 'papaparse';
import { Material, Layer, AppState, GamificationState, Badge } from '../types';
import { PHYSICS_DICTIONARY, DEFAULT_CSV_DATA, CONSTRUCTION_SYSTEMS, MISSIONS, getLevelInfo } from '../utils/config';

interface AppContextType extends AppState {
  setSystem: (sysKey: string) => void;
  addLayer: (matId: string) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, dir: number) => void;
  selectLayer: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  hoveredId: string | null;
  setSearchTerm: (term: string) => void;
  setArea: (area: number) => void;
  loadCSV: (csvText: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  addCustomMaterial: (mat: Material) => void;
  addAirChamber: () => void;
  updateLayerThickness: (id: string, mm: number) => void;
  showGamification: boolean;
  setShowGamification: (v: boolean) => void;
  completeMission: (id: string) => void;
  showCelebration: string | null;
  dismissCelebration: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_GAMIFICATION: GamificationState = {
  xp: 0,
  level: 1,
  levelName: 'Aprendiz',
  completedMissions: [],
  badges: [],
  streak: 0,
  totalConfigurations: 0,
};

const loadGamification = (): GamificationState => {
  try {
    const saved = localStorage.getItem('constructopro_gamification');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_GAMIFICATION;
};

const saveGamification = (g: GamificationState) => {
  try { localStorage.setItem('constructopro_gamification', JSON.stringify(g)); } catch {}
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [catalog, setCatalog] = useState<Material[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [history, setHistory] = useState<Layer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSystem, setActiveSystem] = useState<string>('SATE');
  const [area, setArea] = useState<number>(1); // Predefinido a 1 m²
  const [isCertified, setIsCertified] = useState<boolean>(false);
  const [isEngineOnline, setIsEngineOnline] = useState<boolean>(false);
  const [uValue, setUValue] = useState<number>(0);
  const [mass, setMass] = useState<number>(0);
  const [pem, setPem] = useState<number>(0);
  const [gamification, setGamification] = useState<GamificationState>(loadGamification);
  const [normativeErrors, setNormativeErrors] = useState<string[]>([]);
  const [normativeScore, setNormativeScore] = useState<number>(0);
  const [showGamification, setShowGamification] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<string | null>(null);

  const loadCSV = (csvText: string) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const newCatalog = res.data.map((row: any, i: number) => {
          const cat = row['Categoría / Uso'] || row['Categoría'] || row['Categoria'] || 'General';
          const nom = row['Producto'] || row['Nombre'] || 'Material';
          const emp = row['Empresa (Vínculo ETSIE)'] || row['Empresa'] || row['Fabricante'] || 'Industria';
          const pRaw = row['Precio'] || '0';
          let eRaw = row['Espesor'] || row['espesor'] || row['ESPESOR'] || 'N/A';
          
          let vThick = 2;
          if (eRaw !== 'N/A') {
            const m = eRaw.match(/(?:^|\s)(\d+(?:[.,]\d+)?)/);
            if (m) {
              let v = parseFloat(m[1].replace(',', '.'));
              if (eRaw.toLowerCase().includes('cm')) v *= 10;
              else if (eRaw.toLowerCase().includes('m') && !eRaw.toLowerCase().includes('mm')) v *= 1000;
              else if (v < 35 && !eRaw.toLowerCase().includes('mm')) v *= 10;
              vThick = v;
            }
          }
          vThick = Math.max(2, Math.min(vThick, 800));

          let vPrice = 0;
          const priceMatch = pRaw.match(/(\d+(?:[.,]\d+)?)/);
          if (priceMatch) {
            vPrice = parseFloat(priceMatch[1].replace(',', '.'));
          }

          const match = (PHYSICS_DICTIONARY as any).find((p: any) => p.keywords.some((k: string) => (cat + ' ' + nom).toLowerCase().includes(k))) || 
            { lambda: 0.5, density: 1000, color: '#475569', icon: 'Box', type: 'Genérico', textureClass: 'concrete', textureId: 'generic', image: '/texturas/hormigon_real.png', co2PerKg: 0, mu: 10, budgetChapter: 'GEN', iveCode: 'GEN.1', orientationType: 'ambos' };
          
          return { 
            id: `M_${i}`, 
            Categoria: cat, 
            Nombre: nom, 
            Empresa: emp, 
            EspesorRaw: eRaw, 
            EspesorVirtualMM: vThick, 
            PrecioNum: vPrice, 
            orientationType: match.orientationType || 'ambos',
            ...match 
          } as Material;
        });
        
        setCatalog(newCatalog);
        setIsEngineOnline(true);
      }
    });
  };

  useEffect(() => {
    loadCSV(DEFAULT_CSV_DATA);
  }, []);

  // Normative validation
  const checkNormativeCompliance = useCallback((currentLayers: Layer[], sysKey: string) => {
    const sys = CONSTRUCTION_SYSTEMS[sysKey];
    if (!sys || currentLayers.length === 0) {
      setNormativeErrors([]);
      setNormativeScore(0);
      return;
    }

    const errors: string[] = [];
    const reqLayers = sys.requiredLayers;
    
    // Check required types present
    const presentTypes = new Set(currentLayers.map(l => l.type));
    reqLayers.forEach(req => {
      if (!presentTypes.has(req)) {
        errors.push(`Falta capa de tipo "${req}"`);
      }
    });

    // Check order matches requiredOrder
    const layerTypes = currentLayers.map(l => l.type);
    const reqOrder = sys.requiredOrder;
    
    // Check order using subsequence matching
    let orderCorrect = true;
    let reqIdx = 0;
    for (let i = 0; i < layerTypes.length && reqIdx < reqOrder.length; i++) {
      if (layerTypes[i] === reqOrder[reqIdx]) {
        reqIdx++;
      }
    }
    if (reqIdx < reqOrder.length) {
      orderCorrect = false;
    }

    // Check that all layers are allowed
    const allowedTypes = sys.allowedTypes;
    currentLayers.forEach(l => {
      if (!allowedTypes.includes(l.type) && l.type !== 'Cámara de Aire') {
        errors.push(`"${l.Nombre}" (${l.type}) no es compatible con ${sys.name}`);
      }
    });

    // Position check: first should be exterior, last interior
    if (currentLayers.length >= 2) {
      const firstType = currentLayers[0].type;
      const lastType = currentLayers[currentLayers.length - 1].type;
      
      if (sysKey === 'SATE' || sysKey === 'VENTILADA' || sysKey === 'TRADICIONAL') {
        if (firstType === 'Acabado Interior') errors.push('El acabado interior no debe ser la primera capa (exterior)');
        if (lastType === 'Revestimiento') errors.push('El revestimiento no debe ser la última capa (interior)');
      }
    }

    if (!orderCorrect && errors.length === 0 && currentLayers.length > 1) {
      errors.push('El orden de las capas no coincide con el orden normativo recomendado');
    }

    // Calculate score
    const maxPoints = 100;
    let score = maxPoints;
    score -= errors.length * 15;
    if (!orderCorrect) score -= 20;
    score = Math.max(0, Math.min(100, score));

    setNormativeErrors(errors);
    setNormativeScore(score);
    return { errors, score, orderCorrect };
  }, []);

  useEffect(() => {
    const sys = CONSTRUCTION_SYSTEMS[activeSystem];
    if (!sys) return;
    const reqLayers = sys.requiredLayers;
    let allReqsMet = true;

    reqLayers.forEach((reqType, idx) => {
      const L = layers[idx];
      if (!L || L.type !== reqType) {
        allReqsMet = false;
      }
    });

    if (layers.length > reqLayers.length + 2) {
      allReqsMet = false;
    }

    setIsCertified(layers.length > 0 && allReqsMet);

    let currentPem = 0, currentMass = 0, r = 0;
    layers.forEach(l => {
      currentPem += l.PrecioNum;
      const thM = l.EspesorVirtualMM / 1000;
      currentMass += thM * l.density;
      if (l.lambda > 0) r += (thM / l.lambda);
    });

    setPem(currentPem);
    setMass(currentMass);
    setUValue(layers.length > 0 ? 1 / (0.17 + r) : 0);

    checkNormativeCompliance(layers, activeSystem);
  }, [layers, activeSystem, checkNormativeCompliance]);

  // Check missions
  useEffect(() => {
    if (layers.length === 0) return;
    
    const sys = CONSTRUCTION_SYSTEMS[activeSystem];
    if (!sys) return;

    MISSIONS.forEach(mission => {
      if (gamification.completedMissions.includes(mission.id)) return;
      
      // Special mission: energy A
      if (mission.id === 'mission_energy_a') {
        if (uValue > 0 && uValue <= 0.15 && isCertified) {
          completeMission(mission.id);
        }
        return;
      }

      if (mission.systemKey !== activeSystem) return;

      const reqOrder = mission.requiredOrder;
      const layerTypes = layers.map(l => l.type);
      
      // Check if all required types are present in order
      let allPresent = true;
      let orderIdx = 0;
      for (let i = 0; i < layerTypes.length && orderIdx < reqOrder.length; i++) {
        if (layerTypes[i] === reqOrder[orderIdx]) orderIdx++;
      }
      if (orderIdx < reqOrder.length) allPresent = false;

      if (allPresent && isCertified && normativeErrors.length === 0) {
        completeMission(mission.id);
      }
    });
  }, [layers, activeSystem, isCertified, normativeErrors, uValue]);

  const completeMission = useCallback((id: string) => {
    setGamification(prev => {
      if (prev.completedMissions.includes(id)) return prev;
      
      const mission = MISSIONS.find(m => m.id === id);
      if (!mission) return prev;

      const newXP = prev.xp + mission.xpReward;
      const levelInfo = getLevelInfo(newXP);
      const newBadge: Badge = {
        id: mission.badge,
        name: mission.name,
        icon: mission.badgeIcon,
        description: mission.description,
        unlockedAt: Date.now(),
      };

      const newState = {
        ...prev,
        xp: newXP,
        level: levelInfo.level,
        levelName: levelInfo.name,
        completedMissions: [...prev.completedMissions, id],
        badges: [...prev.badges, newBadge],
        totalConfigurations: prev.totalConfigurations + 1,
        streak: prev.streak + 1,
      };
      
      saveGamification(newState);
      return newState;
    });
    
    setShowCelebration(id);
  }, []);

  const dismissCelebration = useCallback(() => setShowCelebration(null), []);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLayers(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLayers(history[historyIndex + 1]);
    }
  };

  const saveHistory = (newLayers: Layer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLayers(newLayers);
  };

  const setSystem = (sysKey: string) => {
    setActiveSystem(sysKey);
    saveHistory([]);
    setSelectedId(null);
  };

  const addCustomMaterial = (mat: Material) => {
    setCatalog(prev => [mat, ...prev]);
  };

  const addLayer = (matId: string) => {
    const m = catalog.find(x => x.id === matId);
    if (m) {
      saveHistory([...layers, { ...m, instanceId: 'L_' + Date.now() + '_' + Math.floor(Math.random() * 1000) }]);
    }
  };

  const addAirChamber = () => {
    const airLayer: Layer = {
      id: 'AIR_' + Date.now(),
      instanceId: 'L_AIR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      Categoria: 'Cámara de Aire',
      Nombre: 'Cámara de Aire',
      Empresa: 'Sin fabricante',
      EspesorRaw: '30 mm',
      EspesorVirtualMM: 30,
      PrecioNum: 0,
      lambda: 0.025,
      density: 1,
      color: 'rgba(120,200,255,0.25)',
      icon: 'Box',
      type: 'Cámara de Aire',
      textureClass: 'air',
      textureId: 'air-chamber',
    };
    saveHistory([...layers, airLayer]);
  };

  const updateLayerThickness = (id: string, mm: number) => {
    const newLayers = layers.map(l => {
      if (l.instanceId === id) {
        return { ...l, EspesorVirtualMM: mm, EspesorRaw: `${mm} mm` };
      }
      return l;
    });
    saveHistory(newLayers);
  };

  const removeLayer = (id: string) => {
    saveHistory(layers.filter(l => l.instanceId !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveLayer = (id: string, dir: number) => {
    const idx = layers.findIndex(l => l.instanceId === id);
    const tIdx = idx + dir;
    if (tIdx >= 0 && tIdx < layers.length) {
      const newLayers = [...layers];
      const temp = newLayers[idx];
      newLayers[idx] = newLayers[tIdx];
      newLayers[tIdx] = temp;
      saveHistory(newLayers);
    }
  };

  return (
    <AppContext.Provider value={{
      catalog, layers, selectedId, hoveredId, searchTerm, activeSystem, area, isCertified, isEngineOnline,
      uValue, mass, pem, gamification, normativeErrors, normativeScore,
      setSystem, addLayer, removeLayer, moveLayer, selectLayer: setSelectedId, setHoveredId, setSearchTerm, setArea, loadCSV,
      undo, redo, canUndo: historyIndex > 0, canRedo: historyIndex < history.length - 1, addCustomMaterial,
      addAirChamber, updateLayerThickness,
      showGamification, setShowGamification, completeMission,
      showCelebration, dismissCelebration
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
