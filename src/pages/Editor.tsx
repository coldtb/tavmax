import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore, getCabinetSections } from '../store/projectStore';
import { ThreeViewer, type ThreeViewerRef } from '../components/ThreeViewer';
import { exportProjectToPDF } from '../utils/pdfExport';
import { runNestingOptimizer } from '../utils/nesting';
import type { NestingPartInput } from '../utils/nesting';
import { TemplateThumbnail } from '../components/TemplateThumbnail';
import { Sparkles, Eye, Ruler, Grid, Layers, Move, RefreshCw, Send, Check, Plus, Trash2, Box, Copy, Magnet, Printer, X, FileText, HelpCircle, Info, ChevronLeft, ChevronRight, Columns, AlignLeft, Loader2, Home, ChevronDown } from 'lucide-react';

const COLOR_PALETTE = [
  // Pastel / Warm
  '#fca5a5', '#f87171', '#ef4444', '#b91c1c', '#f97316', '#ea580c',
  // Yellow / Amber
  '#fef08a', '#f59e0b', '#d97706', '#84cc16', '#22c55e', '#16a34a',
  // Teal / Cyan / Blue
  '#2dd4bf', '#06b6d4', '#0ea5e9', '#3b82f6', '#2563eb', '#1d4ed8',
  // Purple / Pink
  '#c084fc', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#be123c',
  // Wood / Earth
  '#fafafa', '#f5f5dc', '#e5dfd3', '#c19a6b', '#8b5a2b', '#5c4033',
  // Monochromes
  '#faf9f6', '#e5e7eb', '#9ca3af', '#4b5563', '#1f2937', '#1a1a1a'
];

