import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore, getCabinetSections } from '../store/projectStore';
import { ThreeViewer } from '../components/ThreeViewer';
import { TemplateThumbnail } from '../components/TemplateThumbnail';
import { Sparkles, Eye, Ruler, Grid, Layers, Move, RefreshCw, Send, Check, Plus, Trash2, Box, Copy, Magnet, Printer, X, FileText } from 'lucide-react';

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

  const [explode, setExplode] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [openDoors, setOpenDoors] = useState(false);
  const [snapping, setSnapping] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [viewMode, setViewMode] = useState<'perspective' | 'front' | 'top' | 'side'>('perspective');
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
    if (['wardrobe'].includes(type)) return 'bedroom';
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
        shelves: 6,
        drawers: 4,
        doors: 3,
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
        drawers: 3,
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
          onClick={() => setMobileTab('settings')}
          className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'settings'
              ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          ⚙️ Тохиргоо
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
      <div className={`lg:col-span-6 flex flex-col gap-4 ${isMobile ? (mobileTab === '3d' ? 'flex h-[55vh]' : 'hidden') : 'flex h-[920px]'}`}>
        {/* Visualizer HUD controls */}
        <div className="flex justify-between items-center gap-4 bg-[#12141c] border border-white/5 px-4 py-3 rounded-xl overflow-x-auto scrollbar-none whitespace-nowrap">
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setViewMode('perspective')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'perspective' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Космос
            </button>
            <button
              onClick={() => setViewMode('front')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'front' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Урдаас
            </button>
            <button
              onClick={() => setViewMode('top')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'top' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Дээрээс
            </button>
            <button
              onClick={() => setViewMode('side')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'side' ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Хажуугаас
            </button>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setExplode(!explode)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                explode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Задрах зураг"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setOpenDoors(!openDoors)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                openDoors ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Шургуулга / Хаалга нээх"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                showDimensions ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Хэмжээс шугам"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setMeasureMode(!measureMode)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                measureMode ? 'bg-amber-500 text-neutral-950 border border-amber-600' : 'bg-neutral-800 text-neutral-400 border border-transparent hover:text-white'
              }`}
              title="Метр (A-B хэмжилт)"
            >
              <Ruler size={16} />
            </button>
            <button
              onClick={() => setSnapping(!snapping)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                snapping ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-transparent'
              }`}
              title="Соронзон наалдац (Соронзон мэт татах)"
            >
              <Magnet size={16} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            <button
              onClick={() => {
                if ((activeProject.modules || []).length === 0) return;
                if (confirm('3D дэлгэцийн бүх хайрцгийг устгах уу?')) {
                  clearAllModules();
                }
              }}
              className="p-2 rounded-lg transition-all cursor-pointer bg-neutral-800 text-neutral-400 border border-transparent hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
              title="Бүгдийг устгах"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* 3D Canvas element wrapper */}
        <div
          className={`flex-1 rounded-2xl overflow-hidden border transition-all relative ${
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
              if (tplId.startsWith('custom-')) {
                const realId = tplId.replace('custom-', '');
                const tpl = customTemplates.find((t) => t.id === realId);
                if (tpl) {
                  addModuleToActive(tpl.type, tpl.config, tpl.name);
                  return;
                }
              } else {
                const tpl = templates.find((t) => t.id === tplId);
                if (tpl) {
                  addModuleToActive(tpl.type, tpl.config, tpl.name);
                  return;
                }
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
            project={activeProject}
            materials={materials}
            explode={explode}
            showDimensions={showDimensions}
            openDoors={openDoors}
            viewMode={viewMode}
            enableSnapping={snapping}
            measureMode={measureMode}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Configuration sliders side panel (col-span-2) */}
      <div className={`lg:col-span-3 flex flex-col gap-6 max-h-[920px] overflow-y-auto pr-2 ${isMobile ? (mobileTab === 'settings' ? 'flex' : 'hidden') : 'flex'}`}>
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

        {/* Dimension parameters sliders panel */}
        <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-white text-base">Хэмжээ болон Дэд хэсгүүд</h3>
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-lg text-amber-400 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              title="Тохиргооны хэвлэмэл хэлбэр"
            >
              <Printer size={12} />
              <span>Хэвлэх</span>
            </button>
          </div>

          {/* Width */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
              <span>Өргөн (Width)</span>
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
                <span>мм</span>
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
          </div>

          {/* Height */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
              <span>Өндөр (Height)</span>
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
                <span>мм</span>
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
          </div>

          {/* Depth */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
              <span>Гүн (Depth)</span>
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
                <span>мм</span>
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
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-5">
            {/* Shelves count */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Тавиур хавтан</label>
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
              <label className="text-xs text-neutral-400 font-semibold">Шургуулга</label>
              <input
                type="number"
                min={0}
                max={10}
                value={config.drawers}
                onChange={(e) => updateActiveConfig({ drawers: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
              />
            </div>

            {/* Shelves spacing/height sliders */}
            {config.shelves >= 0 && (() => {
              const shelvesCount = Number(config.shelves) || 0;
              const legHeight = config.hasLegs ? 100 : 0;
              const insideHeight = Number(config.height) - legHeight - 36;
              let sPositions = config.shelfPositions || [];
              
              const isMultiSection = selectedMod?.type === 'wardrobe' || selectedMod?.type === 'bookshelf';

              // Only rebuild positions when truly needed (and don't override stored per-section data)
              const storedCountsRaw: number[] | undefined = (config as any).sectionShelfCounts;
              const hasValidStoredCounts = isMultiSection && storedCountsRaw &&
                storedCountsRaw.length > 0 &&
                storedCountsRaw.reduce((a, b) => a + b, 0) === shelvesCount;

              if (sPositions.length !== shelvesCount) {
                // If we have valid stored per-section counts, rebuild positions respecting those counts
                if (hasValidStoredCounts && isMultiSection) {
                  const sections = getCabinetSections(Number(config.width), config, selectedMod!.type);
                  sPositions = [];
                  storedCountsRaw!.forEach((cnt, sIdx) => {
                    const step = insideHeight / (cnt + 1);
                    for (let i = 0; i < cnt; i++) {
                      sPositions.push(Math.round((i + 1) * step));
                    }
                  });
                } else if (isMultiSection) {
                  const sections = getCabinetSections(Number(config.width), config, selectedMod!.type);
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
                const sections = getCabinetSections(Number(config.width), config, selectedMod!.type);
                // Default even distribution counts
                const secCounts: number[] = sections.map((_, sIdx) =>
                  Math.floor(shelvesCount / sections.length) + (sIdx < shelvesCount % sections.length ? 1 : 0)
                );
                // Prefer stored counts if valid
                const storedCounts: number[] | undefined = (config as any).sectionShelfCounts;
                const finalSecCounts: number[] = storedCounts && storedCounts.length === sections.length && storedCounts.reduce((a,b)=>a+b,0) === shelvesCount
                  ? storedCounts
                  : secCounts;
                
                let currentGlobalIdx = 0;
                
                return (
                  <div className="flex flex-col gap-3 mt-1 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl col-span-2">
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Тавиурын өндөр (секцээр)</span>
                    {sections.map((sec, sIdx) => {
                      const shelvesInSec = finalSecCounts[sIdx] ?? 0;
                      const secStartIdx = currentGlobalIdx;
                      currentGlobalIdx += shelvesInSec;
                      const secStart = secStartIdx; // capture for closures

                      // Add shelf to this section — recompute all sections evenly
                      const addShelfToSection = () => {
                        const newCounts = [...finalSecCounts];
                        newCounts[sIdx] = shelvesInSec + 1;
                        // Recompute ALL sections evenly (clean, no index tracking bugs)
                        const rebuiltPos: number[] = [];
                        newCounts.forEach((cnt) => {
                          const step = insideHeight / (cnt + 1);
                          for (let i = 0; i < cnt; i++) {
                            rebuiltPos.push(Math.round((i + 1) * step));
                          }
                        });
                        updateActiveConfig({ shelves: shelvesCount + 1, shelfPositions: rebuiltPos, sectionShelfCounts: newCounts } as any);
                      };

                      // Remove last shelf from this section — recompute all sections evenly
                      const removeShelfFromSection = () => {
                        if (shelvesInSec === 0) return;
                        const newCounts = [...finalSecCounts];
                        newCounts[sIdx] = shelvesInSec - 1;
                        // Recompute ALL sections evenly (clean, no index tracking bugs)
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
                          {/* Section header with +/- buttons */}
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
                              >
                                −
                              </button>
                              <button
                                onClick={addShelfToSection}
                                disabled={shelvesInSec >= 12}
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 font-bold text-sm transition-all cursor-pointer border border-white/5 hover:border-emerald-500/30"
                                title="Тавиур нэмэх"
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

              // Standard single section behavior
              return (
                <div className="flex flex-col gap-3 mt-1 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Тавиурын өндөр (мм, доороос)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (shelvesCount === 0) {
                            // First shelf: middle of cabinet
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


            {/* Cabinet Partitions / Dividers Config */}
            {(selectedMod?.type === 'cabinet' || selectedMod?.type === 'wardrobe' || selectedMod?.type === 'bookshelf') && (
              <div className="flex flex-col gap-2 col-span-2 border-t border-white/5 pt-4">
                {(() => {
                  const getDefaultPartitions = (type: string, cfg: any) => {
                    if (type === 'wardrobe') return cfg.doors > 1 ? cfg.doors - 1 : 0;
                    if (type === 'cabinet') return cfg.doors > 0 ? (cfg.drawers > 0 ? cfg.doors : cfg.doors - 1) : 0;
                    return 0;
                  };
                  const defaultPartitions = getDefaultPartitions(selectedMod.type, config);
                  const partitions = config.partitions !== undefined ? Number(config.partitions) : defaultPartitions;
                  const totalW = Number(config.width);

                  // Retrieve or calculate positions (measured from left outer edge)
                  let dPositions = config.dividerPositions || [];
                  if (dPositions.length !== partitions) {
                    dPositions = [];
                    for (let i = 0; i < partitions; i++) {
                      dPositions.push(Math.round((i + 1) * totalW / (partitions + 1)));
                    }
                  }

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-neutral-400 font-semibold">Босоо хуваалтын тоо</label>
                        <span className="text-xs text-amber-500 font-bold">{partitions}</span>
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
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Хуваалтуудын байрлал (мм)</span>
                          {dPositions.map((pos, i) => {
                            const minVal = i === 0 ? 100 : dPositions[i - 1] + 100;
                            const maxVal = i === partitions - 1 ? totalW - 100 : dPositions[i + 1] - 100;

                            return (
                              <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                                  <span>Хуваалт {i + 1}</span>
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



            {/* Doors config or count */}
            {(selectedMod?.type === 'custom' || selectedMod?.type === 'kitchen_lower' || selectedMod?.type === 'kitchen_upper' || selectedMod?.type === 'built_in_hood' || selectedMod?.type === 'sink' || selectedMod?.type === 'cabinet' || selectedMod?.type === 'vitrine') ? (
              <div className="flex flex-col gap-2 col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-neutral-400 font-semibold">Хаалганы тохиргоо</label>
                  {selectedMod?.type !== 'cabinet' && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-neutral-400 select-none hover:text-white transition-all">
                      <input
                        type="checkbox"
                        checked={config.customDoors !== undefined ? !!config.customDoors : (selectedMod?.type === 'custom')}
                        onChange={(e) => {
                          const isCustom = e.target.checked;
                          updateActiveConfig({
                            customDoors: isCustom,
                            doors: isCustom ? ((config.leftDoor !== false ? 1 : 0) + (config.rightDoor !== false ? 1 : 0)) : 2
                          });
                        }}
                        className="w-3.5 h-3.5 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                      />
                      <span>Тус бүрээр тохируулах</span>
                    </label>
                  )}
                </div>

                {((config.customDoors !== undefined ? config.customDoors : (selectedMod?.type === 'custom')) && selectedMod?.type !== 'cabinet') ? (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex gap-6 mt-1 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="leftDoor"
                          checked={config.leftDoor !== undefined ? !!config.leftDoor : (Number(config.doors) === 1 || Number(config.doors) >= 2)}
                          onChange={(e) => {
                            const hasLeft = e.target.checked;
                            const hasRight = config.rightDoor !== undefined ? !!config.rightDoor : (Number(config.doors) >= 2);
                            updateActiveConfig({
                              leftDoor: hasLeft,
                              rightDoor: hasRight,
                              doors: (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)
                            });
                          }}
                          className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                        />
                        <label htmlFor="leftDoor" className="text-xs text-neutral-300 font-medium select-none cursor-pointer">Зүүн хаалга</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="rightDoor"
                          checked={config.rightDoor !== undefined ? !!config.rightDoor : (Number(config.doors) >= 2)}
                          onChange={(e) => {
                            const hasRight = e.target.checked;
                            const hasLeft = config.leftDoor !== undefined ? !!config.leftDoor : (Number(config.doors) === 1 || Number(config.doors) >= 2);
                            updateActiveConfig({
                              leftDoor: hasLeft,
                              rightDoor: hasRight,
                              doors: (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)
                            });
                          }}
                          className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                        />
                        <label htmlFor="rightDoor" className="text-xs text-neutral-300 font-medium select-none cursor-pointer">Баруун хаалга</label>
                      </div>
                    </div>

                    {(() => {
                      const hasLeft = config.leftDoor !== undefined ? !!config.leftDoor : (Number(config.doors) === 1 || Number(config.doors) >= 2);
                      const hasRight = config.rightDoor !== undefined ? !!config.rightDoor : (Number(config.doors) >= 2);
                      const baseH = config.hasLegs ? Number(config.height) - 100 : Number(config.height);
                      const defaultDWidth = Number(config.width) >= 800 ? (Number(config.width) - 10) / 2 : (Number(config.width) - 10);
                      
                      if (!hasLeft && !hasRight) return null;
                      
                      return (
                        <div className="grid grid-cols-2 gap-4 mt-2 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[11px] text-neutral-400">
                              <span>Хаалганы өргөн</span>
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  value={config.doorWidth || Math.round(defaultDWidth)}
                                  onChange={(e) => updateActiveConfig({ doorWidth: parseInt(e.target.value) || 0 })}
                                  onBlur={(e) => {
                                    const val = Math.max(100, Math.min(Number(config.width), parseInt(e.target.value) || 100));
                                    updateActiveConfig({ doorWidth: val });
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
                              onChange={(e) => updateActiveConfig({ doorWidth: parseInt(e.target.value) })}
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
                                  onChange={(e) => updateActiveConfig({ doorHeight: parseInt(e.target.value) || 0 })}
                                  onBlur={(e) => {
                                    const val = Math.max(100, Math.min(baseH, parseInt(e.target.value) || 100));
                                    updateActiveConfig({ doorHeight: val });
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
                              onChange={(e) => updateActiveConfig({ doorHeight: parseInt(e.target.value) })}
                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 mt-1 bg-[#0c0d12]/30 border border-white/5 p-3 rounded-xl">
                    <label className="text-[11px] text-neutral-400 font-semibold">Хаалганы тоо</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={config.doors}
                      onChange={(e) => updateActiveConfig({ doors: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Хаалганы тоо</label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={config.doors}
                  onChange={(e) => updateActiveConfig({ doors: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Leg status */}
            <div className="flex items-center gap-3 mt-5">
              <input
                type="checkbox"
                id="hasLegs"
                checked={config.hasLegs}
                onChange={(e) => updateActiveConfig({ hasLegs: e.target.checked })}
                className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500"
              />
              <label htmlFor="hasLegs" className="text-xs text-neutral-300 font-medium select-none cursor-pointer">
                Хөлтэй эсэх
              </label>
            </div>

            {/* Countertop status */}
            {(selectedMod && (selectedMod.type === 'custom' || selectedMod.type === 'kitchen_lower' || selectedMod.type === 'cooktop' || selectedMod.type === 'sink' || selectedMod.type === 'corner_lower')) && (
              <div className="flex flex-col gap-3 col-span-2 border-t border-white/5 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400 font-semibold">Тавцангийн төрөл</label>
                  <select
                    value={config.countertopType || 'none'}
                    onChange={(e) => updateActiveConfig({ countertopType: e.target.value as any })}
                    className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="none">Байхгүй</option>
                    <option value="stone">Чулуун тавцан</option>
                    <option value="wood">Модон тавцан</option>
                  </select>
                </div>

                {/* Cooktop stove toggle (only if not already the cooktop module type itself) */}
                {selectedMod.type !== 'cooktop' && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="hasCooktop"
                      checked={!!config.hasCooktop}
                      onChange={(e) => updateActiveConfig({ hasCooktop: e.target.checked })}
                      className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                    />
                    <label htmlFor="hasCooktop" className="text-xs text-neutral-300 font-medium select-none cursor-pointer flex items-center gap-1">
                      🔥 Плиткэн зуух суурилуулах
                    </label>
                  </div>
                )}

                {/* Burner controls — shown for cooktop type OR when hasCooktop is enabled */}
                {(selectedMod.type === 'cooktop' || !!config.hasCooktop) && (
                  <div className="flex flex-col gap-3 mt-2 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                    <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide">🔥 Давтан пластикийн тохиргоо</p>

                    {/* Burner count */}
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
                          >
                            {n} ширхэг
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Burner size — manual number input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-neutral-400">Пластикийн хэмжээ (мм)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          step={1}
                          value={config.burnerSize ?? 50}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v) && v >= 5) updateActiveConfig({ burnerSize: v });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-neutral-800/80 border border-white/10 focus:outline-none focus:border-amber-500/60 transition-all"
                          placeholder="50"
                        />
                        <span className="text-xs text-amber-400 font-semibold shrink-0">мм</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Glass Left/Right options for Vitrine */}
            {selectedMod?.type === 'vitrine' && (
              <div className="flex flex-col gap-3 col-span-2 border-t border-white/5 pt-4">
                <label className="text-xs text-neutral-400 font-semibold">
                  Хажуу талуудын шил
                </label>
                <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={!!config.glassLeft}
                      onChange={(e) => updateActiveConfig({ glassLeft: e.target.checked })}
                      className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Зүүн хажуу шилэн (Glass Left)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={!!config.glassRight}
                      onChange={(e) => updateActiveConfig({ glassRight: e.target.checked })}
                      className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Баруун хажуу шилэн (Glass Right)</span>
                  </label>
                </div>
              </div>
            )}

            {/* TV Unit options (base stand / wall mount) */}
            {selectedMod?.type === 'tv_unit' && (
              <div className="flex flex-col gap-3 col-span-2 border-t border-white/5 pt-4">
                <label className="text-xs text-neutral-400 font-semibold">
                  Зурагтын суурь
                </label>
                <div className="flex flex-col gap-2 bg-[#0c0d12]/50 border border-white/5 p-3 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={config.tvHasBase !== false}
                      onChange={(e) => updateActiveConfig({ tvHasBase: e.target.checked })}
                      className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500 cursor-pointer"
                    />
                    <span>ТВ суурь хөлтэй байх (Идэвхгүй бол суурьгүй)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Glass door option for upper cabinets */}
            {(selectedMod && (selectedMod.type === 'kitchen_upper' || selectedMod.type === 'built_in_hood' || selectedMod.type === 'corner_upper')) && (
              <div className="flex flex-col gap-1.5 col-span-2 border-t border-white/5 pt-4">
                <label className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5">
                  🪟 Шилэн хаалга
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
                    >
                      {gt === 'none' ? 'Байхгүй' : gt === 'clear' ? '🔷 Тунгалаг' : '❄️ Матт'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Хайрцагны байршил (3D) */}
        {selectedMod && (
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-display font-bold text-white text-base">Байршил (3D)</h3>
              <span className="text-[10px] text-neutral-500 font-bold uppercase truncate max-w-[120px]" title={selectedMod.name}>
                {selectedMod.name}
              </span>
            </div>

            {/* X coordinate */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-neutral-300">
                <span>Х тэнхлэг (Зүүн - Баруун)</span>
                <span className="text-amber-500 font-bold">{selectedMod.xOffset} мм</span>
              </div>
              <input
                type="range"
                min={-5000}
                max={5000}
                step={50}
                value={selectedMod.xOffset}
                onChange={(e) => updateModulePosition(selectedMod.id, parseInt(e.target.value), selectedMod.yOffset, selectedMod.zOffset)}
                className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Y coordinate */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-neutral-300">
                <span>Ү тэнхлэг (Өндөр / Давхарлах)</span>
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

            {/* Z coordinate */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-neutral-300">
                <span>Z тэнхлэг (Урагш - Хойш)</span>
                <span className="text-amber-500 font-bold">{selectedMod.zOffset} мм</span>
              </div>
              <input
                type="range"
                min={-4000}
                max={4000}
                step={50}
                value={selectedMod.zOffset}
                onChange={(e) => updateModulePosition(selectedMod.id, selectedMod.xOffset, selectedMod.yOffset, parseInt(e.target.value))}
                className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Rotation (Y-axis) */}
            <div className="flex flex-col gap-2">
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
              {/* Preset angle buttons */}
              <div className="flex gap-1.5 mt-0.5">
                {[0, 45, 90, 135, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updateModuleRotation(selectedMod.id, deg)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      Math.round(((selectedMod.rotation ?? 0) * 180) / Math.PI) === deg
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-white/5 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateModulePosition(selectedMod.id, selectedMod.xOffset, 0, selectedMod.zOffset)}
                  className="py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
                  title="Шал руу буулгах"
                >
                  Шал руу буулгах
                </button>
                <button
                  type="button"
                  onClick={() => duplicateModule(selectedMod.id)}
                  className="py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
                  title="Хайрцаг хувилах"
                >
                  Хайрцаг хувилах
                </button>
              </div>
              {/* Save as box template */}
              <div className="flex flex-col gap-2 bg-[#0c0d12]/60 border border-amber-500/10 rounded-xl p-3">
                <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>📦</span> Box загвар болгон хадгалах
                </div>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={selectedMod.name}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500/60 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none transition-all placeholder:text-neutral-600"
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
                  className={`w-full py-2 font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    saveSuccess
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/20 hover:border-amber-500/50 text-amber-400'
                  }`}
                >
                  {saveSuccess ? '✓ Хадгалагдлаа!' : '📦 Box загвар хадгалах'}
                </button>
              </div>

              {/* Save full layout */}
              <div className="flex flex-col gap-2 bg-[#0c0d12]/60 border border-cyan-500/10 rounded-xl p-3">
                <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏗️</span> Бүтэн загвар хадгалах
                  <span className="ml-auto text-[8px] text-neutral-600 normal-case font-normal tracking-normal">
                    {(activeProject.modules || []).length} хайрцаг
                  </span>
                </div>
                <input
                  type="text"
                  value={layoutSaveName}
                  onChange={(e) => setLayoutSaveName(e.target.value)}
                  placeholder={`${activeProject.name} layout`}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none transition-all placeholder:text-neutral-600"
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
                  className={`w-full py-2 font-bold rounded-xl transition-all cursor-pointer text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                    layoutSaveSuccess
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                      : 'bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/15 hover:border-cyan-500/40 text-cyan-400'
                  }`}
                >
                  {layoutSaveSuccess ? '✓ Хадгалагдлаа!' : '🏗️ Бүтэн загвар хадгалах'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Нэмэлт деталиуд (Хэсгүүд) */}
        {selectedMod && (
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-display font-bold text-white text-base">Нэмэлт хавтан (Деталь)</h3>
              <button
                type="button"
                onClick={() => setShowAddPartForm(!showAddPartForm)}
                className="px-2 py-1 bg-[#1c1f2b] hover:bg-amber-500 hover:text-neutral-950 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all"
              >
                {showAddPartForm ? 'Хаах' : 'Шинэ деталь нэмэх'}
              </button>
            </div>

            {/* Add manual part form inside Editor */}
            {showAddPartForm && (
              <form onSubmit={handleAddCustomPart} className="flex flex-col gap-3.5 bg-[#0c0d12]/40 border border-white/5 p-4 rounded-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-400 font-semibold">Нэр</label>
                  <input
                    type="text"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Өргөн (мм)</label>
                    <input
                      type="number"
                      value={newPartWidth}
                      onChange={(e) => setNewPartWidth(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Өндөр (мм)</label>
                    <input
                      type="number"
                      value={newPartHeight}
                      onChange={(e) => setNewPartHeight(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Ширхэг</label>
                    <input
                      type="number"
                      min={1}
                      value={newPartQty}
                      onChange={(e) => setNewPartQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Ангилал</label>
                    <select
                      value={newPartCategory}
                      onChange={(e) => setNewPartCategory(e.target.value as any)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {['Хажуу хана', 'Дээд тавиур', 'Доод тавиур', 'Хаалга', 'Шургуулга', 'Ар тал', 'Хуваалт'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Ирмэг</label>
                    <select
                      value={newPartEdge}
                      onChange={(e) => setNewPartEdge(e.target.value as any)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="none">Байхгүй</option>
                      <option value="1mm">1мм</option>
                      <option value="2mm">2мм</option>
                      <option value="all-sides">4 тал</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Материал</label>
                    <select
                      value={newPartMaterialId}
                      onChange={(e) => setNewPartMaterialId(e.target.value)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {materials.map(mat => (
                        <option key={mat.id} value={mat.id}>{mat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Offset fields */}
                <div className="border-t border-white/5 pt-2 mt-1">
                  <span className="text-[9px] text-neutral-500 uppercase font-bold">Эхлэх байршил</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[8px] text-neutral-400">X (мм)</label>
                      <input
                        type="number"
                        value={newPartXOffset}
                        onChange={(e) => setNewPartXOffset(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded px-1.5 py-1 text-white text-[10px] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[8px] text-neutral-400">Y (мм)</label>
                      <input
                        type="number"
                        value={newPartYOffset}
                        onChange={(e) => setNewPartYOffset(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded px-1.5 py-1 text-white text-[10px] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[8px] text-neutral-400">Z (мм)</label>
                      <input
                        type="number"
                        value={newPartZOffset}
                        onChange={(e) => setNewPartZOffset(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded px-1.5 py-1 text-white text-[10px] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  Шүүгээнд нэмэх
                </button>
              </form>
            )}

            {/* List of manual parts */}
            <div className="flex flex-col gap-2.5">
              {(() => {
                const parts = selectedMod.parts.filter(p => p.id.startsWith('p-manual-') || p.id.includes('manual'));
                if (parts.length === 0) {
                  return (
                    <div className="text-center text-xs text-neutral-500 py-3 bg-[#0c0d12]/20 border border-dashed border-white/5 rounded-xl">
                      Одоогоор гар аргаар нэмсэн деталь байхгүй байна.
                    </div>
                  );
                }

                return parts.map((part) => {
                  const isExp = expandedPartId === part.id;

                  return (
                    <div key={part.id} className="flex flex-col border border-white/5 bg-[#0c0d12]/30 rounded-xl overflow-hidden">
                      {/* Header */}
                      <div
                        onClick={() => setExpandedPartId(isExp ? null : part.id)}
                        className="flex justify-between items-center px-3 py-2.5 hover:bg-white/3 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">{part.name}</span>
                          <span className="text-[9px] text-neutral-500">
                            {part.width}x{part.height}x18мм | {part.quantity}ш | {part.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => removePartFromActive(part.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Устгах"
                          >
                            <Trash2 size={12} />
                          </button>
                          <span className="text-[10px] text-amber-500 font-bold leading-none select-none">
                            {isExp ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Sliders for offsets and dimensions */}
                      {isExp && (
                        <div className="px-3 pb-4 pt-2 border-t border-white/5 flex flex-col gap-4 bg-[#0c0d12]/60">
                          {/* X Offset */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] text-neutral-300">
                              <span>X байршил (Зүүн - Баруун)</span>
                              <span className="text-amber-500 font-mono font-bold">{part.xOffset ?? 0} мм</span>
                            </div>
                            <input
                              type="range"
                              min={-Math.round(selectedMod.config.width / 2)}
                              max={Math.round(selectedMod.config.width / 2)}
                              step={10}
                              value={part.xOffset ?? 0}
                              onChange={(e) => updateActiveParts(
                                selectedMod.parts.map(p => p.id === part.id ? { ...p, xOffset: parseInt(e.target.value) } : p)
                              )}
                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          {/* Y Offset */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] text-neutral-300">
                              <span>Y байршил (Дээш - Доош)</span>
                              <span className="text-amber-500 font-mono font-bold">{part.yOffset ?? 0} мм</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={selectedMod.config.height}
                              step={10}
                              value={part.yOffset ?? 0}
                              onChange={(e) => updateActiveParts(
                                selectedMod.parts.map(p => p.id === part.id ? { ...p, yOffset: parseInt(e.target.value) } : p)
                              )}
                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          {/* Z Offset */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] text-neutral-300">
                              <span>Z байршил (Урагш - Хойш)</span>
                              <span className="text-amber-500 font-mono font-bold">{part.zOffset ?? 0} мм</span>
                            </div>
                            <input
                              type="range"
                              min={-Math.round(selectedMod.config.depth / 2)}
                              max={Math.round(selectedMod.config.depth / 2)}
                              step={10}
                              value={part.zOffset ?? 0}
                              onChange={(e) => updateActiveParts(
                                selectedMod.parts.map(p => p.id === part.id ? { ...p, zOffset: parseInt(e.target.value) } : p)
                              )}
                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          {/* Height Slider */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] text-neutral-300">
                              <span>Бэлдэцийн хэмжээ 1 (Өндөр/Урт)</span>
                              <span className="text-amber-500 font-mono font-bold">{part.height} мм</span>
                            </div>
                            <input
                              type="range"
                              min={50}
                              max={2800}
                              step={10}
                              value={part.height}
                              onChange={(e) => updateActiveParts(
                                selectedMod.parts.map(p => p.id === part.id ? { ...p, height: parseInt(e.target.value) } : p)
                              )}
                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          {/* Width Slider */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[10px] text-neutral-300">
                              <span>Бэлдэцийн хэмжээ 2 (Өргөн/Гүн)</span>
                              <span className="text-amber-500 font-mono font-bold">{part.width} мм</span>
                            </div>
                            <input
                              type="range"
                              min={50}
                              max={2800}
                              step={10}
                              value={part.width}
                              onChange={(e) => updateActiveParts(
                                selectedMod.parts.map(p => p.id === part.id ? { ...p, width: parseInt(e.target.value) } : p)
                              )}
                              className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="flex items-center justify-between text-[10px] text-neutral-300 mt-1">
                            <span>Тоо ширхэг</span>
                            <div className="flex items-center gap-1 bg-[#0c0d12] border border-white/10 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => updateActiveParts(
                                  selectedMod.parts.map(p => p.id === part.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p)
                                )}
                                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-2 text-white font-bold">{part.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateActiveParts(
                                  selectedMod.parts.map(p => p.id === part.id ? { ...p, quantity: p.quantity + 1 } : p)
                                )}
                                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Live Material & Color Swappers */}
        <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="font-display font-bold text-white text-base">Материал ба Өнгө сонгох</h3>

          {/* Outer body material */}
          <div className="flex flex-col gap-3">
            <span className="text-xs text-neutral-400 font-semibold">Их биеийн материал:</span>
            <div className="grid grid-cols-2 gap-2">
              {materials.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => updateActiveConfig({ materialId: mat.id })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-medium transition-all text-left cursor-pointer ${
                    config.materialId === mat.id
                      ? 'border-amber-500 bg-amber-500/5 text-white'
                      : 'border-white/5 bg-[#0c0d12] text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: mat.color }} />
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
                      className="text-[8px] text-neutral-500 hover:text-red-400 transition-all cursor-pointer px-1.5 py-0.5 bg-neutral-800 rounded"
                      title="Өнгө арилгах (материалын өнгө ашиглах)"
                    >
                      ✕ Арилгах
                    </button>
                  )}
                  <div className="relative flex items-center gap-1.5 bg-[#0c0d12] border border-white/10 px-2 py-1 rounded-lg">
                    <span className="text-[9px] text-neutral-400 font-bold uppercase">Сонгох</span>
                    <input
                      type="color"
                      value={config.bodyColor || (materials.find(m => m.id === config.materialId)?.color || '#ffffff')}
                      onChange={(e) => updateActiveConfig({ bodyColor: e.target.value })}
                      className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer rounded outline-none"
                      title="Хүссэн өнгөө сонгох"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((color) => {
                  const isActive = config.bodyColor === color;
                  return (
                    <button
                      key={color}
                      onClick={() => updateActiveConfig({ bodyColor: color })}
                      className={`aspect-square rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                        isActive ? 'border-white ring-2 ring-amber-500 scale-105 shadow-lg' : 'border-transparent hover:border-white/30'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Door panels material */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-5">
            <span className="text-xs text-neutral-400 font-semibold">Хаалга / Нүүрний материал:</span>
            <div className="grid grid-cols-2 gap-2">
              {materials.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => updateActiveConfig({ doorMaterialId: mat.id })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-medium transition-all text-left cursor-pointer ${
                    config.doorMaterialId === mat.id
                      ? 'border-amber-500 bg-amber-500/5 text-white'
                      : 'border-white/5 bg-[#0c0d12] text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: mat.color }} />
                  <span className="truncate">{mat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Door Color Picker (Gradient Swatches & Custom Picker) */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-400 font-semibold">Хаалга / Нүүрний өнгө:</span>
              {/* Native color picker trigger */}
              <div className="relative flex items-center gap-1.5 bg-[#0c0d12] border border-white/10 px-2 py-1 rounded-lg">
                <span className="text-[9px] text-neutral-400 font-bold uppercase">Сонгох</span>
                <input
                  type="color"
                  value={config.color || '#ffffff'}
                  onChange={(e) => updateActiveConfig({ color: e.target.value })}
                  className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer rounded outline-none"
                  title="Хүссэн өнгөө сонгох"
                />
              </div>
            </div>
            
            {/* Gradient swatches grid */}
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PALETTE.map((color) => {
                const isActive = config.color === color;
                return (
                  <button
                    key={color}
                    onClick={() => updateActiveConfig({ color })}
                    className={`aspect-square rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                      isActive ? 'border-white ring-2 ring-amber-500 scale-105 shadow-lg' : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                );
              })}
            </div>
          </div>
        </div>
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
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                <Printer size={14} /> Хэвлэх / PDF хадгалах
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl cursor-pointer transition-all"
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
    </div>
  );
};
export default Editor;