export const Editor: React.FC = () => {
  const {
    activeProject,
    updateActiveConfig,
    materials,
    addPartToActive,
    removePartFromActive,
    changeActiveFurnitureType,
    updateActiveParts,
    selectedModuleId,
    setSelectedModuleId,
    addModuleToActive,
    removeModuleFromActive,
    duplicateModule,
    resetModulePositions,
    alignModulesSideBySide,
    updateModulePosition,
    updateModuleRotation,
    customTemplates,
    deleteCustomTemplate,
    addCustomTemplate,
    savedLayouts,
    saveLayout,
    deleteLayout,
    loadLayout,
    clearAllModules,
  } = useProjectStore();

  const threeViewerRef = useRef<ThreeViewerRef>(null);

  const [explode, setExplode] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [openDoors, setOpenDoors] = useState(false);
  const [snapping, setSnapping] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [viewMode, setViewMode] = useState<'perspective' | 'front' | 'top' | 'side'>('perspective');
  const [showRoom, setShowRoom] = useState(() => {
    return localStorage.getItem('tavmax-show-room') === 'true';
  });
  const [roomWallColor, setRoomWallColor] = useState(() => {
    return localStorage.getItem('tavmax-room-wall-color') || '#f5f0eb';
  });
  const [roomFloorType, setRoomFloorType] = useState<'wood' | 'tile' | 'marble' | 'concrete'>(() => {
    return (localStorage.getItem('tavmax-room-floor-type') as any) || 'wood';
  });
  const [roomWidth, setRoomWidth] = useState(() => {
    const val = localStorage.getItem('tavmax-room-width');
    return val ? Number(val) : 4000;
  });
  const [roomDepth, setRoomDepth] = useState(() => {
    const val = localStorage.getItem('tavmax-room-depth');
    return val ? Number(val) : 3000;
  });
  const [roomHeight, setRoomHeight] = useState(() => {
    const val = localStorage.getItem('tavmax-room-height');
    return val ? Number(val) : 2700;
  });
  const [roomConfigExpanded, setRoomConfigExpanded] = useState(false);
  useEffect(() => {
    localStorage.setItem('tavmax-show-room', String(showRoom));
  }, [showRoom]);
  useEffect(() => {
    localStorage.setItem('tavmax-room-wall-color', roomWallColor);
  }, [roomWallColor]);
  useEffect(() => {
    localStorage.setItem('tavmax-room-floor-type', roomFloorType);
  }, [roomFloorType]);
  useEffect(() => {
    localStorage.setItem('tavmax-room-width', String(roomWidth));
  }, [roomWidth]);
  useEffect(() => {
    localStorage.setItem('tavmax-room-depth', String(roomDepth));
  }, [roomDepth]);
  useEffect(() => {
    localStorage.setItem('tavmax-room-height', String(roomHeight));
  }, [roomHeight]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(true);
  const [panelWidth, setPanelWidth] = useState(320);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(320);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startW.current = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientX - startX.current;
      setPanelWidth(Math.min(480, Math.max(180, startW.current + delta)));
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  // Mobile responsive & UX states
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'3d' | 'settings' | 'templates'>('3d');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<'all' | 'kitchen' | 'living' | 'bedroom' | 'other'>('all');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [helpTab, setHelpTab] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ moduleId: string; x: number; y: number } | null>(null);
  const [showFloatingConfig, setShowFloatingConfig] = useState<boolean>(false);

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    step1_basic: true,
    step1_legs: false,
    step2_drawers: true,
    step2_shelves: false,
    step3_doors: true,
    step3_materials: false,
    step3_cooktop: false,
    step4_position: true,
    step4_actions: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderAccordionHeader = (key: string, title: string) => {
    const isOpen = !!openSections[key];
    return (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between py-2 px-3 bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 rounded-xl text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all select-none cursor-pointer mb-2"
      >
        <span className="flex items-center gap-2">
          {key.startsWith('step1') ? '📐' :
           key.startsWith('step2') ? '📦' :
           key.startsWith('step3') ? '🎨' : '📍'} {title}
        </span>
        <ChevronDown size={14} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    );
  };

  const [savedColors, setSavedColors] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tavmax-custom-colors') || '[]');
    } catch (e) {
      return [];
    }
  });

  const addSavedColor = (color: string) => {
    if (!color) return;
    const hex = color.toLowerCase();
    if (savedColors.includes(hex)) return;
    const updated = [...savedColors, hex];
    setSavedColors(updated);
    localStorage.setItem('tavmax-custom-colors', JSON.stringify(updated));
  };

  const removeSavedColor = (color: string) => {
    const updated = savedColors.filter(c => c !== color.toLowerCase());
    setSavedColors(updated);
    localStorage.setItem('tavmax-custom-colors', JSON.stringify(updated));
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getCategoryByType = (type: string, id?: string) => {
    if (id === 'tall_kitchen' || id === 'tall_kitchen_open') return 'kitchen';
    if (['nightstand', 'nightstand_r', 'dresser', 'tall_wardrobe_drawer', 'dressing_table', 'shoe_cabinet'].includes(id || '')) return 'bedroom';
    if (['wardrobe', 'bed'].includes(type)) return 'bedroom';
    if (['kitchen_lower', 'kitchen_upper', 'sink', 'built_in_hood', 'fridge', 'cooktop', 'hood', 'microwave', 'oven', 'dishwasher'].includes(type)) return 'kitchen';
    if (['bookshelf', 'cabinet', 'tv_unit', 'vitrine'].includes(type)) return 'living';
    return 'other';
  };

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  // Predefined templates
  const templates = [
    {
      id: 'wdb',
      name: 'Шүүгээ / Шкаф',
      type: 'wardrobe' as const,
      config: {
        width: 1800,
        height: 2200,
        depth: 600,
        shelves: 2,
        drawers: 0,
        doors: 3,
        partitions: 1,
        hasLegs: false,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'ktl',
      name: 'Гал тогоо (Доод)',
      type: 'kitchen_lower' as const,
      config: {
        width: 1200,
        height: 850,
        depth: 600,
        shelves: 2,
        drawers: 0,
        doors: 3,
        partitions: 1,
        hasLegs: true,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6',
        countertopType: 'stone'
      }
    },
    {
      id: 'open_lower',
      name: '▭ Нээлттэй доод шүүгээ',
      type: 'kitchen_lower' as const,
      config: {
        width: 600,
        height: 850,
        depth: 600,
        shelves: 1,
        drawers: 0,
        doors: 0,
        hasLegs: true,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6',
        countertopType: 'stone'
      }
    },
    {
      id: 'open_upper',
      name: '▭ Нээлттэй дээд шүүгээ',
      type: 'kitchen_upper' as const,
      config: {
        width: 600,
        height: 700,
        depth: 350,
        shelves: 2,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'tall_kitchen',
      name: '↕ Холбогч өндөр шүүгээ',
      type: 'wardrobe' as const,
      config: {
        width: 600,
        height: 2100,
        depth: 600,
        shelves: 4,
        drawers: 0,
        doors: 2,
        hasLegs: false,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'tall_kitchen_open',
      name: '↕ Нээлттэй холбогч шүүгээ',
      type: 'wardrobe' as const,
      config: {
        width: 600,
        height: 2100,
        depth: 600,
        shelves: 5,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'island_stone',
      name: '🏝️ Арал – Чулуун тавцантай',
      type: 'kitchen_lower' as const,
      config: {
        width: 1500,
        height: 850,
        depth: 900,
        shelves: 2,
        drawers: 3,
        doors: 4,
        hasLegs: false,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6',
        countertopType: 'stone'
      }
    },
    {
      id: 'island_wood',
      name: '🏝️ Арал – Модон тавцантай',
      type: 'kitchen_lower' as const,
      config: {
        width: 1500,
        height: 850,
        depth: 900,
        shelves: 2,
        drawers: 3,
        doors: 4,
        hasLegs: false,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6',
        countertopType: 'wood'
      }
    },
    {
      id: 'snk',
      name: 'Угаалтууртай шүүгээ',
      type: 'sink' as const,
      config: {
        width: 800,
        height: 850,
        depth: 600,
        shelves: 0,
        drawers: 0,
        doors: 2,
        hasLegs: true,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6',
        countertopType: 'stone'
      }
    },
    {
      id: 'ktu',
      name: 'Гал тогоо (Дээд)',
      type: 'kitchen_upper' as const,
      config: {
        width: 1200,
        height: 700,
        depth: 350,
        shelves: 2,
        drawers: 0,
        doors: 2,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'frg',
      name: 'Хөргөгч (Fridge)',
      type: 'fridge' as const,
      config: {
        width: 900,
        height: 1800,
        depth: 700,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#8e939e'
      }
    },
    {
      id: 'ckp',
      name: 'Плиткэн зуух',
      type: 'cooktop' as const,
      config: {
        width: 800,
        height: 850,
        depth: 600,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: true,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6',
        countertopType: 'stone'
      }
    },
    {
      id: 'hnd',
      name: 'Хэншүү сорогч',
      type: 'hood' as const,
      config: {
        width: 800,
        height: 700,
        depth: 500,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#525252'
      }
    },
    {
      id: 'bih',
      name: 'Суурилуулсан сорогчтой шүүгээ',
      type: 'built_in_hood' as const,
      config: {
        width: 600,
        height: 700,
        depth: 350,
        shelves: 1,
        drawers: 0,
        doors: 2,
        hasLegs: false,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'mcv',
      name: 'Печний шүүгээ (Microwave)',
      type: 'microwave' as const,
      config: {
        width: 600,
        height: 720,
        depth: 350,
        shelves: 0,
        drawers: 0,
        doors: 2,
        hasLegs: false,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#1f1f1f'
      }
    },
    {
      id: 'ovn',
      name: '🔥 Духовой шкаф (Oven)',
      type: 'oven' as const,
      config: {
        width: 600,
        height: 600,
        depth: 600,
        shelves: 0,
        drawers: 0,
        doors: 1,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'dwsh',
      name: '🚿 Угаалгын машин (Dishwasher)',
      type: 'dishwasher' as const,
      config: {
        width: 600,
        height: 850,
        depth: 600,
        shelves: 0,
        drawers: 0,
        doors: 1,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'bsh',
      name: 'Номын тавиур',
      type: 'bookshelf' as const,
      config: {
        width: 1000,
        height: 1800,
        depth: 300,
        shelves: 5,
        drawers: 0,
        doors: 0,
        hasLegs: true,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'tvu',
      name: 'ТВ тавиур',
      type: 'cabinet' as const,
      config: {
        width: 1600,
        height: 500,
        depth: 450,
        shelves: 2,
        drawers: 2,
        doors: 2,
        hasLegs: true,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'tvs',
      name: 'ТВ Зурагт (55" TV)',
      type: 'tv_unit' as const,
      config: {
        width: 1200,
        height: 700,
        depth: 250,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-4',
        doorMaterialId: 'mat-4',
        color: '#1a1a1a'
      }
    },
    {
      id: 'vit',
      name: 'Шилэн витрин (Vitrine)',
      type: 'vitrine' as const,
      config: {
        width: 450,
        height: 1800,
        depth: 400,
        shelves: 5,
        drawers: 0,
        doors: 1,
        hasLegs: false,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-8',
        color: '#faf9f6',
        glassLeft: true,
        glassRight: false
      }
    },

    // ─── Унтлагын өрөөний тавилга ───
    {
      id: 'bed_double',
      name: '🛏️ Хос ор (Double Bed)',
      type: 'bed' as const,
      config: {
        width: 1600,
        height: 900,
        depth: 2100,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'bed_single',
      name: '🛏️ Ганц ор (Single Bed)',
      type: 'bed' as const,
      config: {
        width: 900,
        height: 800,
        depth: 2000,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'bed_king',
      name: '🛏️ Том ор (King Bed)',
      type: 'bed' as const,
      config: {
        width: 2000,
        height: 1000,
        depth: 2200,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'nightstand',
      name: '🛏️ Шөнийн тумбочка (Зүүн)',
      type: 'cabinet' as const,
      config: {
        width: 450,
        height: 500,
        depth: 400,
        shelves: 0,
        drawers: 2,
        doors: 0,
        hasLegs: true,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'nightstand_r',
      name: '🛏️ Шөнийн тумбочка (Баруун)',
      type: 'cabinet' as const,
      config: {
        width: 450,
        height: 500,
        depth: 400,
        shelves: 1,
        drawers: 1,
        doors: 1,
        hasLegs: true,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'dresser',
      name: '🪟 Комод / Будалт',
      type: 'cabinet' as const,
      config: {
        width: 1200,
        height: 850,
        depth: 500,
        shelves: 0,
        drawers: 6,
        doors: 0,
        partitions: 1,
        hasLegs: true,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'tall_wardrobe_drawer',
      name: '👔 Хувцасны шкаф + Шургуулга',
      type: 'wardrobe' as const,
      config: {
        width: 1200,
        height: 2200,
        depth: 600,
        shelves: 3,
        drawers: 3,
        doors: 2,
        partitions: 1,
        hasLegs: false,
        handleType: 'modern' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'dressing_table',
      name: '💄 Будлааны ширээ',
      type: 'cabinet' as const,
      config: {
        width: 1000,
        height: 750,
        depth: 450,
        shelves: 0,
        drawers: 4,
        doors: 0,
        partitions: 1,
        hasLegs: true,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },
    {
      id: 'shoe_cabinet',
      name: '👟 Гутлын тавиур',
      type: 'cabinet' as const,
      config: {
        width: 900,
        height: 1100,
        depth: 350,
        shelves: 4,
        drawers: 1,
        doors: 2,
        hasLegs: true,
        handleType: 'minimal' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    },

    {
      id: 'empty_custom',
      name: 'Хоосон загвар (Custom)',
      type: 'custom' as const,
      config: {
        width: 1200,
        height: 1200,
        depth: 500,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none' as const,
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      }
    }
  ];

  const standardParts = [
    { name: 'Хажуу хана (Шкаф)', width: 600, height: 2200, category: 'Хажуу хана' as const, edgeBanding: '2mm' as const, quantity: 1, materialId: 'mat-1' },
    { name: 'Хажуу хана (Шүүгээ)', width: 600, height: 750, category: 'Хажуу хана' as const, edgeBanding: '2mm' as const, quantity: 1, materialId: 'mat-1' },
    { name: 'Дээд/Доод таг', width: 600, height: 1200, category: 'Дээд тавиур' as const, edgeBanding: '1mm' as const, quantity: 1, materialId: 'mat-1' },
    { name: 'Дотор тавиур', width: 580, height: 800, category: 'Дээд тавиур' as const, edgeBanding: '1mm' as const, quantity: 1, materialId: 'mat-1' },
    { name: 'Шкафны хаалга', width: 450, height: 2100, category: 'Хаалга' as const, edgeBanding: '2mm' as const, quantity: 1, materialId: 'mat-3' },
    { name: 'Шүүгээний хаалга', width: 450, height: 720, category: 'Хаалга' as const, edgeBanding: '2mm' as const, quantity: 1, materialId: 'mat-3' },
    { name: 'Шургуулганы нүүр', width: 600, height: 180, category: 'Шургуулга' as const, edgeBanding: '2mm' as const, quantity: 1, materialId: 'mat-3' },
    { name: 'Ар тал (ХДФ цагаан)', width: 1200, height: 2200, category: 'Ар тал' as const, edgeBanding: 'none' as const, quantity: 1, materialId: 'mat-7' },
  ];

  // Custom part form states
  const [newPartName, setNewPartName] = useState('Нэмэлт хавтан');
  const [newPartWidth, setNewPartWidth] = useState(600);
  const [newPartHeight, setNewPartHeight] = useState(400);
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartCategory, setNewPartCategory] = useState<'Хажуу хана' | 'Дээд тавиур' | 'Доод тавиур' | 'Хаалга' | 'Шургуулга' | 'Ар тал' | 'Хуваалт'>('Дээд тавиур');
  const [newPartMaterialId, setNewPartMaterialId] = useState('mat-1');
  const [newPartEdge, setNewPartEdge] = useState<'none' | '1mm' | '2mm' | 'all-sides'>('1mm');
  const [newPartXOffset, setNewPartXOffset] = useState(0);
  const [newPartYOffset, setNewPartYOffset] = useState(200);
  const [newPartZOffset, setNewPartZOffset] = useState(0);
  const [showAddPartForm, setShowAddPartForm] = useState(false);
  const [expandedPartId, setExpandedPartId] = useState<string | null>(null);
  // Save module template inline state
  const [saveName, setSaveName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Save full layout inline state
  const [layoutSaveName, setLayoutSaveName] = useState('');
  const [layoutSaveSuccess, setLayoutSaveSuccess] = useState(false);
  // Print spec sheet modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [editorPdfLoading, setEditorPdfLoading] = useState(false);

  const handleSendEmailSimulate = () => {
    if (!emailToSend || !emailToSend.includes('@')) {
      alert('Зөв цахим шуудангийн хаяг оруулна уу.');
      return;
    }
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      alert(`Сонгосон PDF тохиргоог ${emailToSend} хаяг руу амжилттай илгээлээ!`);
      setEmailToSend('');
    }, 2000);
  };

  const handleDownloadProductionPDF = async () => {
    if (!activeProject || editorPdfLoading) return;
    setEditorPdfLoading(true);
    try {
      const partsByMaterial: { [matId: string]: NestingPartInput[] } = {};
      activeProject.parts.forEach((p) => {
        if (!partsByMaterial[p.materialId]) {
          partsByMaterial[p.materialId] = [];
        }
        partsByMaterial[p.materialId].push({
          id: p.id,
          name: p.name,
          width: p.width,
          height: p.height,
          quantity: p.quantity,
          materialId: p.materialId,
        });
      });

      let userSheetW = 2440;
      let userSheetH = 1220;
      let userKerf = 4;
      let userMargin = 10;
      let userAllowRotation = true;

      if (typeof window !== 'undefined') {
        const savedSize = localStorage.getItem('tavmax-nesting-sheet-size');
        if (savedSize === '2750x1830' || savedSize === '2440x1220' || savedSize === '3050x1830') {
          const [w, h] = savedSize.split('x').map(x => parseInt(x));
          userSheetW = w;
          userSheetH = h;
        }
        const savedKerf = localStorage.getItem('tavmax-nesting-kerf');
        if (savedKerf) userKerf = parseInt(savedKerf);

        const savedMargin = localStorage.getItem('tavmax-nesting-margin');
        if (savedMargin) userMargin = parseInt(savedMargin);

        const savedRotation = localStorage.getItem('tavmax-nesting-allow-rotation');
        if (savedRotation !== null) userAllowRotation = savedRotation === 'true';
      }

      const allSheets: any[] = [];
      let globalSheetId = 1;
      let totalBoardCost = 0;

      Object.entries(partsByMaterial).forEach(([matId, groupParts]) => {
        const mat = materials.find((m) => m.id === matId) || materials[0];
        const isCountertopMat = matId === 'mat-ct-wood' || matId === 'mat-ct-stone';
        const nestSheetW = isCountertopMat ? 4600 : userSheetW;
        const nestSheetH = isCountertopMat ? 600 : userSheetH;
        const nestRotation = isCountertopMat ? false : userAllowRotation;
        const nestMargin = isCountertopMat ? 0 : userMargin;

        const groupPartsInput = groupParts.map((p) => {
          const partW = isCountertopMat ? Math.max(p.width, p.height) : p.width;
          const partH = isCountertopMat ? Math.min(p.width, p.height) : p.height;
          return {
            ...p,
            width: partW,
            height: partH,
          };
        });

        const sheets = runNestingOptimizer(groupPartsInput, {
          sheetWidth: nestSheetW,
          sheetHeight: nestSheetH,
          kerf: userKerf,
          margin: nestMargin,
          allowRotation: nestRotation,
        });

        sheets.forEach((sheet) => {
          allSheets.push({
            ...sheet,
            sheetId: globalSheetId++,
            materialId: matId,
          });
        });

        totalBoardCost += sheets.length * (mat?.price || 0);
      });

      let totalEdgeBandingCost = 0;
      activeProject.parts.forEach((p) => {
        if (p.edgeBanding !== 'none') {
          const perimeter = (p.width + p.height) * 2;
          const rate = p.edgeBanding === '2mm' ? 1.5 : 0.8;
          totalEdgeBandingCost += perimeter * rate * p.quantity;
        }
      });

      const hingesCount = activeProject.config.doors * 3;
      const tracksCount = activeProject.config.drawers;
      const hardwareCost = hingesCount * 8000 + tracksCount * 25000 + 40000;
      const subtotal = totalBoardCost + totalEdgeBandingCost + hardwareCost;

      const canvas = document.querySelector('canvas');
      const liveDataUrl = canvas ? canvas.toDataURL('image/png') : null;
      const threeImageDataUrl = liveDataUrl || sessionStorage.getItem('tavmax-three-screenshot');

      await exportProjectToPDF(
        { ...activeProject, price: subtotal },
        materials,
        allSheets,
        threeImageDataUrl
      );
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setEditorPdfLoading(false);
    }
  };

  const handleAddCustomPart = (e: React.FormEvent) => {
    e.preventDefault();
    addPartToActive({
      name: newPartName,
      width: newPartWidth,
      height: newPartHeight,
      quantity: newPartQty,
      category: newPartCategory,
      materialId: newPartMaterialId,
      edgeBanding: newPartEdge,
      xOffset: newPartXOffset,
      yOffset: newPartYOffset,
      zOffset: newPartZOffset,
    } as any);
    setShowAddPartForm(false);
    // Reset to defaults
    setNewPartName('Нэмэлт хавтан');
    setNewPartWidth(600);
    setNewPartHeight(400);
    setNewPartXOffset(0);
    setNewPartYOffset(200);
    setNewPartZOffset(0);
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <Layers size={48} className="text-neutral-500 mb-4" />
        <h2 className="font-display font-bold text-white text-lg">Сонгосон төсөл алга байна</h2>
        <p className="text-neutral-400 text-xs mt-1">Эхлээд хянах самбараас төсөл сонгох эсвэл шинийг үүсгэнэ үү.</p>
      </div>
    );
  }

  const selectedMod = (activeProject.modules || []).find((m) => m.id === selectedModuleId) || (activeProject.modules || [])[0];
  const config = selectedMod ? selectedMod.config : activeProject.config;

  // Handle AI Prompt simulation
  const handleAiPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiSuccess(false);

    // Simulate AI inference delays and mapping parameters
    setTimeout(() => {
      setAiLoading(false);
      setAiSuccess(true);
      const text = aiPrompt.toLowerCase();

      if (text.includes('гал тогоо') || text.includes('гал тогооны')) {
        updateActiveConfig({
          width: 2400,
          height: 850,
          depth: 600,
          shelves: 3,
          drawers: 4,
          doors: 2,
          hasLegs: true,
          materialId: 'mat-2', // Egger walnut
          doorMaterialId: 'mat-4', // Matte Black Acrylic
        });
      } else if (text.includes('шкаф') || text.includes('хувцасны')) {
        updateActiveConfig({
          width: 1800,
          height: 2200,
          depth: 600,
          shelves: 8,
          drawers: 4,
          doors: 3,
          hasLegs: false,
          materialId: 'mat-1', // Egger Oak
          doorMaterialId: 'mat-3', // White Gloss
        });
      } else if (text.includes('номын') || text.includes('тавиур')) {
        updateActiveConfig({
          width: 1200,
          height: 1800,
          depth: 300,
          shelves: 6,
          drawers: 0,
          doors: 0,
          hasLegs: true,
          materialId: 'mat-5', // Plywood
          doorMaterialId: 'mat-5',
        });
      } else {
        // Generic fallback values
        updateActiveConfig({
          width: 1600,
          height: 1200,
          depth: 500,
          shelves: 5,
          drawers: 2,
          doors: 2,
          hasLegs: false,
          materialId: 'mat-3',
          doorMaterialId: 'mat-4'
        });
      }

      setAiPrompt('');
      setTimeout(() => setAiSuccess(false), 3000);
    }, 1500);
  };

  // Filter built-in and custom templates based on room categories
  const filteredBuiltInTemplates = templates.filter((tpl) => {
    if (selectedTemplateCategory === 'all') return true;
    return getCategoryByType(tpl.type, tpl.id) === selectedTemplateCategory;
  });

  const filteredCustomTemplates = (customTemplates || []).filter((tpl) => {
    if (selectedTemplateCategory === 'all') return true;
    return getCategoryByType(tpl.type, tpl.id) === selectedTemplateCategory;
  });

  
  const renderConfigurator = (isFloating = false) => {
    if (!selectedMod) return null;
    return (
          <div className={isFloating ? "flex flex-col gap-5 p-5 h-full overflow-y-auto" : "bg-[#12141c] border border-white/5 rounded-2xl p-5 flex flex-col gap-5"} style={isFloating ? { scrollbarWidth: 'thin' } : undefined}>
            {/* Wizard Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex flex-col">
                <h3 className="font-display font-bold text-white text-xs flex items-center gap-1.5">
                  <span>🛠️ Шүүгээний Тохиргоо</span>
                  <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full truncate max-w-[100px]" title={selectedMod.name}>
                    {selectedMod.name}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-neutral-950 border border-amber-500/20 rounded-lg text-amber-400 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  title="Тохиргооны хэвлэмэл хуудас"
                  type="button"
                >
                  <Printer size={10} />
                  <span>Хэвлэх</span>
                </button>
                {isFloating && (
                  <button
                    onClick={() => setShowFloatingConfig(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Хаах"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-4 gap-0.5 text-center border-b border-white/5 pb-3 shrink-0 select-none">
              {[
                { step: 1, label: 'Их бие', title: 'Их биеийн хэмжээсүүд' },
                { step: 2, label: 'Дотор', title: 'Тавиур, Шургуулга' },
                { step: 3, label: 'Нүүр/Өнгө', title: 'Хаалга, Өнгө материал' },
                { step: 4, label: 'Байршил', title: '3D орон зайн байршил' },
              ].map((s) => {
                const isAct = activeStep === s.step;
                const isDone = activeStep > s.step;
                return (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step)}
                    className={`flex flex-col items-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                      isAct
                        ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400 font-extrabold'
                        : isDone
                        ? 'text-neutral-405 hover:text-white'
                        : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                    title={s.title}
                    type="button"
                  >
                    <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                      isAct ? 'bg-amber-500 text-neutral-950' : isDone ? 'bg-neutral-800 text-amber-400 border border-amber-500/30' : 'bg-neutral-900 text-neutral-500 border border-white/5'
                    }`}>
                      {s.step}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-tight truncate w-full max-w-[48px]">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Step Contents Container */}
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {activeStep === 1 && (
                <>
                  <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Info size={11} className="text-amber-500 shrink-0" />
                    <span>Алхам 1: Их биеийн үндсэн хэмжээсүүд</span>
                  </div>

                  {renderAccordionHeader('step1_basic', 'Үндсэн хэмжээс')}
                  {openSections.step1_basic && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Width */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
                          <span className="flex items-center gap-1">
                            Өргөн (Width)
                            <span className="group relative cursor-pointer text-neutral-500 hover:text-amber-500">
                              <HelpCircle size={11} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 bg-neutral-900 border border-white/10 text-[9px] text-neutral-300 p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 font-normal leading-normal shadow-xl">
                                Шүүгээний зүүн хажуугаас баруун хажуу хүртэлх нийт хэмжээ (мм-ээр)
                              </span>
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={config.width}
                              onChange={(e) => updateActiveConfig({ width: parseInt(e.target.value) || 0 })}
                              onBlur={(e) => {
                                const val = Math.max(200, Math.min(3000, parseInt(e.target.value) || 200));
                                updateActiveConfig({ width: val });
                              }}
                              className="w-16 bg-[#0c0d12] border border-white/10 rounded px-1.5 py-0.5 text-right text-amber-500 font-bold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-neutral-500 font-semibold">мм</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={200}
                          max={3000}
                          step={50}
                          value={config.width}
                          onChange={(e) => updateActiveConfig({ width: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex gap-1.5 mt-0.5">
                          {[600, 800, 1200].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updateActiveConfig({ width: val })}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                config.width === val
                                  ? 'bg-amber-500 text-neutral-950 border-amber-500'
                                  : 'bg-[#0c0d12]/60 text-neutral-400 border-white/5 hover:text-white hover:bg-neutral-800'
                              }`}
                            >
                              {val}мм
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Height */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
                          <span className="flex items-center gap-1">
                            Өндөр (Height)
                            <span className="group relative cursor-pointer text-neutral-500 hover:text-amber-500">
                              <HelpCircle size={11} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 bg-neutral-900 border border-white/10 text-[9px] text-neutral-300 p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 font-normal leading-normal shadow-xl">
                                Шүүгээний доод ирмэгээс дээд таг хүртэлх нийт өндөр (мм-ээр, хөлийн өндөр багтсан)
                              </span>
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={config.height}
                              onChange={(e) => updateActiveConfig({ height: parseInt(e.target.value) || 0 })}
                              onBlur={(e) => {
                                const val = Math.max(200, Math.min(2800, parseInt(e.target.value) || 200));
                                updateActiveConfig({ height: val });
                              }}
                              className="w-16 bg-[#0c0d12] border border-white/10 rounded px-1.5 py-0.5 text-right text-amber-500 font-bold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-neutral-500 font-semibold">мм</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={200}
                          max={2800}
                          step={50}
                          value={config.height}
                          onChange={(e) => updateActiveConfig({ height: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex gap-1.5 mt-0.5">
                          {[850, 1800, 2200].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updateActiveConfig({ height: val })}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                config.height === val
                                  ? 'bg-amber-500 text-neutral-950 border-amber-500'
                                  : 'bg-[#0c0d12]/60 text-neutral-455 border-white/5 hover:text-white hover:bg-neutral-800'
                              }`}
                            >
                              {val}мм
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Depth */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
                          <span className="flex items-center gap-1">
                            Гүн (Depth)
                            <span className="group relative cursor-pointer text-neutral-500 hover:text-amber-500">
                              <HelpCircle size={11} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 bg-neutral-900 border border-white/10 text-[9px] text-neutral-300 p-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 font-normal leading-normal shadow-xl">
                                Шүүгээний урд хаалганы гадна талын нүүрнээс арын хавтан хүртэлх гүн (мм-ээр)
                              </span>
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={config.depth}
                              onChange={(e) => updateActiveConfig({ depth: parseInt(e.target.value) || 0 })}
                              onBlur={(e) => {
                                const val = Math.max(200, Math.min(1000, parseInt(e.target.value) || 200));
                                updateActiveConfig({ depth: val });
                              }}
                              className="w-16 bg-[#0c0d12] border border-white/10 rounded px-1.5 py-0.5 text-right text-amber-500 font-bold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-neutral-500 font-semibold">мм</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={200}
                          max={1000}
                          step={50}
                          value={config.depth}
                          onChange={(e) => updateActiveConfig({ depth: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex gap-1.5 mt-0.5">
                          {[350, 600, 700].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updateActiveConfig({ depth: val })}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                                config.depth === val
                                  ? 'bg-amber-500 text-neutral-950 border-amber-500'
                                  : 'bg-[#0c0d12]/60 text-neutral-455 border-white/5 hover:text-white hover:bg-neutral-800'
                              }`}
                            >
                              {val}мм
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {renderAccordionHeader('step1_legs', 'Нарийвчилсан тохиргоо')}
                  {openSections.step1_legs && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Leg status */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="hasLegs"
                            checked={config.hasLegs}
                            onChange={(e) => updateActiveConfig({ hasLegs: e.target.checked })}
                            className="w-4 h-4 bg-[#0c0d12] border border-white/10 rounded accent-amber-500 cursor-pointer"
                          />
                          <label htmlFor="hasLegs" className="text-xs text-neutral-300 font-medium select-none cursor-pointer flex items-center gap-1.5">
                            <span>Шүүгээнд хөл суурилуулах (100мм өндөртэй хөл)</span>
                          </label>
                        </div>

                        {config.hasLegs && (
                          <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">
                              Хөлний загвар сонгох:
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateActiveConfig({ legStyle: 'plinth' })}
                                className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                                  (config.legStyle || 'plinth') === 'plinth'
                                    ? 'bg-amber-500 text-neutral-950 border-amber-500'
                                    : 'bg-[#0c0d12] text-neutral-400 border-white/5 hover:text-white'
                                }`}
                                type="button"
                              >
                                Хаалттай (Plinth)
                              </button>
                              <button
                                onClick={() => updateActiveConfig({ legStyle: 'cylinder' })}
                                className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                                  config.legStyle === 'cylinder'
                                    ? 'bg-amber-500 text-neutral-950 border-amber-500'
                                    : 'bg-[#0c0d12] text-neutral-400 border-white/5 hover:text-white'
                                }`}
                                type="button"
                              >
                                Ил задгай (Cylinder)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Glass Left/Right options for Vitrine */}
                      {selectedMod.type === 'vitrine' && (
                        <div className="flex flex-col gap-2.5 border-t border-white/5 pt-3">
                          <label className="text-xs text-neutral-400 font-semibold">
                            Хажуу талуудын шил
                          </label>
                          <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={!!config.glassLeft}
                                onChange={(e) => updateActiveConfig({ glassLeft: e.target.checked })}
                                className="w-4 h-4 bg-[#0c0d12] border border-white/10 rounded accent-amber-500 cursor-pointer"
                              />
                              <span>Зүүн хажуу шилэн (Glass Left)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={!!config.glassRight}
                                onChange={(e) => updateActiveConfig({ glassRight: e.target.checked })}
                                className="w-4 h-4 bg-[#0c0d12] border border-white/10 rounded accent-amber-500 cursor-pointer"
                              />
                              <span>Баруун хажуу шилэн (Glass Right)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* TV Unit options */}
                      {selectedMod.type === 'tv_unit' && (
                        <div className="flex flex-col gap-2.5 border-t border-white/5 pt-3">
                          <label className="text-xs text-neutral-400 font-semibold">
                            Зурагтын суурь
                          </label>
                          <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={config.tvHasBase !== false}
                                onChange={(e) => updateActiveConfig({ tvHasBase: e.target.checked })}
                                className="w-4 h-4 bg-[#0c0d12] border border-white/10 rounded accent-amber-500 cursor-pointer"
                              />
                              <span>ТВ суурь хөлтэй байх</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeStep === 2 && (
                <>
                  <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Info size={11} className="text-amber-500 shrink-0" />
                    <span>Алхам 2: Дотор тавиур, шургуулга болон хуваалт</span>
                  </div>

                  {renderAccordionHeader('step2_drawers', 'Шургуулга & Хуваалт')}
                  {openSections.step2_drawers && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Shelves count */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-neutral-400 font-semibold">Тавиурын тоо</label>
                          <input
                            type="number"
                            min={0}
                            max={15}
                            value={config.shelves}
                            onChange={(e) => updateActiveConfig({ shelves: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Drawers count */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-neutral-400 font-semibold">Шургуулганы тоо</label>
                          {['kitchen_lower', 'cabinet', 'wardrobe', 'custom'].includes(selectedMod.type) ? (
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={config.drawers}
                              onChange={(e) => updateActiveConfig({ drawers: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                            />
                          ) : (
                            <div className="w-full bg-[#0c0d12]/30 border border-white/5 rounded-xl px-3 py-2 text-neutral-600 text-[10px] font-semibold italic flex items-center justify-center min-h-[38px] select-none" title="Энэ шүүгээний загвар шургуулга дэмжихгүй">
                              Энэ загварт боломжгүй
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vertical Partitions / Dividers Config — available for all module types */}
                      {selectedMod && (
                        <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                          {(() => {
                            const getDefaultPartitions = (type: string, cfg: any) => {
                              if (type === 'wardrobe') return cfg.doors > 1 ? cfg.doors - 1 : 0;
                              if (type === 'cabinet') return cfg.doors > 0 ? (cfg.drawers > 0 ? cfg.doors : cfg.doors - 1) : 0;
                              return 0;
                            };
                            const defaultPartitions = getDefaultPartitions(selectedMod.type, config);
                            const partitions = config.partitions !== undefined ? Number(config.partitions) : defaultPartitions;
                            const totalW = Number(config.width);

                            let dPositions = config.dividerPositions || [];
                            if (dPositions.length !== partitions) {
                              dPositions = [];
                              for (let i = 0; i < partitions; i++) {
                                dPositions.push(Math.round((i + 1) * totalW / (partitions + 1)));
                              }
                            }

                            return (
                              <>
                                <div className="flex justify-between items-center text-xs">
                                  <label className="text-neutral-400 font-semibold">Босоо хуваалтын тоо</label>
                                  <span className="text-amber-500 font-bold">{partitions}</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={6}
                                  step={1}
                                  value={partitions}
                                  onChange={(e) => updateActiveConfig({ partitions: parseInt(e.target.value) })}
                                  className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />

                                {partitions > 0 && (
                                  <div className="flex flex-col gap-3 mt-2 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl">
                                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Хуваалтуудын байрлал (мм)</span>
                                    {dPositions.map((pos, i) => {
                                      const minVal = i === 0 ? 100 : dPositions[i - 1] + 100;
                                      const maxVal = i === partitions - 1 ? totalW - 100 : dPositions[i + 1] - 100;

                                      return (
                                        <div key={i} className="flex flex-col gap-1">
                                          <div className="flex justify-between items-center text-[10px] text-neutral-400">
                                            <span>Босоо Хуваалт {i + 1}</span>
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                value={pos}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 0;
                                                  const newPos = [...dPositions];
                                                  newPos[i] = val;
                                                  updateActiveConfig({ dividerPositions: newPos });
                                                }}
                                                onBlur={(e) => {
                                                  const val = Math.max(minVal, Math.min(maxVal, parseInt(e.target.value) || minVal));
                                                  const newPos = [...dPositions];
                                                  newPos[i] = val;
                                                  updateActiveConfig({ dividerPositions: newPos });
                                                }}
                                                className="w-14 bg-[#0c0d12] border border-white/10 rounded px-1 py-0.5 text-right text-white font-semibold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              />
                                              <span>мм</span>
                                            </div>
                                          </div>
                                          <input
                                            type="range"
                                            min={minVal}
                                            max={Math.max(minVal, maxVal)}
                                            step={5}
                                            value={pos}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value);
                                              const newPos = [...dPositions];
                                              newPos[i] = val;
                                              updateActiveConfig({ dividerPositions: newPos });
                                            }}
                                            className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {renderAccordionHeader('step2_shelves', 'Тавиур байршуулах тохиргоо')}
                  {openSections.step2_shelves && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Shelves spacing/height sliders */}
                      {config.shelves >= 0 && (() => {
                        const shelvesCount = Number(config.shelves) || 0;
                        const legHeight = config.hasLegs ? 100 : 0;
                        const insideHeight = Number(config.height) - legHeight - 36;
                        let sPositions = config.shelfPositions || [];
                        const sections = getCabinetSections(Number(config.width), config, selectedMod.type);
                        const isMultiSection = selectedMod.type === 'wardrobe' || selectedMod.type === 'bookshelf' || ((selectedMod.type === 'kitchen_lower' || selectedMod.type === 'kitchen_upper') && sections.length > 1);

                        const storedCountsRaw: number[] | undefined = (config as any).sectionShelfCounts;
                        const hasValidStoredCounts = isMultiSection && storedCountsRaw &&
                          storedCountsRaw.length > 0 &&
                          storedCountsRaw.reduce((a, b) => a + b, 0) === shelvesCount;

                        if (sPositions.length !== shelvesCount) {
                          if (hasValidStoredCounts && isMultiSection) {
                            sPositions = [];
                            storedCountsRaw!.forEach((cnt) => {
                              const step = insideHeight / (cnt + 1);
                              for (let i = 0; i < cnt; i++) {
                                sPositions.push(Math.round((i + 1) * step));
                              }
                            });
                          } else if (isMultiSection) {
                            const sections = getCabinetSections(Number(config.width), config, selectedMod.type);
                            sPositions = [];
                            sections.forEach((_sec, sIdx) => {
                              const shelvesInSec = Math.floor(shelvesCount / sections.length) + (sIdx < shelvesCount % sections.length ? 1 : 0);
                              const step = insideHeight / (shelvesInSec + 1);
                              for (let i = 0; i < shelvesInSec; i++) {
                                sPositions.push(Math.round((i + 1) * step));
                              }
                            });
                          } else {
                            sPositions = [];
                            const step = insideHeight / (shelvesCount + 1);
                            for (let i = 0; i < shelvesCount; i++) {
                              sPositions.push(Math.round((i + 1) * step));
                            }
                          }
                        }

                        if (isMultiSection) {
                          const sections = getCabinetSections(Number(config.width), config, selectedMod.type);
                          const secCounts: number[] = sections.map((_, sIdx) =>
                            Math.floor(shelvesCount / sections.length) + (sIdx < shelvesCount % sections.length ? 1 : 0)
                          );
                          const finalSecCounts: number[] = storedCountsRaw && storedCountsRaw.length === sections.length && storedCountsRaw.reduce((a,b)=>a+b,0) === shelvesCount
                            ? storedCountsRaw
                            : secCounts;

                          let currentGlobalIdx = 0;

                          return (
                            <div className="flex flex-col gap-3 mt-1 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl col-span-2">
                              <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Тавиурын өндөр (секцээр)</span>
                              {sections.map((sec, sIdx) => {
                                const shelvesInSec = finalSecCounts[sIdx] ?? 0;
                                const secStartIdx = currentGlobalIdx;
                                currentGlobalIdx += shelvesInSec;
                                const secStart = secStartIdx;

                                const addShelfToSection = () => {
                                  const newCounts = [...finalSecCounts];
                                  newCounts[sIdx] = shelvesInSec + 1;
                                  const rebuiltPos: number[] = [];
                                  newCounts.forEach((cnt) => {
                                    const step = insideHeight / (cnt + 1);
                                    for (let i = 0; i < cnt; i++) {
                                      rebuiltPos.push(Math.round((i + 1) * step));
                                    }
                                  });
                                  updateActiveConfig({ shelves: shelvesCount + 1, shelfPositions: rebuiltPos, sectionShelfCounts: newCounts } as any);
                                };

                                const removeShelfFromSection = () => {
                                  if (shelvesInSec === 0) return;
                                  const newCounts = [...finalSecCounts];
                                  newCounts[sIdx] = shelvesInSec - 1;
                                  const rebuiltPos: number[] = [];
                                  newCounts.forEach((cnt) => {
                                    if (cnt > 0) {
                                      const step = insideHeight / (cnt + 1);
                                      for (let i = 0; i < cnt; i++) {
                                        rebuiltPos.push(Math.round((i + 1) * step));
                                      }
                                    }
                                  });
                                  updateActiveConfig({ shelves: shelvesCount - 1, shelfPositions: rebuiltPos, sectionShelfCounts: newCounts } as any);
                                };

                                return (
                                  <div key={sIdx} className="flex flex-col gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-neutral-400 font-bold uppercase">Секц {sIdx + 1}</span>
                                        <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                                          {shelvesInSec} тавиур
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={removeShelfFromSection}
                                          disabled={shelvesInSec === 0}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5 hover:border-red-500/30"
                                          title="Тавиур хасах"
                                          type="button"
                                        >
                                          −
                                        </button>
                                        <button
                                          onClick={addShelfToSection}
                                          disabled={shelvesInSec >= 12}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5 hover:border-emerald-500/30"
                                          title="Тавиур нэмэх"
                                          type="button"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    {shelvesInSec === 0 ? (
                                      <div className="text-[9px] text-neutral-600 text-center py-1 italic">Тавиур байхгүй — + дарж нэмэх</div>
                                    ) : (
                                      Array.from({ length: shelvesInSec }).map((_, localIdx) => {
                                        const globalIdx = secStart + localIdx;
                                        const pos = sPositions[globalIdx];
                                        const prevInSec = localIdx === 0 ? undefined : sPositions[secStart + localIdx - 1];
                                        const nextInSec = localIdx === shelvesInSec - 1 ? undefined : sPositions[secStart + localIdx + 1];
                                        const minVal = prevInSec !== undefined ? prevInSec + 50 : 50;
                                        const maxVal = nextInSec !== undefined ? nextInSec - 50 : insideHeight - 50;

                                        return (
                                          <div key={localIdx} className="flex flex-col gap-1 pl-2">
                                            <div className="flex justify-between items-center text-[10px] text-neutral-400">
                                              <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                                                <span>Тавиур {localIdx + 1}</span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="number"
                                                  value={pos || 50}
                                                  onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newPos = [...sPositions];
                                                    newPos[globalIdx] = val;
                                                    updateActiveConfig({ shelfPositions: newPos });
                                                  }}
                                                  onBlur={(e) => {
                                                    const val = Math.max(minVal, Math.min(maxVal, parseInt(e.target.value) || minVal));
                                                    const newPos = [...sPositions];
                                                    newPos[globalIdx] = val;
                                                    updateActiveConfig({ shelfPositions: newPos });
                                                  }}
                                                  className="w-14 bg-[#0c0d12] border border-white/10 rounded px-1 py-0.5 text-right text-white font-semibold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span>мм</span>
                                              </div>
                                            </div>
                                            <input
                                              type="range"
                                              min={minVal}
                                              max={Math.max(minVal, maxVal)}
                                              step={5}
                                              value={pos || 50}
                                              onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const newPos = [...sPositions];
                                                newPos[globalIdx] = val;
                                                updateActiveConfig({ shelfPositions: newPos });
                                              }}
                                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                            />
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-3 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl col-span-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Тавиурын өндөр (мм, доороос)</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    if (shelvesCount === 0) {
                                      updateActiveConfig({ shelves: 1, shelfPositions: [Math.round(insideHeight / 2)] });
                                    } else {
                                      const lastPos = sPositions[shelvesCount - 1];
                                      const newShelfPos = Math.round((lastPos + insideHeight) / 2);
                                      updateActiveConfig({ shelves: shelvesCount + 1, shelfPositions: [...sPositions, newShelfPos] });
                                    }
                                  }}
                                  disabled={shelvesCount >= 15}
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5 hover:border-emerald-500/30"
                                  title="Тавиур нэмэх"
                                  type="button"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => {
                                    if (shelvesCount === 0) return;
                                    const newPos = sPositions.slice(0, -1);
                                    updateActiveConfig({ shelves: shelvesCount - 1, shelfPositions: newPos });
                                  }}
                                  disabled={shelvesCount === 0}
                                  className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5 hover:border-red-500/30"
                                  title="Тавиур хасах"
                                  type="button"
                                >
                                  −
                                </button>
                              </div>
                            </div>
                            {shelvesCount === 0 ? (
                              <div className="text-[9px] text-neutral-600 text-center py-2 italic">Тавиур байхгүй — + дарж нэмэх</div>
                            ) : (
                              sPositions.map((pos, i) => {
                                const minVal = i === 0 ? 50 : sPositions[i - 1] + 50;
                                const maxVal = i === shelvesCount - 1 ? insideHeight - 50 : sPositions[i + 1] - 50;
                                return (
                                  <div key={i} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-[10px] text-neutral-400">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                                        <span>Тавиур {i + 1}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={pos}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            const newPos = [...sPositions];
                                            newPos[i] = val;
                                            updateActiveConfig({ shelfPositions: newPos });
                                          }}
                                          onBlur={(e) => {
                                            const val = Math.max(minVal, Math.min(maxVal, parseInt(e.target.value) || minVal));
                                            const newPos = [...sPositions];
                                            newPos[i] = val;
                                            updateActiveConfig({ shelfPositions: newPos });
                                          }}
                                          className="w-14 bg-[#0c0d12] border border-white/10 rounded px-1 py-0.5 text-right text-white font-semibold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span>мм</span>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min={minVal}
                                      max={Math.max(minVal, maxVal)}
                                      step={5}
                                      value={pos}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const newPos = [...sPositions];
                                        newPos[i] = val;
                                        updateActiveConfig({ shelfPositions: newPos });
                                      }}
                                      className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {activeStep === 3 && (
                <>
                  <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Info size={11} className="text-amber-500 shrink-0" />
                    <span>Алхам 3: Хаалга, сорогч, өнгө материал</span>
                  </div>

                  {renderAccordionHeader('step3_doors', 'Хаалганы тохиргоо')}
                  {openSections.step3_doors && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      <div className="flex justify-between items-center bg-[#0c0d12]/40 border border-white/5 p-2 px-3 rounded-xl mb-1">
                        <span className="text-xs text-neutral-300 font-semibold">Хаалга, шургуулга онгойлгох</span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={openDoors}
                            onChange={(e) => setOpenDoors(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-white"></div>
                        </label>
                      </div>

                      {/* Countertop selector — wood / stone / none */}
                      {(selectedMod.type === 'custom' || selectedMod.type === 'kitchen_lower' || selectedMod.type === 'cooktop' || selectedMod.type === 'sink' || selectedMod.type === 'corner_lower') && (
                        <div className="flex flex-col gap-1.5 border border-white/5 bg-[#0c0d12]/30 p-3 rounded-xl">
                          <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">🪨 Тавцан (Countertop)</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['none', 'stone', 'wood'] as const).map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => updateActiveConfig({ countertopType: v })}
                                className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  (config.countertopType || 'none') === v
                                    ? 'bg-amber-500 border-amber-400 text-black'
                                    : 'bg-[#0c0d12] border-white/10 text-neutral-300 hover:border-amber-400/50'
                                }`}
                              >
                                {v === 'none' ? 'Байхгүй' : v === 'stone' ? '🪨 Чулуун' : '🪵 Модон'}
                              </button>
                            ))}
                          </div>
                          {(config.countertopType && config.countertopType !== 'none') && (
                            <div className="flex gap-2 mt-1">
                              {([25, 40] as const).map((mm) => (
                                <button
                                  key={mm}
                                  type="button"
                                  onClick={() => updateActiveConfig({ countertopThickness: mm })}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                                    (config.countertopThickness ?? 40) === mm
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                      : 'bg-[#0c0d12] border-white/10 text-neutral-400 hover:border-amber-500/40'
                                  }`}
                                >
                                  {mm === 25 ? '25мм' : '40мм'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Doors config or count */}
                      {(selectedMod.type === 'custom' || selectedMod.type === 'kitchen_lower' || selectedMod.type === 'kitchen_upper' || selectedMod.type === 'built_in_hood' || selectedMod.type === 'sink' || selectedMod.type === 'cabinet' || selectedMod.type === 'vitrine' || selectedMod.type === 'cooktop' || selectedMod.type === 'wardrobe' || selectedMod.type === 'corner_lower' || selectedMod.type === 'corner_upper') && (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs text-neutral-400 font-semibold">Хаалганы тохиргоо</label>
                            {(selectedMod.type !== 'cabinet' || (config.partitions !== undefined && Number(config.partitions) > 0)) && (
                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-neutral-400 select-none hover:text-white transition-all">
                                <input
                                  type="checkbox"
                                  checked={config.customDoors !== undefined ? !!config.customDoors : (selectedMod.type === 'custom')}
                                  onChange={(e) => {
                                    const isCustom = e.target.checked;
                                    if (isCustom) {
                                      const currentDrawers = config.drawers || 0;
                                      updateActiveConfig({
                                        customDoors: true,
                                        leftDrawers: currentDrawers,
                                        rightDrawers: 0,
                                        doors: ((config.leftDoor !== false ? 1 : 0) + (config.rightDoor !== false ? 1 : 0))
                                      });
                                    } else {
                                      updateActiveConfig({
                                        customDoors: false
                                      });
                                    }
                                  }}
                                  className="w-3.5 h-3.5 bg-[#0c0d12] border border-white/10 rounded accent-amber-500 cursor-pointer"
                                />
                                <span>Тус бүрээр тохируулах</span>
                              </label>
                            )}
                          </div>

                          {((config.customDoors !== undefined ? config.customDoors : (selectedMod.type === 'custom'))) ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex flex-col gap-2.5 mt-1 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-neutral-300 font-medium">Зүүн хаалганы тоо</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curr = typeof config.leftDoor === 'number' ? config.leftDoor : (config.leftDoor !== false ? 1 : 0);
                                        const nextVal = Math.max(0, curr - 1);
                                        const rightVal = typeof config.rightDoor === 'number' ? config.rightDoor : (config.rightDoor !== false ? 1 : 0);
                                        updateActiveConfig({
                                          leftDoor: nextVal,
                                          doors: nextVal + rightVal
                                        });
                                      }}
                                      className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center text-xs text-white font-bold">
                                      {typeof config.leftDoor === 'number' ? config.leftDoor : (config.leftDoor !== false ? 1 : 0)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curr = typeof config.leftDoor === 'number' ? config.leftDoor : (config.leftDoor !== false ? 1 : 0);
                                        const nextVal = Math.min(10, curr + 1);
                                        const rightVal = typeof config.rightDoor === 'number' ? config.rightDoor : (config.rightDoor !== false ? 1 : 0);
                                        updateActiveConfig({
                                          leftDoor: nextVal,
                                          doors: nextVal + rightVal
                                        });
                                      }}
                                      className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-neutral-300 font-medium">Баруун хаалганы тоо</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curr = typeof config.rightDoor === 'number' ? config.rightDoor : (config.rightDoor !== false ? 1 : 0);
                                        const nextVal = Math.max(0, curr - 1);
                                        const leftVal = typeof config.leftDoor === 'number' ? config.leftDoor : (config.leftDoor !== false ? 1 : 0);
                                        updateActiveConfig({
                                          rightDoor: nextVal,
                                          doors: leftVal + nextVal
                                        });
                                      }}
                                      className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                    >
                                      −
                                    </button>
                                    <span className="w-6 text-center text-xs text-white font-bold">
                                      {typeof config.rightDoor === 'number' ? config.rightDoor : (config.rightDoor !== false ? 1 : 0)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const curr = typeof config.rightDoor === 'number' ? config.rightDoor : (config.rightDoor !== false ? 1 : 0);
                                        const nextVal = Math.min(10, curr + 1);
                                        const leftVal = typeof config.leftDoor === 'number' ? config.leftDoor : (config.leftDoor !== false ? 1 : 0);
                                        updateActiveConfig({
                                          rightDoor: nextVal,
                                          doors: leftVal + nextVal
                                        });
                                      }}
                                      className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Drawers config (if cabinet/custom/kitchen_lower) */}
                                {(selectedMod.type === 'kitchen_lower' || selectedMod.type === 'custom' || selectedMod.type === 'cabinet') && (
                                  <>
                                    <div className="h-px bg-white/5 my-1" />
                                    
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-neutral-300 font-medium">Зүүн шургуулганы тоо</span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curr = Number(config.leftDrawers) || 0;
                                            const nextVal = Math.max(0, curr - 1);
                                            const rightVal = Number(config.rightDrawers) || 0;
                                            updateActiveConfig({
                                              leftDrawers: nextVal,
                                              drawers: nextVal + rightVal
                                            });
                                          }}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                        >
                                          −
                                        </button>
                                        <span className="w-6 text-center text-xs text-white font-bold">
                                          {Number(config.leftDrawers) || 0}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curr = Number(config.leftDrawers) || 0;
                                            const nextVal = Math.min(10, curr + 1);
                                            const rightVal = Number(config.rightDrawers) || 0;
                                            updateActiveConfig({
                                              leftDrawers: nextVal,
                                              drawers: nextVal + rightVal
                                            });
                                          }}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-neutral-300 font-medium">Баруун шургуулганы тоо</span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curr = Number(config.rightDrawers) || 0;
                                            const nextVal = Math.max(0, curr - 1);
                                            const leftVal = Number(config.leftDrawers) || 0;
                                            updateActiveConfig({
                                              rightDrawers: nextVal,
                                              drawers: leftVal + nextVal
                                            });
                                          }}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                        >
                                          −
                                        </button>
                                        <span className="w-6 text-center text-xs text-white font-bold">
                                          {Number(config.rightDrawers) || 0}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const curr = Number(config.rightDrawers) || 0;
                                            const nextVal = Math.min(10, curr + 1);
                                            const leftVal = Number(config.leftDrawers) || 0;
                                            updateActiveConfig({
                                              rightDrawers: nextVal,
                                              drawers: leftVal + nextVal
                                            });
                                          }}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-850 hover:bg-emerald-500/20 hover:text-emerald-400 text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-1 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl">
                              <label className="text-[11px] text-neutral-400 font-semibold">Хаалганы тоо</label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateActiveConfig({ doors: Math.max(0, Number(config.doors) - 1) })}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0c0d12] border border-white/10 text-white text-base font-bold hover:border-amber-500/60 transition-all"
                                >
                                  −
                                </button>
                                <span className="flex-1 text-center text-white text-sm font-bold">{Number(config.doors)}</span>
                                <button
                                  type="button"
                                  onClick={() => updateActiveConfig({ doors: Math.min(10, Number(config.doors) + 1) })}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0c0d12] border border-white/10 text-white text-base font-bold hover:border-amber-500/60 transition-all"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Door width/height sliders — show for supported types if doors > 0 */}
                          {(['custom', 'kitchen_lower', 'kitchen_upper', 'cabinet', 'vitrine', 'wardrobe', 'sink', 'built_in_hood', 'cooktop', 'bookshelf'].includes(selectedMod.type) && Number(config.doors) > 0) && (() => {
                            const baseH = config.hasLegs ? Number(config.height) - 100 : Number(config.height);
                            const defaultDWidth = Number(config.width) >= 800 ? (Number(config.width) - 10) / 2 : (Number(config.width) - 10);

                            return (
                              <div className="grid grid-cols-2 gap-4 mt-2 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-[11px] text-neutral-400">
                                    <span>Хаалганы өргөн</span>
                                    <div className="flex items-center gap-0.5">
                                      <input
                                        type="number"
                                        value={config.doorWidth || Math.round(defaultDWidth)}
                                        onChange={(e) => updateActiveConfig({ doorWidth: parseInt(e.target.value) || 0, customDoors: true })}
                                        onBlur={(e) => {
                                          const val = Math.max(100, Math.min(Number(config.width), parseInt(e.target.value) || 100));
                                          updateActiveConfig({ doorWidth: val, customDoors: true });
                                        }}
                                        className="w-12 bg-[#0c0d12] border border-white/10 rounded px-1 py-0.5 text-right text-amber-500 font-bold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <span>мм</span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min={100}
                                    max={Number(config.width)}
                                    step={10}
                                    value={config.doorWidth || Math.round(defaultDWidth)}
                                    onChange={(e) => updateActiveConfig({ doorWidth: parseInt(e.target.value), customDoors: true })}
                                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-[11px] text-neutral-400">
                                    <span>Хаалганы өндөр</span>
                                    <div className="flex items-center gap-0.5">
                                      <input
                                        type="number"
                                        value={config.doorHeight || Math.round(baseH - 10)}
                                        onChange={(e) => updateActiveConfig({ doorHeight: parseInt(e.target.value) || 0, customDoors: true })}
                                        onBlur={(e) => {
                                          const val = Math.max(100, Math.min(baseH, parseInt(e.target.value) || 100));
                                          updateActiveConfig({ doorHeight: val, customDoors: true });
                                        }}
                                        className="w-12 bg-[#0c0d12] border border-white/10 rounded px-1 py-0.5 text-right text-amber-500 font-bold outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <span>мм</span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min={100}
                                    max={baseH}
                                    step={10}
                                    value={config.doorHeight || Math.round(baseH - 10)}
                                    onChange={(e) => updateActiveConfig({ doorHeight: parseInt(e.target.value), customDoors: true })}
                                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                  />
                                </div>
                              </div>
                            );
                          })()}

                        {/* Door/Drawer Style Selection (Хавтгай vs Классик) */}
                        {(Number(config.doors) > 0 || Number(config.drawers) > 0) && (
                          <div className="flex flex-col gap-1.5 mt-1 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl">
                            <label className="text-[11px] text-neutral-400 font-semibold">Хаалга / Шургуулганы загвар</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateActiveConfig({ doorStyle: 'flat' })}
                                className={`py-1.5 px-3 rounded-lg text-center text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                                  (config.doorStyle || 'flat') === 'flat'
                                    ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-md'
                                    : 'bg-[#0c0d12]/50 text-neutral-400 border-white/5 hover:text-white hover:bg-white/[0.02]'
                                }`}
                              >
                                Хавтгай (Flat)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateActiveConfig({ doorStyle: 'classic' })}
                                className={`py-1.5 px-3 rounded-lg text-center text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                                  config.doorStyle === 'classic'
                                    ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-md'
                                    : 'bg-[#0c0d12]/50 text-neutral-400 border-white/5 hover:text-white hover:bg-white/[0.02]'
                                }`}
                              >
                                Классик (Classic)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      )}

                      {/* Glass door options for upper cabinets and bookshelves */}
                      {(selectedMod.type === 'bookshelf' || selectedMod.type === 'kitchen_upper' || selectedMod.type === 'built_in_hood' || selectedMod.type === 'corner_upper') && (
                        <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                          <label className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5">
                            🪟 Шилэн хаалганы төрөл
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['none', 'clear', 'frosted'] as const).map((gt) => (
                              <button
                                key={gt}
                                onClick={() => updateActiveConfig({ glassType: gt })}
                                className={`py-2 px-2 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                  (config.glassType || 'none') === gt
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                    : 'bg-[#0c0d12] border-white/10 text-neutral-400 hover:border-white/20'
                                }`}
                                type="button"
                              >
                                {gt === 'none' ? 'Модон' : gt === 'clear' ? '🔷 Шилэн' : '❄️ Матт шил'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {renderAccordionHeader('step3_materials', 'Өнгө & Хавтангийн материал')}
                  {openSections.step3_materials && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Outer body material */}
                      <div className="flex flex-col gap-3">
                        <span className="text-xs text-neutral-400 font-semibold">Их биеийн материал:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {materials.map((mat) => (
                            <button
                              key={mat.id}
                              onClick={() => updateActiveConfig({ materialId: mat.id, bodyColor: undefined })}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-medium transition-all text-left cursor-pointer ${
                                config.materialId === mat.id
                                  ? 'border-amber-500 bg-amber-500/5 text-white'
                                  : 'border-white/5 bg-[#0c0d12] text-neutral-400 hover:text-white'
                              }`}
                              type="button"
                            >
                              <span className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: mat.color }} />
                              <span className="truncate">{mat.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Body color palette */}
                        <div className="flex flex-col gap-2 pt-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-neutral-500 font-semibold">Их биеийн өнгө:</span>
                            <div className="flex items-center gap-1.5">
                              {config.bodyColor && (
                                <button
                                  onClick={() => updateActiveConfig({ bodyColor: undefined })}
                                  className="text-[8px] text-neutral-500 hover:text-red-400 transition-all cursor-pointer px-1.5 py-0.5 bg-neutral-805 rounded"
                                  title="Өнгө арилгах"
                                  type="button"
                                >
                                  ✕ Арилгах
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const activeColor = config.bodyColor || (materials.find(m => m.id === config.materialId)?.color || '#ffffff');
                                  addSavedColor(activeColor);
                                }}
                                className="text-[8px] text-neutral-400 hover:text-amber-500 transition-all cursor-pointer px-1.5 py-0.5 bg-neutral-850 hover:bg-neutral-800 rounded flex items-center gap-1 border border-white/5 font-semibold"
                                title="Энэ өнгийг хадгалах"
                                type="button"
                              >
                                + Хадгалах
                              </button>
                              <div className="relative flex items-center gap-1 bg-[#0c0d12] border border-white/10 px-2 py-0.5 rounded-lg">
                                <span className="text-[8px] text-neutral-400 font-bold uppercase">Сонгох</span>
                                <input
                                  type="color"
                                  value={config.bodyColor || (materials.find(m => m.id === config.materialId)?.color || '#ffffff')}
                                  onChange={(e) => updateActiveConfig({ bodyColor: e.target.value })}
                                  className="w-3.5 h-3.5 border-0 p-0 bg-transparent cursor-pointer rounded outline-none"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-6 gap-1.5">
                            {COLOR_PALETTE.map((color) => {
                              const isActive = config.bodyColor === color;
                              return (
                                <button
                                  key={color}
                                  onClick={() => updateActiveConfig({ bodyColor: color })}
                                  className={`aspect-square rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                                    isActive ? 'border-white ring-1 ring-amber-500 scale-105 shadow' : 'border-transparent hover:border-white/20'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                  type="button"
                                />
                              );
                            })}
                          </div>

                          {savedColors.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2 border-t border-white/5 pt-2">
                              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Миний хадгалсан өнгөнүүд:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {savedColors.map((color) => {
                                  const isActive = config.bodyColor?.toLowerCase() === color.toLowerCase();
                                  return (
                                    <div key={color} className="relative group">
                                      <button
                                        onClick={() => updateActiveConfig({ bodyColor: color })}
                                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                                          isActive ? 'border-white ring-1 ring-amber-500 scale-105 shadow' : 'border-transparent hover:border-white/20'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                        type="button"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeSavedColor(color);
                                        }}
                                        className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 items-center justify-center bg-red-600 text-white rounded-full text-[8px] border border-black cursor-pointer font-bold"
                                        title="Устгах"
                                        type="button"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Door panels material */}
                      <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                        <span className="text-xs text-neutral-400 font-semibold">Хаалга / Нүүрний материал:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {materials.map((mat) => (
                            <button
                              key={mat.id}
                              onClick={() => updateActiveConfig({ doorMaterialId: mat.id, color: undefined })}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-medium transition-all text-left cursor-pointer ${
                                config.doorMaterialId === mat.id
                                  ? 'border-amber-500 bg-amber-500/5 text-white'
                                  : 'border-white/5 bg-[#0c0d12] text-neutral-400 hover:text-white'
                              }`}
                              type="button"
                            >
                              <span className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: mat.color }} />
                              <span className="truncate">{mat.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Door Color Picker */}
                      <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-neutral-400 font-semibold">Хаалга / Нүүрний өнгө:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                addSavedColor(config.color || '#ffffff');
                              }}
                              className="text-[8px] text-neutral-400 hover:text-amber-500 transition-all cursor-pointer px-1.5 py-0.5 bg-neutral-850 hover:bg-neutral-800 rounded flex items-center gap-1 border border-white/5 font-semibold"
                              title="Энэ өнгийг хадгалах"
                              type="button"
                            >
                              + Хадгалах
                            </button>
                            <div className="relative flex items-center gap-1 bg-[#0c0d12] border border-white/10 px-2 py-0.5 rounded-lg">
                              <span className="text-[8px] text-neutral-400 font-bold uppercase">Сонгох</span>
                              <input
                                type="color"
                                value={config.color || '#ffffff'}
                                onChange={(e) => updateActiveConfig({ color: e.target.value })}
                                className="w-3.5 h-3.5 border-0 p-0 bg-transparent cursor-pointer rounded outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {COLOR_PALETTE.map((color) => {
                            const isActive = config.color === color;
                            return (
                              <button
                                key={color}
                                onClick={() => updateActiveConfig({ color })}
                                className={`aspect-square rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                                  isActive ? 'border-white ring-1 ring-amber-500 scale-105 shadow' : 'border-transparent hover:border-white/20'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                                type="button"
                              />
                            );
                          })}
                        </div>

                        {savedColors.length > 0 && (
                          <div className="flex flex-col gap-1.5 mt-2 border-t border-white/5 pt-2">
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Миний хадгалсан өнгөнүүд:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {savedColors.map((color) => {
                                const isActive = config.color?.toLowerCase() === color.toLowerCase();
                                return (
                                  <div key={color} className="relative group">
                                    <button
                                      onClick={() => updateActiveConfig({ color })}
                                      className={`w-6 h-6 rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                                        isActive ? 'border-white ring-1 ring-amber-500 scale-105 shadow' : 'border-transparent hover:border-white/20'
                                      }`}
                                      style={{ backgroundColor: color }}
                                      title={color}
                                      type="button"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeSavedColor(color);
                                      }}
                                      className="absolute -top-1 -right-1 hidden group-hover:flex w-3.5 h-3.5 items-center justify-center bg-red-600 text-white rounded-full text-[8px] border border-black cursor-pointer font-bold"
                                      title="Устгах"
                                      type="button"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {renderAccordionHeader('step3_cooktop', 'Плитк & Сорогч')}
                  {openSections.step3_cooktop && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Cooktop stove toggle & burner size/count controls */}
                      {selectedMod.type !== 'cooktop' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="hasCooktop"
                            checked={!!config.hasCooktop}
                            onChange={(e) => updateActiveConfig({ hasCooktop: e.target.checked })}
                            className="w-4 h-4 bg-[#0c0d12] border border-white/10 rounded accent-amber-500 cursor-pointer"
                          />
                          <label htmlFor="hasCooktop" className="text-xs text-neutral-300 font-medium select-none cursor-pointer flex items-center gap-1">
                            🔥 Плиткэн зуух суурилуулах
                          </label>
                        </div>
                      )}

                      {(selectedMod.type === 'cooktop' || !!config.hasCooktop) && (
                        <div className="flex flex-col gap-3 bg-[#0c0d12]/50 p-3 rounded-xl">
                          <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide">🔥 Плиткэн зуухны тохиргоо</p>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-400">Пластикийн тоо</label>
                            <div className="flex gap-2">
                              {([2, 4] as const).map((n) => (
                                <button
                                  key={n}
                                  onClick={() => updateActiveConfig({ burnerCount: n })}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    (config.burnerCount ?? 4) === n
                                      ? 'bg-amber-500 border-amber-500 text-white'
                                      : 'bg-neutral-800/60 border-white/10 text-neutral-300 hover:bg-neutral-700'
                                  }`}
                                  type="button"
                                >
                                  {n} ширхэг
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cooktop Width */}
                          <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-neutral-400">Плиткний өргөн</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={200}
                                  max={2400}
                                  step={10}
                                  value={config.cooktopWidth ?? (selectedMod.type === 'cooktop' ? config.width : config.width - 60)}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v) && v >= 200) updateActiveConfig({ cooktopWidth: v });
                                  }}
                                  className="w-16 px-2 py-1 rounded-lg text-xs font-bold text-white bg-[#0c0d12] border border-white/10 focus:outline-none focus:border-amber-500/60 transition-all text-center"
                                />
                                <span className="text-[10px] text-amber-400 font-semibold">мм</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={200}
                              max={Math.max(1200, config.width)}
                              step={10}
                              value={config.cooktopWidth ?? (selectedMod.type === 'cooktop' ? config.width : config.width - 60)}
                              onChange={(e) => updateActiveConfig({ cooktopWidth: parseInt(e.target.value) })}
                              className="w-full h-1.5 rounded-full accent-amber-500 cursor-pointer"
                            />
                          </div>

                          {/* Cooktop Depth */}
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-neutral-400">Плиткний урт (гүн)</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={200}
                                  max={1200}
                                  step={10}
                                  value={config.cooktopDepth ?? (selectedMod.type === 'cooktop' ? config.depth + 20 : config.depth - 40)}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v) && v >= 200) updateActiveConfig({ countertopDepth: v });
                                  }}
                                  className="w-16 px-2 py-1 rounded-lg text-xs font-bold text-white bg-[#0c0d12] border border-white/10 focus:outline-none focus:border-amber-500/60 transition-all text-center"
                                />
                                <span className="text-[10px] text-amber-400 font-semibold">мм</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={200}
                              max={Math.max(800, config.depth + 100)}
                              step={10}
                              value={config.cooktopDepth ?? (selectedMod.type === 'cooktop' ? config.depth + 20 : config.depth - 40)}
                              onChange={(e) => updateActiveConfig({ cooktopDepth: parseInt(e.target.value) })}
                              className="w-full h-1.5 rounded-full accent-amber-500 cursor-pointer"
                            />
                          </div>

                          {/* Cooktop X Offset */}
                          <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-neutral-400">Байршил: Зүүн ⟷ Баруун</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={config.cooktopXOffset ?? 0}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v)) updateActiveConfig({ cooktopXOffset: v });
                                  }}
                                  className="w-16 px-2 py-1 rounded-lg text-xs font-bold text-white bg-[#0c0d12] border border-white/10 focus:outline-none focus:border-amber-500/60 transition-all text-center"
                                />
                                <span className="text-[10px] text-amber-400 font-semibold">мм</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={-Math.max(0, Math.round((config.width - (config.cooktopWidth ?? (selectedMod.type === 'cooktop' ? config.width : config.width - 60))) / 2))}
                              max={Math.max(0, Math.round((config.width - (config.cooktopWidth ?? (selectedMod.type === 'cooktop' ? config.width : config.width - 60))) / 2))}
                              step={10}
                              value={config.cooktopXOffset ?? 0}
                              onChange={(e) => updateActiveConfig({ cooktopXOffset: parseInt(e.target.value) })}
                              className="w-full h-1.5 rounded-full accent-amber-500 cursor-pointer"
                            />
                          </div>

                          {/* Cooktop Z Offset */}
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-neutral-400">Байршил: Хойш ⟷ Урагш</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={config.cooktopZOffset ?? 0}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v)) updateActiveConfig({ cooktopZOffset: v });
                                  }}
                                  className="w-16 px-2 py-1 rounded-lg text-xs font-bold text-white bg-[#0c0d12] border border-white/10 focus:outline-none focus:border-amber-500/60 transition-all text-center"
                                />
                                <span className="text-[10px] text-amber-400 font-semibold">мм</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={-Math.max(0, Math.round((config.depth - (config.cooktopDepth ?? (selectedMod.type === 'cooktop' ? config.depth + 20 : config.depth - 40))) / 2))}
                              max={Math.max(0, Math.round((config.depth - (config.cooktopDepth ?? (selectedMod.type === 'cooktop' ? config.depth + 20 : config.depth - 40))) / 2))}
                              step={10}
                              value={config.cooktopZOffset ?? 0}
                              onChange={(e) => updateActiveConfig({ cooktopZOffset: parseInt(e.target.value) })}
                              className="w-full h-1.5 rounded-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeStep === 4 && (
                <>
                  <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Info size={11} className="text-amber-500 shrink-0" />
                    <span>Алхам 4: 3D орон зай дахь байрлал болон хадгалалт</span>
                  </div>

                  {renderAccordionHeader('step4_position', '3D Орон зай дахь байрлал')}
                  {openSections.step4_position && (
                    <div className="flex flex-col gap-4 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Y coordinate */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-300">
                          <span>Өндөр / Давхарлах (Y тэнхлэг)</span>
                          <span className="text-amber-500 font-bold">{selectedMod.yOffset} мм</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2500}
                          step={50}
                          value={selectedMod.yOffset}
                          onChange={(e) => updateModulePosition(selectedMod.id, selectedMod.xOffset, parseInt(e.target.value), selectedMod.zOffset)}
                          className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      {/* Rotation (Y-axis) */}
                      <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                        <div className="flex justify-between text-xs font-semibold text-neutral-300">
                          <span>Эргэлт ⟳ (Y тэнхлэг)</span>
                          <span className="text-amber-500 font-bold">
                            {Math.round(((selectedMod.rotation ?? 0) * 180) / Math.PI)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={Math.round(((selectedMod.rotation ?? 0) * 180) / Math.PI)}
                          onChange={(e) => updateModuleRotation(selectedMod.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex gap-1 mt-0.5">
                          {[0, 90, 180, 270].map((deg) => (
                            <button
                              key={deg}
                              type="button"
                              onClick={() => updateModuleRotation(selectedMod.id, deg)}
                              className={`flex-1 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                                Math.round(((selectedMod.rotation ?? 0) * 180) / Math.PI) === deg
                                  ? 'bg-amber-500 text-neutral-950'
                                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              }`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                        <button
                          type="button"
                          onClick={() => updateModulePosition(selectedMod.id, selectedMod.xOffset, 0, selectedMod.zOffset)}
                          className="py-2.5 bg-neutral-850 hover:bg-neutral-800 text-white font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/5"
                        >
                          Шал руу буулгах
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateModule(selectedMod.id)}
                          className="py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          Шүүгээ хувилах
                        </button>
                      </div>
                    </div>
                  )}

                  {renderAccordionHeader('step4_actions', 'Төслийг хадгалах, экспортлох')}
                  {openSections.step4_actions && (
                    <div className="flex flex-col gap-3 bg-[#0c0d12]/30 p-3 rounded-xl border border-white/5 mb-3">
                      {/* Save as box template */}
                      <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-amber-500/10 rounded-xl p-3">
                        <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                          📦 Шүүгээг загвар болгон хадгалах
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Загварын нэр бичих..."
                            className="flex-1 bg-[#0c0d12] border border-white/10 focus:border-amber-500/60 rounded-lg px-2.5 py-1 text-white text-xs outline-none transition-all"
                          />
                          <button
                            type="button"
                            disabled={saveSuccess}
                            onClick={() => {
                              const name = saveName.trim() || selectedMod.name;
                              addCustomTemplate(name, selectedMod.type, selectedMod.config);
                              setSaveName('');
                              setSaveSuccess(true);
                              setTimeout(() => setSaveSuccess(false), 2000);
                            }}
                            className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer text-[9px] uppercase tracking-wider ${
                              saveSuccess
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-amber-500 text-neutral-950 hover:bg-amber-600'
                            }`}
                          >
                            {saveSuccess ? '✓' : 'Хадгалах'}
                          </button>
                        </div>
                      </div>

                      {/* Save full layout */}
                      <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-cyan-500/10 rounded-xl p-3">
                        <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex justify-between">
                          <span>🏗️ Бүтэн байрлалыг хадгалах</span>
                          <span className="text-neutral-500 normal-case font-normal">{(activeProject.modules || []).length} шүүгээ</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={layoutSaveName}
                            onChange={(e) => setLayoutSaveName(e.target.value)}
                            placeholder="Байршлын нэр бичих..."
                            className="flex-1 bg-[#0c0d12] border border-white/10 focus:border-cyan-500/60 rounded-lg px-2.5 py-1 text-white text-xs outline-none transition-all"
                          />
                          <button
                            type="button"
                            disabled={layoutSaveSuccess}
                            onClick={() => {
                              const name = layoutSaveName.trim() || `${activeProject.name} layout`;
                              saveLayout(name);
                              setLayoutSaveName('');
                              setLayoutSaveSuccess(true);
                              setTimeout(() => setLayoutSaveSuccess(false), 2000);
                            }}
                            className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer text-[9px] uppercase tracking-wider ${
                              layoutSaveSuccess
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-cyan-500 text-white hover:bg-cyan-600'
                            }`}
                          >
                            {layoutSaveSuccess ? '✓' : 'Хадгалах'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>


            {/* Stepper Navigation Footer */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3.5 mt-1 shrink-0 select-none">
              <button
                onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                disabled={activeStep === 1}
                className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 disabled:cursor-not-allowed text-neutral-300 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer border border-white/5"
                type="button"
              >
                <ChevronLeft size={12} />
                <span>Өмнөх</span>
              </button>
              <span className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wider">
                Алхам {activeStep} / 4
              </span>
              <button
                onClick={() => setActiveStep(prev => Math.min(4, prev + 1))}
                disabled={activeStep === 4}
                className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:hover:bg-amber-500 disabled:cursor-not-allowed text-neutral-950 font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/5"
                type="button"
              >
                <span>Дараах</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        );
  };

return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden col-span-1 flex gap-1 bg-[#12141c] p-1 rounded-xl border border-white/5 shrink-0">
        <button
          onClick={() => setMobileTab('3d')}
          className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
            mobileTab === '3d'
              ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          👁️ 3D Загвар
        </button>

        <button
          onClick={() => setMobileTab('templates')}
          className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'templates'
              ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          📦 Загварууд
        </button>
      </div>

      {/* LEFT COLUMN: Static Built-in & Custom templates sidebar (col-span-3 on desktop) */}
      <div
        className={`lg:col-span-3 flex flex-col bg-[#12141c] border border-white/5 rounded-2xl overflow-hidden shadow-2xl ${
          isMobile
            ? mobileTab === 'templates'
              ? 'flex h-[75vh]'
              : 'hidden'
            : 'flex max-h-[920px]'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/5 bg-[#12141c] sticky top-0 z-10">
            <Box size={13} className="text-amber-500 shrink-0" />
            <span className="font-bold text-white text-xs">Бэлэн загварууд</span>
            <span className="ml-auto text-[9px] text-neutral-500 font-semibold bg-neutral-800 px-1.5 py-0.5 rounded">{filteredBuiltInTemplates.length}</span>
          </div>

          {/* Өрөөний тохиргоо (Room Settings) */}
          <div className="border-b border-white/5 bg-[#171b26]/50">
            <button
              onClick={() => setRoomConfigExpanded(!roomConfigExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-all cursor-pointer"
              type="button"
            >
              <div className="flex items-center gap-2">
                <Home size={13} className="text-emerald-400 shrink-0" />
                <span className="font-bold text-white text-xs">🏠 ӨРӨӨНИЙ ХЭМЖЭЭ, ОРЧИН</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold transition-all duration-200 ${roomConfigExpanded ? 'bg-emerald-500 text-neutral-950 rotate-0' : 'bg-neutral-800 text-neutral-400'}`}>
                {roomConfigExpanded ? 'НЭЭЛТТЭЙ' : 'ХААЛТТАЙ'}
              </span>
            </button>

            {roomConfigExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-white/5 bg-[#0f1118]/80 text-xs">
                {/* Wall Color */}
                <div>
                  <label className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Ханын өнгө</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { color: '#ffffff', label: 'Цагаан' },
                      { color: '#f5f0eb', label: 'Тос' },
                      { color: '#e8e5e0', label: 'Саарал' },
                      { color: '#e0e8f0', label: 'Цэнхэр' },
                      { color: '#d5dfd5', label: 'Ногоон' },
                      { color: '#e8ddd0', label: 'Бор' },
                    ].map(({ color, label }) => (
                      <button
                        key={color}
                        onClick={() => { setRoomWallColor(color); setShowRoom(true); }}
                        className={`w-6 h-6 rounded-md border-2 transition-all cursor-pointer hover:scale-110 ${
                          roomWallColor === color ? 'border-amber-500 ring-2 ring-amber-500/30 scale-110' : 'border-white/10'
                        }`}
                        style={{ backgroundColor: color }}
                        title={label}
                        type="button"
                      />
                    ))}
                  </div>
                </div>

                {/* Floor Type */}
                <div>
                  <label className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Шалны төрөл</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { type: 'wood' as const, label: 'Мод', icon: '🪵', color: '#b8956a' },
                      { type: 'tile' as const, label: 'Плитка', icon: '🔲', color: '#d4d0cc' },
                      { type: 'marble' as const, label: 'Гантиг', icon: '💎', color: '#f0ece8' },
                      { type: 'concrete' as const, label: 'Бетон', icon: '🏗️', color: '#7a7a7a' },
                    ].map(({ type, label, icon, color }) => (
                      <button
                        key={type}
                        onClick={() => { setRoomFloorType(type); setShowRoom(true); }}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded-md border transition-all cursor-pointer ${
                          roomFloorType === type
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                            : 'border-white/5 bg-white/0 text-neutral-400 hover:text-white'
                        }`}
                        type="button"
                      >
                        <div className="w-4.5 h-4.5 rounded" style={{ backgroundColor: color }} />
                        <span className="text-[8px] font-bold uppercase leading-none mt-1">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Room Dimensions */}
                <div className="space-y-2.5">
                  <label className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider block">Өрөөний хэмжээ</label>
                  
                  {/* Quick Presets */}
                  <div className="flex gap-1">
                    {[
                      { label: '3х3м', w: 3000, d: 3000, h: 2700 },
                      { label: '4х3м', w: 4000, d: 3000, h: 2700 },
                      { label: '5х4м', w: 5000, d: 4000, h: 2700 },
                      { label: '6х5м', w: 6000, d: 5000, h: 2800 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setRoomWidth(preset.w);
                          setRoomDepth(preset.d);
                          setRoomHeight(preset.h);
                          setShowRoom(true);
                        }}
                        className="flex-1 text-[8px] font-bold bg-neutral-800/80 hover:bg-amber-500 hover:text-neutral-950 text-neutral-400 py-1.5 rounded transition-all cursor-pointer border border-white/5"
                        type="button"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {/* Width */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-neutral-500 w-8 shrink-0">Өргөн</span>
                      <input
                        type="range"
                        min={1000}
                        max={10000}
                        step={100}
                        value={roomWidth}
                        onChange={(e) => { setRoomWidth(Number(e.target.value)); setShowRoom(true); }}
                        className="flex-1 h-1 accent-amber-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <input
                          type="number"
                          min={1000}
                          max={10000}
                          value={roomWidth}
                          onChange={(e) => {
                            const val = Math.max(1000, Math.min(10000, Number(e.target.value) || 0));
                            setRoomWidth(val);
                            setShowRoom(true);
                          }}
                          className="w-13 bg-[#1e2330] text-amber-400 font-bold text-[9px] px-1 py-0.5 rounded border border-white/10 text-right focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[8px] text-neutral-500 font-bold">мм</span>
                      </div>
                    </div>

                    {/* Depth */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-neutral-500 w-8 shrink-0">Гүн</span>
                      <input
                        type="range"
                        min={1000}
                        max={10000}
                        step={100}
                        value={roomDepth}
                        onChange={(e) => { setRoomDepth(Number(e.target.value)); setShowRoom(true); }}
                        className="flex-1 h-1 accent-amber-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <input
                          type="number"
                          min={1000}
                          max={10000}
                          value={roomDepth}
                          onChange={(e) => {
                            const val = Math.max(1000, Math.min(10000, Number(e.target.value) || 0));
                            setRoomDepth(val);
                            setShowRoom(true);
                          }}
                          className="w-13 bg-[#1e2330] text-amber-400 font-bold text-[9px] px-1 py-0.5 rounded border border-white/10 text-right focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[8px] text-neutral-500 font-bold">мм</span>
                      </div>
                    </div>

                    {/* Height */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-neutral-500 w-8 shrink-0">Өндөр</span>
                      <input
                        type="range"
                        min={1500}
                        max={6000}
                        step={100}
                        value={roomHeight}
                        onChange={(e) => { setRoomHeight(Number(e.target.value)); setShowRoom(true); }}
                        className="flex-1 h-1 accent-amber-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <input
                          type="number"
                          min={1500}
                          max={6000}
                          value={roomHeight}
                          onChange={(e) => {
                            const val = Math.max(1500, Math.min(6000, Number(e.target.value) || 0));
                            setRoomHeight(val);
                            setShowRoom(true);
                          }}
                          className="w-13 bg-[#1e2330] text-amber-400 font-bold text-[9px] px-1 py-0.5 rounded border border-white/10 text-right focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[8px] text-neutral-500 font-bold">мм</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category Filters */}
          <div className="px-3 py-2 border-b border-white/5 bg-[#12141c]/45 flex gap-1 overflow-x-auto scrollbar-none whitespace-nowrap sticky top-[45px] z-10 shrink-0">
            {[
              { id: 'all', label: 'Бүгд' },
              { id: 'kitchen', label: 'Гал тогоо' },
              { id: 'living', label: 'Зочны өрөө' },
              { id: 'bedroom', label: 'Унтлага' },
              { id: 'other', label: 'Бусад' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedTemplateCategory(cat.id as any)}
                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedTemplateCategory === cat.id
                    ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-750'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Module list */}
          <div className="px-3 py-3 border-b border-white/5">
            <div className="text-[9px] text-neutral-500 uppercase font-bold px-1 mb-1.5">Төслийн хайрцагнууд</div>
            <div className="flex flex-col gap-1">
              {(activeProject.modules || []).map((mod) => {
                const isAct = selectedModuleId === mod.id;
                return (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                      isAct ? 'border-amber-500/50 bg-amber-500/8 text-amber-400' : 'border-white/5 text-neutral-400 hover:text-white hover:bg-white/3'
                    }`}
                  >
                    <span className="truncate font-semibold">{mod.name}</span>
                    <div className="flex gap-0.5 ml-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); duplicateModule(mod.id); }} className="p-1 hover:text-amber-400 cursor-pointer"><Copy size={9}/></button>
                      {(activeProject.modules||[]).length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); if(confirm(`"${mod.name}" устгах уу?`)) removeModuleFromActive(mod.id); }} className="p-1 hover:text-red-400 cursor-pointer"><Trash2 size={9}/></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => resetModulePositions()} className="mt-1.5 w-full text-[9px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg py-1 font-bold uppercase tracking-wider transition-all cursor-pointer">Тэгшлэх</button>
          </div>

          {/* Custom Templates Section — always visible */}
          <div className="px-3 py-3 border-b border-white/5 bg-amber-500/5">
            <div className="text-[9px] text-amber-500 uppercase font-bold px-1 mb-2 flex items-center justify-between">
              <span>💾 Миний хадгалсан загвар</span>
              {filteredCustomTemplates && filteredCustomTemplates.length > 0 && (
                <span className="text-[9px] text-amber-400 font-semibold bg-amber-500/15 px-1.5 py-0.5 rounded">{filteredCustomTemplates.length}</span>
              )}
            </div>
            {(!filteredCustomTemplates || filteredCustomTemplates.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-4 gap-1.5 opacity-50">
                <span className="text-xl">📭</span>
                <span className="text-[9px] text-neutral-500 text-center leading-tight">Хадгалсан загвар алга байна.<br/>Хайрцаг сонгоод хадгалах боломжтой.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredCustomTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', `custom-${tpl.id}`);
                      const ghost = document.createElement('div');
                      ghost.style.cssText = [
                        'position:fixed',
                        'left:-9999px',
                        'top:-9999px',
                        'width:100px',
                        'height:72px',
                        'background:#1a1c26',
                        'border:1.5px solid #f59e0b',
                        'border-radius:10px',
                        'display:flex',
                        'flex-direction:column',
                        'align-items:center',
                        'justify-content:center',
                        'gap:4px',
                        'color:#f59e0b',
                        'font-size:9px',
                        'font-weight:700',
                        'font-family:system-ui,sans-serif',
                        'padding:6px',
                        'text-align:center',
                        'box-shadow:0 4px 20px rgba(245,158,11,0.3)',
                        'pointer-events:none',
                      ].join(';');
                      ghost.innerHTML = `<div style="font-size:18px">📦</div><div style="max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tpl.name}</div>`;
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 50, 36);
                      setTimeout(() => document.body.removeChild(ghost), 0);
                    }}
                    className="group flex flex-col border border-amber-500/10 bg-[#0c0e18] hover:border-amber-500/50 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all shadow-lg relative"
                    title="Чирж 3D руу оруулах"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${tpl.name}" загварыг устгах уу?`)) {
                          deleteCustomTemplate(tpl.id);
                        }
                      }}
                      className="absolute top-1 right-1 z-10 p-1 rounded bg-black/60 hover:bg-red-500/80 text-neutral-400 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Загвар устгах"
                    >
                      <Trash2 size={10} />
                    </button>
                    <div className="w-full aspect-[4/3] overflow-hidden relative">
                      <TemplateThumbnail type={tpl.type} config={tpl.config} name={tpl.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5 pointer-events-none">
                        <span className="text-[8px] font-bold text-white leading-tight drop-shadow">{tpl.name}</span>
                      </div>
                      <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-all pointer-events-none" />
                    </div>
                    <button
                      onClick={() => {
                        addModuleToActive(tpl.type, tpl.config, tpl.name);
                        if (isMobile) setMobileTab('3d');
                      }}
                      className="w-full py-1 bg-neutral-800/80 hover:bg-amber-500 hover:text-neutral-950 text-neutral-300 font-bold text-[8px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-0.5"
                    >
                      <Plus size={8} /> Нэмэх
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Layouts Section — full layout snapshots */}
          <div className="px-3 py-3 border-b border-white/5 bg-cyan-500/5">
            <div className="text-[9px] text-cyan-400 uppercase font-bold px-1 mb-2 flex items-center justify-between">
              <span>🏗️ Бүтэн лайаут</span>
              {savedLayouts && savedLayouts.length > 0 && (
                <span className="text-[9px] text-cyan-400 font-semibold bg-cyan-500/15 px-1.5 py-0.5 rounded">{savedLayouts.length}</span>
              )}
            </div>
            {(!savedLayouts || savedLayouts.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-4 gap-1.5 opacity-50">
                <span className="text-xl">🗭️</span>
                <span className="text-[9px] text-neutral-500 text-center leading-tight">Хадгалсан лайаут алга байна.<br/>Доод хадгалах товчийг ашиглана уу.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                {savedLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="group flex items-center gap-1.5 px-2 py-2 rounded-xl border border-cyan-500/10 bg-[#0c0e18] hover:border-cyan-500/40 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold text-white truncate">{layout.name}</div>
                      <div className="text-[8px] text-neutral-500">{layout.moduleCount} хайрцаг</div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`“${layout.name}” лайаутыг ачнаа оруулах уу? Одоо лайаут солигдоно.`)) loadLayout(layout.id);
                      }}
                      className="px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 font-bold text-[8px] rounded-lg transition-all cursor-pointer uppercase tracking-wide"
                      title="Лайаут ачнах"
                    >
                      Ачнах
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`“${layout.name}” устгах уу?`)) deleteLayout(layout.id);
                      }}
                      className="p-1 rounded bg-black/40 hover:bg-red-500/80 text-neutral-500 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Устгах"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-3 py-3 flex-1">
            <div className="text-[9px] text-neutral-500 uppercase font-bold px-1 mb-2">Чирж нэмэх</div>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredBuiltInTemplates.map((tpl) => {
                return (
                  <div
                    key={tpl.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', tpl.id);
                      // Custom drag ghost — small amber box with name
                      const ghost = document.createElement('div');
                      ghost.style.cssText = [
                        'position:fixed',
                        'left:-9999px',
                        'top:-9999px',
                        'width:100px',
                        'height:72px',
                        'background:#1a1c26',
                        'border:1.5px solid #f59e0b',
                        'border-radius:10px',
                        'display:flex',
                        'flex-direction:column',
                        'align-items:center',
                        'justify-content:center',
                        'gap:4px',
                        'color:#f59e0b',
                        'font-size:9px',
                        'font-weight:700',
                        'font-family:system-ui,sans-serif',
                        'padding:6px',
                        'text-align:center',
                        'box-shadow:0 4px 20px rgba(245,158,11,0.3)',
                        'pointer-events:none',
                      ].join(';');
                      ghost.innerHTML = `<div style="font-size:18px">📦</div><div style="max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tpl.name}</div>`;
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 50, 36);
                      setTimeout(() => document.body.removeChild(ghost), 0);
                    }}
                    className="group flex flex-col border border-white/8 bg-[#0c0e18] hover:border-amber-500/50 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all shadow-lg hover:shadow-amber-500/10"
                    title="Чирж 3D руу оруулах"
                  >
                    <div className="w-full aspect-[4/3] overflow-hidden relative">
                      <TemplateThumbnail type={tpl.type} config={tpl.config} name={tpl.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5 pointer-events-none">
                        <span className="text-[8px] font-bold text-white leading-tight drop-shadow">{tpl.name}</span>
                      </div>
                      <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-all pointer-events-none" />
                    </div>
                    <button
                      onClick={() => {
                        addModuleToActive(tpl.type, tpl.config, tpl.name);
                        if (isMobile) setMobileTab('3d');
                      }}
                      className="w-full py-1 bg-neutral-800/80 hover:bg-amber-500 hover:text-neutral-950 text-neutral-300 font-bold text-[8px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-0.5"
                    >
                      <Plus size={8} /> Нэмэх
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE COLUMN: 3D Visualizer Canvas (col-span-6 on desktop, h-[920px]) */}
      <div className={`lg:col-span-9 flex flex-col gap-4 ${isMobile ? (mobileTab === '3d' ? 'flex h-auto w-full' : 'hidden') : 'flex h-[920px]'}`}>
        {/* Visualizer HUD controls */}
        <div className="flex flex-wrap lg:flex-nowrap justify-between items-center gap-3 bg-[#12141c] border border-white/5 px-4 py-3 rounded-xl">
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/15"
              title="Ашиглах зааварчилгаа нээх"
            >
              <HelpCircle size={11} className="shrink-0" />
              <span>{isMobile ? '💡 Заавар' : '💡 Тусламж'}</span>
            </button>
            <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />
            <button
              onClick={() => setViewMode('perspective')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'perspective' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="3D орон зайд чөлөөтэй эргүүлж харах"
            >
              {isMobile ? '3D' : '3D Харагдац'}
            </button>
            <button
              onClick={() => setViewMode('front')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'front' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Тавилгыг яг урдаас нь тэгш харах"
            >
              {isMobile ? 'Урд' : 'Урдаас'}
            </button>
            <button
              onClick={() => setViewMode('top')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'top' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Тавилгыг дээрээс нь тэгш харах"
            >
              {isMobile ? 'Дээр' : 'Дээрээс'}
            </button>
            <button
              onClick={() => setViewMode('side')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'side' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Тавилгыг хажуу талаас нь тэгш харах"
            >
              {isMobile ? 'Хажуу' : 'Хажуугаас'}
            </button>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setExplode(!explode)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                explode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Задрах харагдац: Хавтангуудыг салгаж бүтцийг нь харах"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setOpenDoors(!openDoors)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                openDoors ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Хаалга болон шургуулгуудыг онгойлгох / хаах"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                showDimensions ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Хэмжээсийг харуулах / нуух: Хайрцаг, тавиур, босоо хуваалт, шургуулга, хөл зэрэг бүх хэмжээг харах"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setMeasureMode(!measureMode)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                measureMode ? 'bg-amber-500 text-neutral-950 border border-amber-600' : 'bg-neutral-800 text-neutral-400 border border-transparent hover:text-white'
              }`}
              title="Зай хэмжигч метр: 3D дээр хоёр цэг сонгож зайг хэмжих"
            >
              <Ruler size={16} />
            </button>
            <button
              onClick={() => setSnapping(!snapping)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                snapping ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Соронзон наалдац: Шүүгээнүүдийг автомат зэрэгцүүлэн нааж тэгшлэх"
            >
              <Magnet size={16} />
            </button>
            <button
              onClick={() => alignModulesSideBySide()}
              className="p-2 rounded-lg transition-all cursor-pointer bg-neutral-800 text-neutral-400 border border-transparent hover:bg-neutral-700 hover:text-white"
              title="Зэрэгцүүлэх: Бүх шүүгээнүүдийг завсаргүй зэрэгцүүлэн наах"
            >
              <AlignLeft size={16} />
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  setShowRoom(true);
                  setRoomConfigExpanded(!roomConfigExpanded);
                  if (isMobile) {
                    setMobileTab('templates');
                  }
                  // Auto scroll the left sidebar container to the top to make sure it is in view
                  setTimeout(() => {
                    const scrollContainer = document.querySelector('.lg\\:col-span-3 .overflow-y-auto');
                    if (scrollContainer) {
                      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 50);
                }}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  roomConfigExpanded ? 'bg-emerald-500 text-neutral-950 font-bold border border-emerald-600' : 'bg-neutral-800 text-neutral-400 border border-transparent hover:text-white hover:bg-neutral-750'
                }`}
                title="Өрөөний орчин: Хана, шал, өрөөний хэмжээ сонгох"
              >
                <Home size={16} />
              </button>
            </div>
            <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />
            <button
              onClick={() => {
                if ((activeProject.modules || []).length === 0) return;
                if (confirm('3D дэлгэцийн бүх хайрцгийг устгах уу?')) {
                  clearAllModules();
                }
              }}
              className="p-2 rounded-lg transition-all cursor-pointer bg-neutral-800 text-neutral-400 border border-transparent hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
              title="Бүх хайрцгуудыг дэлгэцээс арилгах"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* 3D Canvas element wrapper */}
        <div
          className={`rounded-2xl overflow-hidden border transition-all relative ${
            isMobile
              ? (showFloatingConfig ? 'h-[40vh] w-full' : 'h-[72vh] w-full')
              : 'flex-1'
          } ${
            isDragOver ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-transparent hover:border-amber-500/30'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            
            // 1. Try template drop (add new module)
            const tplId = e.dataTransfer.getData('text/plain');
            if (tplId) {
              let tpl;
              if (tplId.startsWith('custom-')) {
                const realId = tplId.replace('custom-', '');
                tpl = customTemplates.find((t) => t.id === realId);
              } else {
                tpl = templates.find((t) => t.id === tplId);
              }
              if (tpl) {
                const pt = threeViewerRef.current?.get3DPoint(e.clientX, e.clientY);
                const isUpper = tpl.type === 'kitchen_upper' || tpl.type === 'hood' || tpl.type === 'built_in_hood' || tpl.type === 'microwave';
                const initialCoords = pt ? { x: Math.round(pt.x), y: isUpper ? 1400 : 0, z: Math.round(pt.z) } : undefined;
                addModuleToActive(tpl.type, tpl.config, tpl.name, initialCoords);
                return;
              }
            }

            // 2. Try part drop
            const partJson = e.dataTransfer.getData('part-data');
            if (partJson) {
              try {
                const partData = JSON.parse(partJson);
                addPartToActive(partData);
              } catch (err) {
                console.error(err);
              }
            }
          }}
        >
          {/* Drag Overlay visual cue */}
          <div
            className={`absolute inset-0 bg-amber-500/5 backdrop-blur-[2px] pointer-events-none transition-all flex items-center justify-center border-2 border-dashed border-amber-500/40 rounded-2xl z-10 ${
              isDragOver ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <span className="bg-[#12141c] border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-amber-400 shadow-xl">
              Загварыг энд чирч тавина уу (Drop to load)
            </span>
          </div>



          {measureMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500 text-neutral-950 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-amber-600 animate-pulse uppercase tracking-wider">
              Метр горим идэвхтэй: 3D орон зайд дараад хэмжинэ үү (A-B цэг сонгох)
            </div>
          )}

          <ThreeViewer
            ref={threeViewerRef}
            project={activeProject}
            materials={materials}
            explode={explode}
            showDimensions={showDimensions}
            openDoors={openDoors}
            viewMode={viewMode}
            enableSnapping={snapping}
            measureMode={measureMode}
            showRoom={showRoom}
            roomWallColor={roomWallColor}
            roomFloorType={roomFloorType}
            roomWidth={roomWidth}
            roomDepth={roomDepth}
            roomHeight={roomHeight}
            onRightClickModule={(moduleId, x, y) => {
              setContextMenu({ moduleId, x, y });
            }}
            onDoubleClickModule={(moduleId) => {
              setSelectedModuleId(moduleId);
              setShowFloatingConfig(true);
            }}
          />

          {contextMenu && (() => {
            const contextMod = activeProject.modules.find(m => m.id === contextMenu.moduleId);
            if (!contextMod) return null;
            return (
              <div
                className="fixed z-[100] w-[220px] bg-[#12141c]/95 border border-white/10 rounded-xl shadow-2xl p-1.5 backdrop-blur-md flex flex-col gap-1 text-[11px] font-semibold text-neutral-300 animate-in fade-in zoom-in-95 duration-100"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setSelectedModuleId(contextMenu.moduleId);
                    setShowFloatingConfig(true);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-500 hover:text-neutral-950 transition-colors flex items-center gap-2 cursor-pointer"
                  type="button"
                >
                  <Box size={14} />
                  <span>⚙️ Шүүгээ тохируулах</span>
                </button>
                <button
                  onClick={() => {
                    duplicateModule(contextMenu.moduleId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                  type="button"
                >
                  <Copy size={14} />
                  <span>👯 Хувилах</span>
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button
                  onClick={() => {
                    if (confirm("Уг шүүгээг устгах уу?")) {
                      removeModuleFromActive(contextMenu.moduleId);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center gap-2 cursor-pointer"
                  type="button"
                >
                  <Trash2 size={14} className="text-red-400" />
                  <span>❌ Устгах</span>
                </button>

                <div className="h-px bg-white/5 my-1" />

                {/* Dimensions section */}
                <div className="px-2.5 py-1.5 flex flex-col gap-2 border-t border-white/5">
                  <div className="text-[10px] text-neutral-400 font-bold">Хэмжээ & Бүтэц</div>
                  
                  <div className="grid grid-cols-3 gap-x-1.5 gap-y-1.5">
                    {/* Width W */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-neutral-500 text-[8px] font-bold uppercase tracking-tight">Өргөн (W)</label>
                      <input
                        type="number"
                        min={200}
                        max={3000}
                        step={50}
                        value={contextMod.config.width}
                        onChange={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = parseInt(e.target.value) || 0;
                          updateActiveConfig({ width: val });
                        }}
                        onBlur={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = Math.max(200, Math.min(3000, parseInt(e.target.value) || 200));
                          updateActiveConfig({ width: val });
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-1 py-0.5 text-center text-amber-500 font-bold outline-none focus:border-amber-500 text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Height H */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-neutral-500 text-[8px] font-bold uppercase tracking-tight">Өндөр (H)</label>
                      <input
                        type="number"
                        min={200}
                        max={2800}
                        step={50}
                        value={contextMod.config.height}
                        onChange={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = parseInt(e.target.value) || 0;
                          updateActiveConfig({ height: val });
                        }}
                        onBlur={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = Math.max(200, Math.min(2800, parseInt(e.target.value) || 200));
                          updateActiveConfig({ height: val });
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-1 py-0.5 text-center text-amber-500 font-bold outline-none focus:border-amber-500 text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Depth D */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-neutral-500 text-[8px] font-bold uppercase tracking-tight">Гүн (D)</label>
                      <input
                        type="number"
                        min={200}
                        max={1000}
                        step={50}
                        value={contextMod.config.depth}
                        onChange={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = parseInt(e.target.value) || 0;
                          updateActiveConfig({ depth: val });
                        }}
                        onBlur={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = Math.max(200, Math.min(1000, parseInt(e.target.value) || 200));
                          updateActiveConfig({ depth: val });
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-1 py-0.5 text-center text-amber-500 font-bold outline-none focus:border-amber-500 text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Doors */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-neutral-500 text-[8px] font-bold uppercase tracking-tight">Хаалга</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={contextMod.config.doors}
                        onChange={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = parseInt(e.target.value) || 0;
                          updateActiveConfig({ doors: val });
                        }}
                        onBlur={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                          updateActiveConfig({ doors: val });
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-1 py-0.5 text-center text-cyan-400 font-bold outline-none focus:border-cyan-500 text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Shelves */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-neutral-500 text-[8px] font-bold uppercase tracking-tight">Тавиур</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={contextMod.config.shelves}
                        onChange={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = parseInt(e.target.value) || 0;
                          updateActiveConfig({ shelves: val });
                        }}
                        onBlur={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                          updateActiveConfig({ shelves: val });
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-1 py-0.5 text-center text-cyan-400 font-bold outline-none focus:border-cyan-500 text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Drawers */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-neutral-500 text-[8px] font-bold uppercase tracking-tight">Шургуулга</label>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={contextMod.config.drawers}
                        onChange={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = parseInt(e.target.value) || 0;
                          updateActiveConfig({ drawers: val });
                        }}
                        onBlur={(e) => {
                          setSelectedModuleId(contextMod.id);
                          const val = Math.max(0, Math.min(12, parseInt(e.target.value) || 0));
                          updateActiveConfig({ drawers: val });
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-1 py-0.5 text-center text-cyan-400 font-bold outline-none focus:border-cyan-500 text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Y-coordinate (height) slider inside menu */}
                <div className="px-2.5 py-1.5 flex flex-col gap-1.5 border-t border-white/5">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                    <span>Өндөр / Давхарлах (Y тэнхлэг)</span>
                    <span className="text-amber-500 font-bold">{contextMod.yOffset} мм</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2500}
                    step={50}
                    value={contextMod.yOffset}
                    onChange={(e) => updateModulePosition(contextMod.id, contextMod.xOffset, parseInt(e.target.value), contextMod.zOffset)}
                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Y rotation slider and buttons inside menu */}
                <div className="px-2.5 py-1.5 flex flex-col gap-1.5 border-t border-white/5">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                    <span>Эргэлт ⟳ (Y тэнхлэг)</span>
                    <span className="text-amber-500 font-bold">
                      {Math.round(((contextMod.rotation ?? 0) * 180) / Math.PI)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={Math.round(((contextMod.rotation ?? 0) * 180) / Math.PI)}
                    onChange={(e) => updateModuleRotation(contextMod.id, parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex gap-1 mt-0.5">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => updateModuleRotation(contextMod.id, deg)}
                        className={`flex-1 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                          Math.round(((contextMod.rotation ?? 0) * 180) / Math.PI) === deg
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {!isMobile && showFloatingConfig && selectedMod && (
            <>
              {/* Backdrop — click to close */}
              <div
                className="absolute inset-0 z-10"
                onClick={() => setShowFloatingConfig(false)}
              />
              {/* Floating Configurator Panel */}
              <div
                className="absolute top-3 right-3 z-20 flex flex-col gap-0 bg-[#0e1018] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                style={{ width: 460, maxHeight: 'calc(100% - 24px)', scrollbarWidth: 'thin' }}
                onClick={(e) => e.stopPropagation()}
              >
                {renderConfigurator(true)}
              </div>
            </>
          )}
        </div>

        {isMobile && showFloatingConfig && selectedMod && (
          <div
            className="w-full flex flex-col gap-0 bg-[#0e1018] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '45vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderConfigurator(true)}
          </div>
        )}
      </div>
      {/* RIGHT COLUMN REMOVED — settings accessible via right-click floating overlay */}
      <div className="hidden">
        {/* Project info card */}
        <div className="bg-[#12141c] border border-white/5 rounded-2xl p-5 flex flex-col gap-1">
          <span className="text-[10px] text-amber-500 uppercase tracking-wider font-bold">Идэвхтэй төсөл</span>
          <h2 className="font-display font-bold text-white text-lg">{activeProject.name}</h2>
          <p className="text-neutral-400 text-xs">
            Захиалагч: {activeProject.customerName} ({activeProject.customerPhone})
          </p>
        </div>

        {/* AI Furniture Prompt Generator Form */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/10 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 text-sm font-semibold">
            <Sparkles size={16} />
            <h4>AI Тавилга Зурагч</h4>
          </div>
          <form onSubmit={handleAiPromptSubmit} className="relative">
            <input
              type="text"
              placeholder="Бичнэ үү: 'цагаан модерн гал тогоо'..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full bg-[#0c0d12] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 outline-none text-white text-xs placeholder:text-neutral-500 focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-600 rounded-lg transition-all cursor-pointer"
            >
              {aiLoading ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
            </button>
          </form>
          {aiSuccess && (
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check size={12} /> AI тавилгыг амжилттай үүсгэлээ!
            </div>
          )}
        </div>

        {/* Dimension parameters sliders panel - RESTRUCTURED AS WIZARD */}
        {showFloatingConfig ? (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-[#12141c] border border-white/5 rounded-2xl min-h-[350px]">
                <Sparkles size={36} className="text-amber-500 mb-3 animate-pulse" />
                <span className="text-xs font-bold text-white">Хөвөгч тохиргоо идэвхтэй</span>
                <p className="text-[10px] text-neutral-500 mt-2 leading-normal max-w-[200px]">
                  Шүүгээний тохиргоо 3D дэлгэц дээр хөвөгч байдлаар нээлттэй байна. Та тэндээс засварлана уу.
                </p>
                <button
                  onClick={() => setShowFloatingConfig(false)}
                  className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer border border-white/5"
                  type="button"
                >
                  Хажуугийн цонхонд шилжүүлэх
                </button>
              </div>
            ) : !selectedMod ? (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-[#12141c] border border-white/5 rounded-2xl min-h-[350px]">
                <Box size={36} className="text-neutral-500 mb-3 animate-pulse" />
                <span className="text-xs font-bold text-white">Шүүгээ сонгоогүй байна</span>
                <p className="text-[10px] text-neutral-500 mt-1 leading-normal max-w-[200px]">
                  Зүүн талын цэснээс бэлэн загварыг 3D дэлгэц рүү чирж оруулах эсвэл "Нэмэх" товчлуурыг дарж ажиллана уу.
                </p>
              </div>
            ) : (
              renderConfigurator(false)
            )}
      </div>
      {/* ═══════════ PRINT SPEC SHEET MODAL ═══════════ */}
      {showPrintModal && (() => {
        const mod = selectedMod;
        const cfg = mod ? mod.config : activeProject.config;
        const matName = materials.find(m => m.id === cfg.materialId)?.name || cfg.materialId || '—';
        const doorMatName = materials.find(m => m.id === cfg.doorMaterialId)?.name || cfg.doorMaterialId || '—';
        const today = new Date().toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const legH = cfg.hasLegs ? 100 : 0;
        const insideH = Number(cfg.height) - legH - 36;

        return (
          <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4" id="print-overlay">
            {/* Screen-only close bar */}
            <div className="fixed top-4 right-4 z-[1000] flex gap-2 print:hidden">
              <button
                onClick={handleDownloadProductionPDF}
                disabled={editorPdfLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/5 font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0 disabled:opacity-50"
              >
                {editorPdfLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Бэлдэж байна...
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    Үйлдвэрлэлийн PDF татах
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('spec-sheet');
                  if (el) {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(`<!DOCTYPE html><html><head><title>Spec Sheet – ${activeProject.name}</title><meta charset="utf-8"><style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 24px; }
                        .spec-sheet { max-width: 800px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px; }
                        .logo { font-size: 22px; font-weight: 900; letter-spacing: -1px; color: #111; }
                        .logo span { color: #f59e0b; }
                        .meta { text-align: right; font-size: 11px; color: #666; }
                        .meta strong { color: #111; }
                        .section { margin-bottom: 20px; }
                        .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #f59e0b; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
                        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
                        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
                        .field { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
                        .field-label { color: #666; font-weight: 500; }
                        .field-value { font-weight: 700; color: #111; }
                        .big-dim { display: flex; gap: 24px; margin-bottom: 16px; }
                        .dim-box { flex: 1; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 12px 16px; text-align: center; }
                        .dim-box .label { font-size: 10px; text-transform: uppercase; color: #92400e; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
                        .dim-box .value { font-size: 26px; font-weight: 900; color: #111; }
                        .dim-box .unit { font-size: 13px; color: #666; }
                        .shelf-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        .shelf-table th { background: #f9fafb; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
                        .shelf-table td { padding: 5px 10px; border-bottom: 1px solid #f3f4f6; }
                        .shelf-table tr:last-child td { border-bottom: none; }
                        .color-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #d1d5db; vertical-align: middle; margin-right: 5px; }
                        .module-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
                        .module-idx { width: 20px; height: 20px; border-radius: 50%; background: #f59e0b; color: #111; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; flex-shrink: 0; }
                        .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
                        @media print { body { padding: 12px; } }
                      </style></head><body>${el.innerHTML}</body></html>`);
                      win.document.close();
                      win.print();
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0"
              >
                <Printer size={14} /> Хэвлэх / PDF хадгалах
              </button>

              {/* Simulated Email Sending Form */}
              <div className="flex items-center gap-2 border-l border-white/10 pl-3 bg-neutral-900/60 p-1.5 rounded-xl border border-white/5">
                <input
                  type="email"
                  placeholder="Захиалагчийн и-мэйл..."
                  value={emailToSend}
                  onChange={(e) => setEmailToSend(e.target.value)}
                  className="bg-neutral-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-neutral-500 w-44 outline-none focus:border-cyan-500 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSendEmailSimulate}
                  disabled={emailSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-all shrink-0"
                >
                  {emailSending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Илгээж байна...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Илгээх
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl cursor-pointer transition-all shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Spec sheet content */}
            <div id="spec-sheet" className="spec-sheet bg-white text-neutral-900 rounded-2xl shadow-2xl overflow-hidden" style={{maxWidth: 820, width: '100%', fontFamily: "'Segoe UI', Arial, sans-serif"}}>

              {/* Header */}
              <div style={{background: '#111827', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div>
                  <div style={{fontSize: 22, fontWeight: 900, letterSpacing: -1, color: '#fff'}}>
                    ТАВMAX <span style={{color: '#f59e0b'}}>·</span> <span style={{color: '#f59e0b', fontSize: 14, fontWeight: 700, letterSpacing: 1}}>SPEC SHEET</span>
                  </div>
                  <div style={{color: '#9ca3af', fontSize: 11, marginTop: 4}}>Тавилгын тохиргооны хэвлэмэл мэдээлэл</div>
                </div>
                <div style={{textAlign: 'right', fontSize: 11, color: '#9ca3af'}}>
                  <div style={{color: '#fff', fontWeight: 700, fontSize: 14}}>{activeProject.name}</div>
                  <div style={{marginTop: 4}}>Захиалагч: <strong style={{color: '#f59e0b'}}>{activeProject.customerName}</strong></div>
                  <div>{activeProject.customerPhone}</div>
                  <div style={{marginTop: 6, color: '#6b7280'}}>{today}</div>
                </div>
              </div>

              <div style={{padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24}}>

                {/* Module info */}
                {mod && (
                  <div>
                    <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 12}}>📦 Идэвхтэй хайрцаг</div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4}}>{mod.name}</div>
                    <div style={{fontSize: 11, color: '#6b7280'}}>Төрөл: <strong>{mod.type}</strong></div>
                  </div>
                )}

                {/* BIG 3 dimensions */}
                <div>
                  <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 14}}>📐 Үндсэн хэмжээ</div>
                  <div style={{display: 'flex', gap: 12}}>
                    {[{label: 'Өргөн', value: cfg.width, unit: 'мм'}, {label: 'Өндөр', value: cfg.height, unit: 'мм'}, {label: 'Гүн', value: cfg.depth, unit: 'мм'}].map(d => (
                      <div key={d.label} style={{flex: 1, background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 10, padding: '12px 16px', textAlign: 'center'}}>
                        <div style={{fontSize: 9, textTransform: 'uppercase', color: '#92400e', fontWeight: 800, letterSpacing: 1, marginBottom: 4}}>{d.label}</div>
                        <div style={{fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1}}>{d.value}</div>
                        <div style={{fontSize: 12, color: '#6b7280', marginTop: 2}}>{d.unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Config details grid */}
                <div>
                  <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 12}}>⚙️ Дэд хэсгүүд</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 20px'}}>
                    {[
                      {label: 'Тавиур хавтан', value: cfg.shelves ?? '—'},
                      {label: 'Шургуулга', value: cfg.drawers ?? '—'},
                      {label: 'Хаалга', value: cfg.doors ?? '—'},
                      {label: 'Хөлтэй эсэх', value: cfg.hasLegs ? '✓ Тийм' : '✗ Үгүй'},
                      {label: 'Бариул', value: cfg.handleType || '—'},
                      {label: 'Тавцан', value: cfg.countertopType && cfg.countertopType !== 'none' ? cfg.countertopType : 'Байхгүй'},
                    ].map(f => (
                      <div key={f.label} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f3f4f6'}}>
                        <span style={{color: '#6b7280'}}>{f.label}</span>
                        <strong>{String(f.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 12}}>🎨 Материал ба өнгө</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f3f4f6'}}>
                      <span style={{color: '#6b7280'}}>Үндсэн материал</span>
                      <strong>{matName}</strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f3f4f6'}}>
                      <span style={{color: '#6b7280'}}>Хаалганы материал</span>
                      <strong>{doorMatName}</strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f3f4f6'}}>
                      <span style={{color: '#6b7280'}}>Өнгө (Үндсэн)</span>
                      <span style={{display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700}}>
                        <span style={{display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: cfg.color || '#fff', border: '1.5px solid #d1d5db'}} />
                        {cfg.color || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shelf positions */}
                {cfg.shelves > 0 && cfg.shelfPositions && cfg.shelfPositions.length > 0 && (
                  <div>
                    <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 12}}>📏 Тавиурын байрлал (доороос, мм)</div>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 11}}>
                      <thead>
                        <tr>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>№</th>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Байрлал (мм)</th>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Байрлал (м)</th>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Дараагийнхаас зай (мм)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cfg.shelfPositions.map((pos: number, i: number) => {
                          const next = cfg.shelfPositions[i + 1] ?? insideH;
                          return (
                            <tr key={i}>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: 700}}>Тавиур {i + 1}</td>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, color: '#f59e0b'}}>{pos}</td>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', color: '#6b7280'}}>{(pos / 1000).toFixed(3)}</td>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', color: '#6b7280'}}>{next - pos}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Divider positions */}
                {cfg.dividerPositions && cfg.dividerPositions.length > 0 && (
                  <div>
                    <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 12}}>↕ Хуваалтын байрлал (зүүнээс, мм)</div>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 11}}>
                      <thead>
                        <tr>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>№</th>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Байрлал (мм)</th>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Секцийн өргөн (мм)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cfg.dividerPositions.map((pos: number, i: number) => {
                          const prev = i === 0 ? 0 : cfg.dividerPositions[i - 1];
                          return (
                            <tr key={i}>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: 700}}>Хуваалт {i + 1}</td>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, color: '#f59e0b'}}>{pos}</td>
                              <td style={{padding: '5px 10px', borderBottom: '1px solid #f3f4f6', color: '#6b7280'}}>{pos - prev}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* All modules list */}
                {(activeProject.modules || []).length > 1 && (
                  <div>
                    <div style={{fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#f59e0b', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 12}}>🏗️ Бүх хайрцагнуудын жагсаалт</div>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 11}}>
                      <thead>
                        <tr>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Нэр</th>
                          <th style={{background: '#f9fafb', textAlign: 'center', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Өргөн</th>
                          <th style={{background: '#f9fafb', textAlign: 'center', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Өндөр</th>
                          <th style={{background: '#f9fafb', textAlign: 'center', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Гүн</th>
                          <th style={{background: '#f9fafb', textAlign: 'left', padding: '6px 10px', fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700}}>Байршил X/Y/Z</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeProject.modules || []).map((m, i) => (
                          <tr key={m.id} style={{background: m.id === selectedModuleId ? '#fffbeb' : 'transparent'}}>
                            <td style={{padding: '6px 10px', borderBottom: '1px solid #f3f4f6', fontWeight: m.id === selectedModuleId ? 800 : 500}}>
                              {m.id === selectedModuleId ? '▶ ' : ''}{m.name}
                            </td>
                            <td style={{padding: '6px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', color: '#f59e0b', fontWeight: 700}}>{m.config.width}</td>
                            <td style={{padding: '6px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', color: '#f59e0b', fontWeight: 700}}>{m.config.height}</td>
                            <td style={{padding: '6px 10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', color: '#f59e0b', fontWeight: 700}}>{m.config.depth}</td>
                            <td style={{padding: '6px 10px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', fontSize: 10}}>
                              X:{m.xOffset} / Y:{m.yOffset} / Z:{m.zOffset}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Signature row */}
                <div style={{marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24}}>
                  {['Зохион бүтээгч', 'Захиалагч', 'Баталгаажуулагч'].map((role) => (
                    <div key={role} style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                      <div style={{fontSize: 9, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1}}>{role}</div>
                      <div style={{borderBottom: '1.5px solid #d1d5db', height: 36, marginBottom: 4}} />
                      <div style={{fontSize: 10, color: '#9ca3af'}}>Гарын үсэг / Огноо</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9ca3af', paddingTop: 12, borderTop: '1px solid #f3f4f6'}}>
                  <span>TAVMAX · Тавилгын дизайн систем</span>
                  <span>Хэвлэсэн: {today}</span>
                  <span>{activeProject.name} · {activeProject.customerName}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 💡 HELP MANUAL TUTORIAL MODAL */}
      {showHelpModal && (() => {
        const TABS = [
          { icon: '📱', label: 'Ерөнхий заавар' },
          { icon: '🖱️', label: '3D Удирдлага' },
          { icon: '📦', label: 'Шүүгээ нэмэх' },
          { icon: '📐', label: 'Хэмжээ' },
          { icon: '🚪', label: 'Хаалга' },
          { icon: '📚', label: 'Тавиур' },
          { icon: '🎨', label: 'Өнгө & Материал' },
          { icon: '💾', label: 'Хадгалах' },
        ];
        return (
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-[#0e1018] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#12141c] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <h2 className="font-extrabold text-white text-sm">TavMax — Ашиглах заавар</h2>
                    <p className="text-[10px] text-neutral-500">Бүх функцын тайлбар зурагтайгаар</p>
                  </div>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-all cursor-pointer">
                  <X size={15} />
                </button>
              </div>

              {/* Tab Bar */}
              <div className="flex gap-0.5 px-3 pt-2.5 bg-[#12141c] shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {TABS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setHelpTab(i)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 ${helpTab === i ? 'bg-[#1a1d28] text-amber-400 border-amber-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto bg-[#1a1d28]" style={{ scrollbarWidth: 'thin' }}>

                {/* ── TAB 0: Ерөнхий заавар (Зурагт зааварчилгаа) ── */}
                {helpTab === 0 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Аппликейшний үндсэн дэлгэцийн бүтэц болон удирдлагын хэсгүүдийн ерөнхий тайлбар:
                    </p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-2 overflow-hidden flex justify-center">
                      <img 
                        src="/templates/editor_guide_screenshot.png" 
                        alt="TavMax Editor Guide" 
                        className="rounded-lg max-h-[260px] w-full object-contain border border-white/10" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                        <span className="text-[10px] font-bold text-amber-400">1. Загварын цэс (Зүүн талд)</span>
                        <p className="text-[9px] text-neutral-500 mt-0.5">Гал тогоо, шкаф зэрэг бэлэн хавтангуудын загварыг сонгож чирж оруулна.</p>
                      </div>
                      <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                        <span className="text-[10px] font-bold text-blue-400">2. 3D Удирдах дэлгэц (Төвд)</span>
                        <p className="text-[9px] text-neutral-500 mt-0.5">Хулсаар тавилгаа бүх өнцгөөс эргүүлж, хаалгыг нээж, хэмжээг харна.</p>
                      </div>
                      <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                        <span className="text-[10px] font-bold text-emerald-400">3. Шүүгээний тохиргоо (Баруун талд)</span>
                        <p className="text-[9px] text-neutral-500 mt-0.5">Сонгосон шүүгээний өргөн, өндөр, гүн, тавиур болон өнгийг засна.</p>
                      </div>
                      <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                        <span className="text-[10px] font-bold text-purple-400">4. Багаж & Цэс (Дээд талд)</span>
                        <p className="text-[9px] text-neutral-500 mt-0.5">Төслөө хадгалах, хэвлэж PDF авах, зүсэлт оновчлол харах товчлуурууд.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 1: 3D Navigation ── */}
                {helpTab === 1 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">3D дэлгэц дээр тавилгаа бүх өнцгөөс харж, эргүүлж, ойртуулах боломжтой. Хулганы доорх 3 товчлуур ашиглан бүрэн удирдана.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                        <defs><marker id="ha" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#d97706"/></marker><marker id="hb" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#3b82f6"/></marker><marker id="hc" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#10b981"/></marker></defs>
                        {/* Mouse 1 - left button */}
                        <rect x="15" y="15" width="54" height="80" rx="27" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                        <line x1="42" y1="15" x2="42" y2="62" stroke="#374151" strokeWidth="1.5"/>
                        <rect x="16" y="16" width="25" height="30" rx="12" fill="#d97706" opacity="0.85"/>
                        <text x="42" y="107" textAnchor="middle" fill="#9ca3af" fontSize="8">Зүүн товч</text>
                        <text x="42" y="118" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold">Эргүүлэх</text>
                        <path d="M78 45 Q98 28 118 45" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#ha)"/>
                        <path d="M78 65 Q98 82 118 65" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#ha)"/>
                        {/* Mouse 2 - right button */}
                        <rect x="172" y="15" width="54" height="80" rx="27" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                        <line x1="199" y1="15" x2="199" y2="62" stroke="#374151" strokeWidth="1.5"/>
                        <rect x="200" y="16" width="25" height="30" rx="12" fill="#3b82f6" opacity="0.85"/>
                        <text x="199" y="107" textAnchor="middle" fill="#9ca3af" fontSize="8">Баруун товч</text>
                        <text x="199" y="118" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">Шилжүүлэх</text>
                        <path d="M234 52 L255 52" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#hb)"/>
                        <path d="M234 70 L255 70" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#hb)"/>
                        <path d="M244 44 L244 30" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#hb)"/>
                        {/* Mouse 3 - scroll */}
                        <rect x="329" y="15" width="54" height="80" rx="27" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                        <rect x="342" y="23" width="28" height="8" rx="4" fill="#10b981" opacity="0.9"/>
                        <text x="356" y="107" textAnchor="middle" fill="#9ca3af" fontSize="8">Скролл дугуй</text>
                        <text x="356" y="118" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">Ойртох / Холдох</text>
                        <text x="356" y="58" textAnchor="middle" fill="#10b981" fontSize="16">↕</text>
                        {/* 2x click */}
                        <text x="230" y="135" textAnchor="middle" fill="#a78bfa" fontSize="8">✌️ Шүүгээн дээр 2 дарах → Тохиргоо цонх нээгдэнэ</text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['🔄', 'amber', 'Зүүн товч + чирэх', '3D загварыг дурын чиглэлд эргүүлнэ'],
                        ['🖐️', 'blue', 'Баруун товч + чирэх', 'Загварыг зүүн, баруун, дээш, доош шилжүүлнэ'],
                        ['🔍', 'emerald', 'Скролл дугуй', 'Дээш эргүүлбэл ойртоно, доош эргүүлбэл холдоно'],
                        ['✌️', 'purple', '2 дарах (Шүүгээн дээр)', 'Тухайн шүүгээний тохиргоо цонх нээгдэнэ'],
                        ['🖱️', 'rose', 'Баруун товч (1 дарах)', 'Тохируулах / Хувилах / Устгах цэс нээгдэнэ'],
                      ].map(([icon, col, title, desc], i) => (
                        <div key={i} className="flex items-center gap-2 bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm shrink-0">{icon}</span>
                          <span className={`text-[10px] font-bold text-${col}-400 shrink-0`}>{title}:</span>
                          <span className="text-[10px] text-neutral-400">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Adding cabinets ── */}
                {helpTab === 2 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">Зүүн талын загварын цэснээс шүүгээ сонгож 3D дэлгэц рүү нэмнэ. Чирж оруулах эсвэл товч дарж нэмж болно.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 150" className="w-full" style={{ maxHeight: 150 }}>
                        <defs><marker id="da" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#d97706"/></marker></defs>
                        {/* Left panel */}
                        <rect x="5" y="5" width="115" height="138" rx="7" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                        <text x="62" y="20" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ЗАГВАРЫН ЦЭС</text>
                        {[['Гал тогоо (Доод)', '600×750мм', true], ['Гал тогоо (Дээд)', '600×700мм', false], ['Шкаф', '800×2000мм', false]].map(([n, s, sel], i) => (
                          <g key={i}>
                            <rect x="12" y={28 + i * 38} width="101" height="32" rx="5" fill={sel ? '#1e3a5f' : '#12141c'} stroke={sel ? '#3b82f6' : '#374151'} strokeWidth={sel ? 1.5 : 1}/>
                            <rect x="16" y={32 + i * 38} width="14" height="24" rx="2" fill={sel ? '#2563eb' : '#1e2030'}/>
                            <text x="36" y={43 + i * 38} fill={sel ? '#93c5fd' : '#6b7280'} fontSize="7" fontWeight="bold">{n}</text>
                            <text x="36" y={53 + i * 38} fill="#4b5563" fontSize="6">{s}</text>
                          </g>
                        ))}
                        {/* Arrow */}
                        <path d="M122 72 L148 72" stroke="#d97706" strokeWidth="2" strokeDasharray="4,3" markerEnd="url(#da)"/>
                        <text x="135" y="65" textAnchor="middle" fill="#d97706" fontSize="7">чирэх</text>
                        {/* 3D area */}
                        <rect x="152" y="5" width="190" height="138" rx="7" fill="#12141c" stroke="#374151" strokeWidth="1.5"/>
                        <text x="247" y="20" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">3D ДЭЛГЭЦ</text>
                        <rect x="160" y="62" width="55" height="72" rx="3" fill="#1e2030" stroke="#3b82f6" strokeWidth="1.5"/>
                        <rect x="163" y="65" width="49" height="35" rx="2" fill="#3b82f6" opacity="0.08"/>
                        <line x1="187" y1="65" x2="187" y2="100" stroke="#3b82f6" opacity="0.2" strokeWidth="1"/>
                        <rect x="160" y="35" width="55" height="25" rx="3" fill="#1e2030" stroke="#4b5563" strokeWidth="1"/>
                        <rect x="225" y="45" width="60" height="89" rx="3" fill="#1e2030" stroke="#d97706" strokeWidth="2"/>
                        <text x="255" y="91" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold">ШИНЭ</text>
                        {/* Plus btn */}
                        <rect x="355" y="5" width="98" height="138" rx="7" fill="#12141c" stroke="#374151" strokeWidth="1.5"/>
                        <text x="404" y="22" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">НЭМЭХ ТОВЧ</text>
                        <rect x="365" y="32" width="78" height="20" rx="5" fill="#d97706"/>
                        <text x="404" y="45" textAnchor="middle" fill="#0a0a0a" fontSize="7" fontWeight="bold">+ НЭМЭХ</text>
                        <rect x="365" y="58" width="78" height="20" rx="5" fill="#1e2030" stroke="#4b5563"/>
                        <text x="404" y="71" textAnchor="middle" fill="#9ca3af" fontSize="7">Зэрэгцүүлэх</text>
                        <rect x="365" y="84" width="78" height="20" rx="5" fill="#1e2030" stroke="#4b5563"/>
                        <text x="404" y="97" textAnchor="middle" fill="#9ca3af" fontSize="7">Устгах</text>
                        <rect x="365" y="110" width="78" height="20" rx="5" fill="#1e2030" stroke="#4b5563"/>
                        <text x="404" y="123" textAnchor="middle" fill="#9ca3af" fontSize="7">Бүгдийг устгах</text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['1', 'Загварын цэс', 'Зүүн талын гулсах цэснээс шүүгээний төрлийг сонгоно (Гал тогоо доод/дээд, Шкаф, Шургуулга гэх мэт)'],
                        ['2', 'Чирж оруулах', 'Сонгосон загварыг 3D дэлгэц рүү чирж тавина — шинэ шүүгээ тухайн байрт гарч ирнэ'],
                        ['3', '«+ Нэмэх» товч', 'Дэлгэцийн дээд хэсгийн «+ Нэмэх» товчоор сонгогдсон шүүгээний хажууд автоматаар нэмнэ'],
                        ['4', 'Байрлуулах', 'Нэмэгдсэн шүүгээг хулганаар чирж байрлуулна. «Зэрэгцүүлэх» товч бүгдийг нэг шугамд тэгшилнэ'],
                      ].map(([n, t, d]) => (
                        <div key={n} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <div className="w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                          <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: Dimensions ── */}
                {helpTab === 3 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">Шүүгээний өргөн (W), өндөр (H), гүнийг (D) нарийвчлан тохируулна. Слайдер чирэх эсвэл тоо шууд бичнэ.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 148" className="w-full" style={{ maxHeight: 148 }}>
                        {/* Cabinet */}
                        <rect x="20" y="18" width="130" height="122" rx="4" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                        {/* Width */}
                        <line x1="20" y1="10" x2="150" y2="10" stroke="#d97706" strokeWidth="1.5"/>
                        <line x1="20" y1="6" x2="20" y2="14" stroke="#d97706" strokeWidth="1.5"/>
                        <line x1="150" y1="6" x2="150" y2="14" stroke="#d97706" strokeWidth="1.5"/>
                        <text x="85" y="7" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold">Өргөн (W)</text>
                        {/* Height */}
                        <line x1="10" y1="18" x2="10" y2="140" stroke="#3b82f6" strokeWidth="1.5"/>
                        <line x1="6" y1="18" x2="14" y2="18" stroke="#3b82f6" strokeWidth="1.5"/>
                        <line x1="6" y1="140" x2="14" y2="140" stroke="#3b82f6" strokeWidth="1.5"/>
                        <text x="3" y="82" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold" transform="rotate(-90, 3, 82)">Өндөр (H)</text>
                        {/* Depth */}
                        <line x1="150" y1="18" x2="175" y2="4" stroke="#10b981" strokeWidth="1.5"/>
                        <text x="188" y="7" fill="#10b981" fontSize="8" fontWeight="bold">Гүн (D)</text>
                        {/* Legs */}
                        <rect x="25" y="140" width="10" height="5" rx="2" fill="#4b5563"/>
                        <rect x="135" y="140" width="10" height="5" rx="2" fill="#4b5563"/>
                        <text x="85" y="148" textAnchor="middle" fill="#6b7280" fontSize="7">Хөлтэй горим</text>
                        {/* Config panel */}
                        <rect x="192" y="5" width="263" height="138" rx="8" fill="#12141c" stroke="#374151" strokeWidth="1.5"/>
                        <text x="323" y="22" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">АЛХАМ 1 — ИХ БИЕ</text>
                        {[{l:'Өргөн (W)', v:'600мм', c:'#d97706', pct:0.5, y:32},{l:'Өндөр (H)', v:'750мм', c:'#3b82f6', pct:0.63, y:60},{l:'Гүн (D)', v:'560мм', c:'#10b981', pct:0.4, y:88}].map(f=>(
                          <g key={f.y}>
                            <text x="202" y={f.y+2} fill="#9ca3af" fontSize="7">{f.l}</text>
                            <rect x="202" y={f.y+6} width="243" height="12" rx="6" fill="#1a1d28"/>
                            <rect x="202" y={f.y+6} width={243*f.pct} height="12" rx="6" fill={f.c} opacity="0.3"/>
                            <circle cx={202+243*f.pct} cy={f.y+12} r="6" fill={f.c}/>
                            <text x="443" y={f.y+14} textAnchor="end" fill={f.c} fontSize="7" fontWeight="bold">{f.v}</text>
                          </g>
                        ))}
                        <text x="202" y="118" fill="#6b7280" fontSize="7">✏️ Слайдер чирэх эсвэл талбарт тоо бичих</text>
                        <rect x="202" y="122" width="243" height="15" rx="5" fill="#1a1d28" stroke="#374151"/>
                        <text x="323" y="133" textAnchor="middle" fill="#9ca3af" fontSize="7">600</text>
                        <text x="437" y="133" textAnchor="end" fill="#6b7280" fontSize="7">мм</text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['📏', 'Өргөн (W)', 'Шүүгээний хэвтэх зай. Гал тогоо: 300–1200мм. Шкаф: 600–1200мм'],
                        ['📐', 'Өндөр (H)', 'Дэлгэрэнгүй: Гал тогооны доод 750мм, дээд 700мм. Шкаф: 1800–2400мм'],
                        ['📦', 'Гүн (D)', 'Стандарт: Доод шүүгээ 560мм, дээд 300мм. Шкаф: 550–600мм'],
                        ['🦵', 'Хөл нэмэх', '«Хөлтэй» сонгоход 100мм хөлийн өндөр нэмэгдэж, кабинет 100мм өргөгдөнө'],
                        ['🔢', 'Тоо шууд бичих', 'Слайдерын баруун талд байгаа хайрцагт тоо бичиж ENTER дарна — хамгийн нарийвчлалтай аргачлал'],
                      ].map(([ic, t, d]) => (
                        <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm shrink-0">{ic}</span>
                          <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 4: Doors ── */}
                {helpTab === 4 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">«Нүүр/Өнгө» алхамд хаалганы тоо, загвар болон хэлбэрийг тохируулна. «Тус бүрээр тохируулах» горимд зүүн/баруун хаалгыг тусад нь тохируулж болно.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 138" className="w-full" style={{ maxHeight: 138 }}>
                        {/* 1 door */}
                        <rect x="5" y="8" width="80" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        <rect x="9" y="12" width="72" height="102" rx="3" fill="#d97706" opacity="0.1" stroke="#d97706" strokeWidth="1"/>
                        <circle cx="73" cy="63" r="3.5" fill="#d97706" opacity="0.7"/>
                        <text x="45" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">1 хаалга</text>

                        {/* 2 doors */}
                        <rect x="97" y="8" width="100" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        <rect x="101" y="12" width="43" height="102" rx="3" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="1"/>
                        <rect x="149" y="12" width="43" height="102" rx="3" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="1"/>
                        <circle cx="140" cy="63" r="3.5" fill="#3b82f6" opacity="0.7"/>
                        <circle cx="153" cy="63" r="3.5" fill="#3b82f6" opacity="0.7"/>
                        <text x="147" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">2 хаалга</text>

                        {/* Custom L=0, R=2 */}
                        <rect x="210" y="8" width="110" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        <text x="240" y="55" fill="#4b5563" fontSize="8">хаалга</text>
                        <text x="240" y="65" fill="#4b5563" fontSize="8">байхгүй</text>
                        <line x1="265" y1="10" x2="265" y2="116" stroke="#374151" strokeWidth="1" strokeDasharray="3,2"/>
                        <rect x="268" y="12" width="24" height="102" rx="3" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1"/>
                        <rect x="294" y="12" width="22" height="102" rx="3" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1"/>
                        <circle cx="266" cy="63" r="3.5" fill="#10b981" opacity="0.7"/>
                        <circle cx="292" cy="63" r="3.5" fill="#10b981" opacity="0.7"/>
                        <text x="265" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">Зүүн=0, Баруун=2</text>

                        {/* Glass door */}
                        <rect x="333" y="8" width="122" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        <rect x="337" y="12" width="52" height="102" rx="3" fill="#60a5fa" opacity="0.06" stroke="#60a5fa" strokeWidth="1"/>
                        <rect x="350" y="22" width="12" height="82" rx="2" fill="#93c5fd" opacity="0.18"/>
                        <rect x="397" y="12" width="52" height="102" rx="3" fill="#60a5fa" opacity="0.06" stroke="#60a5fa" strokeWidth="1"/>
                        <rect x="410" y="22" width="12" height="82" rx="2" fill="#93c5fd" opacity="0.18"/>
                        <text x="394" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">Шилэн хаалга</text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['🔢', 'Хаалганы тоо', '+ / − товчоор нийт хаалганы тоог тохируулна. 0 = хаалгагүй'],
                        ['✅', 'Тус бүрээр тохируулах', 'Нүдийг чагталбал зүүн/баруун хаалгыг тусад нь тохируулна. Зүүн=1, Баруун=2 гэх мэт'],
                        ['🪟', 'Шилэн хаалга', 'Хаалганы дотор шил хийж харуулна. Тухайн шүүгээний «Шилэн хаалга» чагтлаад идэвхжүүлнэ'],
                        ['🎨', 'Хавтгай vs Классик', '«ХАВТГАЙ» = орчин үеийн цэвэр загвар. «КЛАССИК» = дунд дэвсгэртэй уламжлалт хаалга'],
                        ['🚗', 'Автомат өргөн', 'Хаалганы өргөн секцийн хэмжээнд тааруулан автоматаар тооцоологдоно'],
                      ].map(([ic, t, d]) => (
                        <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm shrink-0">{ic}</span>
                          <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 5: Shelves & Partitions ── */}
                {helpTab === 5 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">«Дотор» алхамд тавиур, хуваалт, шургуулга нэмж дотор орон зайг тохируулна. 3D-д хулганаар чирж байрлуулж болно.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                        {/* Cabinet with shelves */}
                        <rect x="5" y="5" width="120" height="130" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        {[38, 75, 112].map((y, i) => (
                          <g key={i}>
                            <rect x="9" y={y} width="112" height="7" rx="2" fill="#d97706" opacity={i===1?0.55:0.25} stroke="#d97706" strokeWidth={i===1?1:0}/>
                          </g>
                        ))}
                        <path d="M65 75 L65 55" stroke="#d97706" strokeWidth="1" strokeDasharray="3,2"/>
                        <text x="65" y="50" textAnchor="middle" fill="#d97706" fontSize="7">↕ чирэх</text>
                        <text x="65" y="138" textAnchor="middle" fill="#9ca3af" fontSize="7">3 тавиур</text>
                        {/* Partition */}
                        <rect x="140" y="5" width="120" height="130" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        <rect x="195" y="9" width="6" height="122" rx="2" fill="#3b82f6" opacity="0.45"/>
                        <text x="165" y="72" textAnchor="middle" fill="#6b7280" fontSize="7">Зүүн</text>
                        <text x="165" y="82" textAnchor="middle" fill="#6b7280" fontSize="7">секц</text>
                        <text x="225" y="72" textAnchor="middle" fill="#6b7280" fontSize="7">Баруун</text>
                        <text x="225" y="82" textAnchor="middle" fill="#6b7280" fontSize="7">секц</text>
                        <path d="M198 30 L215 30" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2"/>
                        <text x="216" y="33" fill="#3b82f6" fontSize="6">↔ чирэх</text>
                        <text x="200" y="138" textAnchor="middle" fill="#9ca3af" fontSize="7">1 хуваалт</text>
                        {/* Drawers */}
                        <rect x="275" y="5" width="120" height="130" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                        {[0,1,2].map(i=>(
                          <g key={i}>
                            <rect x="279" y={10+i*42} width="112" height="36" rx="3" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="1"/>
                            <line x1="300" y1={29+i*42} x2="370" y2={29+i*42} stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                          </g>
                        ))}
                        <text x="335" y="138" textAnchor="middle" fill="#9ca3af" fontSize="7">3 шургуулга</text>
                        {/* labels */}
                        <text x="395" y="30" fill="#d97706" fontSize="8">← Тавиур</text>
                        <text x="395" y="72" fill="#3b82f6" fontSize="8">← Хуваалт</text>
                        <text x="395" y="100" fill="#10b981" fontSize="8">← Шургуулга</text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['📚', 'Тавиур', '«Дотор» алхамд «Тавиурын тоо» слайдераар тохируулна. 3D-д тавиурыг чирж өндрийг өөрчилнэ'],
                        ['⬛', 'Хуваалт (Секц)', 'Шүүгээний дотор босоо хуваах хавтан. 3D-д хавтан чирж байрлалыг өөрчилнэ'],
                        ['🗄️', 'Шургуулга', 'Дотоод татаж нээдэг шургуулга. Хаалгатай хамт ашиглах боломжтой'],
                        ['📐', 'Хуваарилалт', 'Олон секцтэй үед тавиур тэнцүү хуваарилагдана. Секц бүр тусад нь тавиуртай болно'],
                      ].map(([ic, t, d]) => (
                        <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm shrink-0">{ic}</span>
                          <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 6: Colors ── */}
                {helpTab === 6 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">Их биеийн болон хаалганы өнгийг «Нүүр/Өнгө» болон «Дотор» алхамаас тохируулна. Бэлэн өнгө эсвэл дурын hex өнгө оруулж болно.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                        {/* Body */}
                        <rect x="5" y="5" width="215" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                        <text x="112" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ИХ БИЕИЙН МАТЕРИАЛ</text>
                        {[{x:25,c:'#f5f5f5',s:'#d1d5db',n:'Цагаан'},{x:65,c:'#c19a6b',s:'#a0785a',n:'Шар мод'},{x:105,c:'#1f2937',s:'#374151',n:'Хар'},{x:145,c:'#8b5a2b',s:'#7a4f26',n:'Гагнуур'},{x:185,c:'#e5dfd3',s:'#c8c0b2',n:'Кrem'}].map(s=>(
                          <g key={s.x}><circle cx={s.x} cy={60} r={17} fill={s.c} stroke={s.s} strokeWidth="1.5"/><text x={s.x} y={88} textAnchor="middle" fill="#9ca3af" fontSize="6">{s.n}</text></g>
                        ))}
                        <rect x="10" y="98" width="205" height="18" rx="5" fill="#12141c" stroke="#374151"/>
                        <text x="50" y="110" fill="#6b7280" fontSize="7">#</text>
                        <text x="65" y="110" fill="#d97706" fontSize="7">ffffff</text>
                        <text x="160" y="110" fill="#6b7280" fontSize="6">↩ Дурын өнгө</text>
                        <text x="112" y="128" textAnchor="middle" fill="#4b5563" fontSize="6">★ Хадгалах — дараа дахин ашиглах</text>
                        {/* Door */}
                        <rect x="235" y="5" width="220" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                        <text x="345" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ХААЛГАНЫ МАТЕРИАЛ</text>
                        {[{x:255,c:'#d97706',s:'#b45309',n:'Алтан'},{x:295,c:'#fafafa',s:'#e5e7eb',n:'Цагаан'},{x:335,c:'#111827',s:'#374151',n:'Хар'},{x:375,c:'#2563eb',s:'#1d4ed8',n:'Цэнхэр'},{x:415,c:'#c19a6b',s:'#a0785a',n:'Мод'}].map(s=>(
                          <g key={s.x}><circle cx={s.x} cy={60} r={17} fill={s.c} stroke={s.s} strokeWidth="1.5"/><text x={s.x} y={88} textAnchor="middle" fill="#9ca3af" fontSize="6">{s.n}</text></g>
                        ))}
                        <text x="345" y="108" textAnchor="middle" fill="#6b7280" fontSize="7">Их биеийн өнгөнөөс</text>
                        <text x="345" y="118" textAnchor="middle" fill="#6b7280" fontSize="7">тусад нь тохируулна</text>
                        <text x="345" y="130" textAnchor="middle" fill="#4b5563" fontSize="6">«Классик» = автоматаар MDF цагаан</text>
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['🪵', 'Бэлэн өнгө', 'Дэлгэцэд гарах өнгийн жагсаалтаас нэгийг сонгоно — тухайн шүүгээний материал шууд өөрчлөгдөнө'],
                        ['🎨', 'Дурын өнгө', 'Hex кодоор (#ff5733) эсвэл өнгийн спектрт дарж дурын өнгийг оруулна'],
                        ['💾', 'Өнгө хадгалах', '«☆ Хадгалах» товч дарж дурын өнгөө хадгаллаа. Цаашид хурдан сонгоход ашиглана'],
                        ['🚪', 'Хаалганы өнгө', 'Их биеийн өнгөнөөс тусад нь хаалганы өнгийг тохируулна. «Классик» загварт цагаан MDF автомат болно'],
                      ].map(([ic, t, d]) => (
                        <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm shrink-0">{ic}</span>
                          <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 7: Save & Export ── */}
                {helpTab === 7 && (
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">Зохион бүтээсэн тавилгаа хадгалах, экспорт хийх, хэвлэх боломжтой.</p>
                    <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                      <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                        {/* Save panel */}
                        <rect x="5" y="5" width="130" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                        <text x="70" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">БАЙРЛАЛ ХАДГАЛАХ</text>
                        <rect x="12" y="28" width="116" height="20" rx="5" fill="#d97706" opacity="0.9"/>
                        <text x="70" y="41" textAnchor="middle" fill="#0a0a0a" fontSize="7" fontWeight="bold">💾 Байрлал хадгалах</text>
                        {['🏠 Гал тогоо 1', '🛋️ Зочны өрөө', '🛏️ Унтлага'].map((t,i)=>(
                          <g key={i}>
                            <rect x="12" y={54+i*22} width="116" height="18" rx="4" fill={i===0?'#1e3a5f':'#12141c'} stroke={i===0?'#3b82f6':'#374151'} strokeWidth="1"/>
                            <text x="20" y={66+i*22} fill={i===0?'#93c5fd':'#6b7280'} fontSize="7">{t}</text>
                          </g>
                        ))}
                        <text x="70" y="126" textAnchor="middle" fill="#4b5563" fontSize="6">«Ачаалах» дарж сэргээнэ</text>
                        {/* Template */}
                        <rect x="148" y="5" width="145" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                        <text x="220" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ХУВИЛАХ & ЗАГВАР</text>
                        <rect x="155" y="28" width="131" height="20" rx="5" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1"/>
                        <text x="220" y="41" textAnchor="middle" fill="#10b981" fontSize="7" fontWeight="bold">👯 Шүүгээ хувилах</text>
                        <rect x="155" y="54" width="131" height="20" rx="5" fill="#a855f7" opacity="0.15" stroke="#a855f7" strokeWidth="1"/>
                        <text x="220" y="67" textAnchor="middle" fill="#a855f7" fontSize="7" fontWeight="bold">⭐ Загвар болгон хадгалах</text>
                        <text x="220" y="92" textAnchor="middle" fill="#6b7280" fontSize="6">Хадгалсан загвар</text>
                        <text x="220" y="102" textAnchor="middle" fill="#6b7280" fontSize="6">«Миний загварууд»</text>
                        <text x="220" y="112" textAnchor="middle" fill="#6b7280" fontSize="6">хэсэгт харагдана</text>
                        {/* Export */}
                        <rect x="306" y="5" width="149" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                        <text x="380" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ЭКСПОРТ</text>
                        {[{c:'#d97706',t:'🖨️ Хэвлэх / PDF',y:28},{c:'#3b82f6',t:'📋 Бэлдцийн жагсаалт',y:56},{c:'#10b981',t:'✂️ Зүсэлт оновчлол',y:84},{c:'#6b7280',t:'📸 3D зураг хадгалах',y:112}].map(e=>(
                          <g key={e.y}>
                            <rect x="313" y={e.y} width="135" height="22" rx="5" fill={`${e.c}18`} stroke={e.c} strokeWidth="1" opacity="0.75"/>
                            <text x="380" y={e.y+14} textAnchor="middle" fill={e.c} fontSize="7" fontWeight="bold">{e.t}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        ['💾', 'Байрлал хадгалах', 'Дэлгэцийн дээд баруун хэсгийн «💾 Байрлал хадгалах» товч. Бүх шүүгээний байрлал хадгалагдана'],
                        ['👯', 'Шүүгээ хувилах', 'Шүүгээн дээр баруун товч дарж «Хувилах» сонгоно — адилхан шүүгээ хажууд нэмэгдэнэ'],
                        ['⭐', 'Загвар болгох', 'Тохируулсан шүүгээг загвар болгон хадгаллаа. Ирээдүйд «Миний загварууд»-аас ашиглана'],
                        ['🖨️', 'Хэвлэх / PDF', '«Хэвлэх» товчоор техникийн хуудас + бэлдцийн жагсаалт PDF болж хадгалагдана'],
                        ['✂️', 'Зүсэлт оновчлол', '«Зүсэлт» хуудасруу орж хавтангуудыг хамгийн хэмнэлттэй зүсэх схемийг харна'],
                      ].map(([ic, t, d]) => (
                        <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm shrink-0">{ic}</span>
                          <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                        </div>
                      ))}
                      <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg p-2.5">
                        <p className="text-[10px] text-amber-300">💡 <strong>Зөвлөмж:</strong> Хэрэглэгчтэй хуваалцахдаа «Байрлал хадгалах» товчоор хадгаллаад браузерийг хаагаад дахин нээхэд ажлаа үргэлжлүүлнэ!</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer navigation */}
              <div className="px-5 py-3 border-t border-white/8 bg-[#0e1018] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  {TABS.map((_, i) => (
                    <button key={i} onClick={() => setHelpTab(i)} className={`transition-all cursor-pointer rounded-full ${helpTab === i ? 'bg-amber-400 w-4 h-1.5' : 'bg-neutral-700 hover:bg-neutral-500 w-1.5 h-1.5'}`}/>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {helpTab > 0 && (
                    <button onClick={() => setHelpTab(h => h - 1)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer border border-white/5">
                      ← Өмнөх
                    </button>
                  )}
                  {helpTab < TABS.length - 1 ? (
                    <button onClick={() => setHelpTab(h => h + 1)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                      Дараах →
                    </button>
                  ) : (
                    <button onClick={() => setShowHelpModal(false)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                      ✓ Ойлголоо
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
export default Editor;
