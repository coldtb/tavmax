import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Project } from '../data/mockData';
import { Plus, ScanLine, Trash2, ArrowRight, Loader2, AlertCircle, CheckCircle2, Ruler, Palette, Eye, DollarSign, LayoutGrid, Sparkles, Compass, Flame, Info, Heart, ArrowUpRight } from 'lucide-react';
import { scanFurnitureImage, type AiScanResult } from '../utils/aiImageScan';

// Inspiration gallery data
const INSPIRATION_TEMPLATES = [
  {
    id: 'insp-1',
    name: 'Орчин үеийн гал тогоо',
    category: 'Гал тогоо',
    desc: 'Акрил гадаргуутай, орчин үеийн шийдэл бүхий гал тогоо.',
    img: '/templates/kitchen.png',
    type: 'kitchen_lower' as const,
    config: {
      width: 2700,
      height: 850,
      depth: 600,
      shelves: 4,
      drawers: 4,
      doors: 3,
      hasLegs: true,
      handleType: 'minimal' as const,
      materialId: 'mat-3',
      doorMaterialId: 'mat-4',
      color: '#1a1a1a',
      countertopType: 'stone' as const
    },
    price: 2450000
  },
  {
    id: 'insp-2',
    name: 'Минималист шкаф',
    category: 'Шкаф',
    desc: 'Цэвэрхэн шугамтай, далд бариултай минималист хувцасны шкаф.',
    img: '/templates/wardrobe.png',
    type: 'wardrobe' as const,
    config: {
      width: 1800,
      height: 2200,
      depth: 600,
      shelves: 6,
      drawers: 2,
      doors: 3,
      hasLegs: false,
      handleType: 'none' as const,
      materialId: 'mat-1',
      doorMaterialId: 'mat-3',
      color: '#faf9f6'
    },
    price: 1350000
  },
  {
    id: 'insp-3',
    name: 'Зочны өрөөний ТВ тавиур',
    category: 'ТВ тавиур',
    desc: 'Ухаалаг хадгалах хэсэг бүхий орчин үеийн зочны өрөөний ТВ тавиур.',
    img: '/templates/tv.png',
    type: 'cabinet' as const,
    config: {
      width: 2000,
      height: 450,
      depth: 450,
      shelves: 2,
      drawers: 3,
      doors: 0,
      hasLegs: true,
      handleType: 'minimal' as const,
      materialId: 'mat-2',
      doorMaterialId: 'mat-2',
      color: '#5c4033'
    },
    price: 950000
  },
  {
    id: 'insp-4',
    name: 'Унтлагын өрөөний шкаф',
    category: 'Шкаф',
    desc: 'Эвтэйхэн зохион байгуулалт бүхий унтлагын өрөөний хувцасны шкаф.',
    img: '/templates/wardrobe.png',
    type: 'wardrobe' as const,
    config: {
      width: 2100,
      height: 2400,
      depth: 600,
      shelves: 8,
      drawers: 4,
      doors: 4,
      hasLegs: false,
      handleType: 'modern' as const,
      materialId: 'mat-2',
      doorMaterialId: 'mat-2',
      color: '#5c4033'
    },
    price: 1680000
  },
  {
    id: 'insp-5',
    name: 'Номын тавиуртай ажлын ширээ',
    category: 'Ажлын ширээ',
    desc: 'Номын тавиур болон шургуулга хосолсон ажлын тав тухтай ширээ.',
    img: '/templates/bookshelf.png',
    type: 'bookshelf' as const,
    config: {
      width: 1200,
      height: 1600,
      depth: 400,
      shelves: 5,
      drawers: 2,
      doors: 2,
      hasLegs: false,
      handleType: 'minimal' as const,
      materialId: 'mat-5',
      doorMaterialId: 'mat-5',
      color: '#e6c280'
    },
    price: 820000
  },
  {
    id: 'insp-6',
    name: 'Үүдний өрөөний гутлын шкаф',
    category: 'Гутлын шкаф',
    desc: 'Үүдний өрөөнд зориулсан олон тавиуртай гутлын шүүгээ.',
    img: '/templates/kitchen_lower.png',
    type: 'kitchen_lower' as const,
    config: {
      width: 1000,
      height: 900,
      depth: 350,
      shelves: 5,
      drawers: 1,
      doors: 2,
      hasLegs: true,
      handleType: 'minimal' as const,
      materialId: 'mat-1',
      doorMaterialId: 'mat-1',
      color: '#d7c29e'
    },
    price: 680000
  }
];

const POPULAR_DESIGNS = [
  {
    id: 'pop-1',
    name: 'L хэлбэрийн гал тогоо',
    desc: 'Булангийн орон зайг оновчтой ашиглах орчин үеийн L-хэлбэртэй гал тогоо.',
    img: '/templates/kitchen.png',
    type: 'kitchen_lower' as const,
    config: {
      width: 2800,
      height: 850,
      depth: 600,
      shelves: 4,
      drawers: 4,
      doors: 4,
      hasLegs: true,
      handleType: 'minimal' as const,
      materialId: 'mat-1',
      doorMaterialId: 'mat-3',
      color: '#faf9f6'
    },
    price: 2100000
  },
  {
    id: 'pop-2',
    name: '2 хаалгатай шкаф',
    desc: 'Жижиг өрөөнд тохиромжтой, энгийн бөгөөд багтаамж ихтэй шүүгээ.',
    img: '/templates/wardrobe.png',
    type: 'wardrobe' as const,
    config: {
      width: 1200,
      height: 2000,
      depth: 600,
      shelves: 4,
      drawers: 2,
      doors: 2,
      hasLegs: false,
      handleType: 'modern' as const,
      materialId: 'mat-1',
      doorMaterialId: 'mat-1',
      color: '#d7c29e'
    },
    price: 980000
  },
  {
    id: 'pop-3',
    name: 'Гулсдаг хаалгатай шкаф',
    desc: 'Зай багатай өрөөнд тохирсон гулсдаг хаалганы системтэй шкаф.',
    img: '/templates/wardrobe.png',
    type: 'wardrobe' as const,
    config: {
      width: 1800,
      height: 2200,
      depth: 650,
      shelves: 6,
      drawers: 4,
      doors: 2,
      hasLegs: false,
      handleType: 'none' as const,
      materialId: 'mat-3',
      doorMaterialId: 'mat-4',
      color: '#1a1a1a'
    },
    price: 1480000
  },
  {
    id: 'pop-4',
    name: 'Орчин үеийн ТВ тавиур',
    desc: 'Өргөн дэлгэцтэй зурагтанд зориулсан загварлаг доод консол.',
    img: '/templates/tv.png',
    type: 'cabinet' as const,
    config: {
      width: 1800,
      height: 400,
      depth: 450,
      shelves: 2,
      drawers: 2,
      doors: 2,
      hasLegs: true,
      handleType: 'minimal' as const,
      materialId: 'mat-4',
      doorMaterialId: 'mat-4',
      color: '#1a1a1a'
    },
    price: 880000
  },
  {
    id: 'pop-5',
    name: 'Ажлын ширээ',
    desc: 'Номын тавиур болон хэрэгсэл хадгалах хэсэг хосолсон ажлын ширээ.',
    img: '/templates/bookshelf.png',
    type: 'bookshelf' as const,
    config: {
      width: 1400,
      height: 750,
      depth: 600,
      shelves: 3,
      drawers: 3,
      doors: 0,
      hasLegs: false,
      handleType: 'minimal' as const,
      materialId: 'mat-5',
      doorMaterialId: 'mat-5',
      color: '#e6c280'
    },
    price: 750000
  },
  {
    id: 'pop-6',
    name: 'Үүдний гутлын шкаф',
    desc: 'Олон хос гутал багтах авсаархан, цэвэрхэн загвартай шүүгээ.',
    img: '/templates/kitchen_lower.png',
    type: 'kitchen_lower' as const,
    config: {
      width: 900,
      height: 1000,
      depth: 350,
      shelves: 6,
      drawers: 1,
      doors: 2,
      hasLegs: true,
      handleType: 'minimal' as const,
      materialId: 'mat-1',
      doorMaterialId: 'mat-1',
      color: '#d7c29e'
    },
    price: 620000
  }
];

const BEFORE_AFTER_EXAMPLES = [
  {
    id: 'ba-1',
    title: 'Гал тогооны төсөл',
    desc: 'Хэрэглэгч өөрийн гараар зурсан харандаан нооргийг оруулан, 2.7м гал тогоо болгон хувиргасан.',
    beforeTitle: 'Харандаан ноорог (Скэч)',
    afterTitle: 'TavMax 3D дизайн + Үнэ бодолт',
    img: '/templates/kitchen_lower.png',
    badges: ['AI зураг таньсан', '3D загвар үүсгэсэн', 'Үнэ тооцсон'],
    stats: {
      width: '2700 мм',
      price: '1,890,000 ₮',
      time: '2 минутанд'
    }
  },
  {
    id: 'ba-2',
    title: 'Минималист хувцасны шкаф',
    desc: 'Унтлагын өрөөний хоосон ханын хэмжээсээр олон тасалгаатай шкафыг зохиосон жишээ.',
    beforeTitle: 'Хоосон хананы хэмжээ',
    afterTitle: 'TavMax 3D Шүүгээ систем',
    img: '/templates/wardrobe.png',
    badges: ['3D загвар үүсгэсэн', 'Материал сольсон', 'Үнэ тооцсон'],
    stats: {
      width: '1800 мм',
      price: '1,350,000 ₮',
      time: '3 минутанд'
    }
  },
  {
    id: 'ba-3',
    title: 'Зочны өрөөний ТВ тавиур',
    desc: 'Зочны өрөөний хэсгийг тохилог, загварлаг харагдуулах ТВ-ийн тавиурыг бүтээсэн нь.',
    beforeTitle: 'Pinterest загварын санаа',
    afterTitle: 'TavMax 3D Консол шүүгээ',
    img: '/templates/tv.png',
    badges: ['AI зураг таньсан', '3D загвар үүсгэсэн', 'Үнэ тооцсон'],
    stats: {
      width: '1800 мм',
      price: '880,000 ₮',
      time: '1 минутанд'
    }
  }
];

interface DashboardProps {
  onSelectProject: (proj: Project) => void;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onNavigate }) => {
  const { projects, deleteProject, addProject, materials, addCustomTemplate } = useProjectStore();

  const [showAiModal, setShowAiModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedInspiration, setSelectedInspiration] = useState<typeof INSPIRATION_TEMPLATES[number] | null>(null);

  const handleLoadTemplateConfig = (name: string, type: Project['furnitureType'], config: any, price: number) => {
    const newProj: Project = {
      id: `proj-insp-${Date.now()}`,
      name: `${name} (Хувилбар)`,
      furnitureType: type,
      config: {
        ...config,
        handleType: config.handleType || 'minimal',
        materialId: config.materialId || 'mat-3',
        doorMaterialId: config.doorMaterialId || 'mat-3',
        color: config.color || '#faf9f6'
      },
      parts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'шинэ',
      customerName: 'Захиалагч',
      customerPhone: '',
      price: price
    };
    addProject(newProj);
    onSelectProject(newProj);
    onNavigate('editor');
  };

  const totalProjects = projects.length;

  const handleOpenProject = (proj: Project) => {
    onSelectProject(proj);
    onNavigate('editor');
  };

  const handleCreateNew = () => {
    // Generate new blank project
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: 'Шинэ тавилга загвар',
      furnitureType: 'wardrobe',
      config: {
        width: 1500,
        height: 2000,
        depth: 550,
        shelves: 4,
        drawers: 2,
        doors: 2,
        hasLegs: false,
        handleType: 'minimal',
        materialId: 'mat-1',
        doorMaterialId: 'mat-3',
        color: '#d7c29e'
      },
      parts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'шинэ',
      customerName: 'Захиалагч',
      customerPhone: '99009900',
      price: 980000
    };
    addProject(newProj);
    onSelectProject(newProj);
    onNavigate('editor');
  };

  const handleCreateQuick = (type: 'kitchen_lower' | 'wardrobe' | 'cabinet') => {
    const typeNames = {
      kitchen_lower: 'Шинэ гал тогоо',
      wardrobe: 'Шинэ хувцасны шкаф',
      cabinet: 'Шинэ ТВ тавиур'
    };
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: typeNames[type],
      furnitureType: type,
      config: {
        width: type === 'wardrobe' ? 1800 : (type === 'kitchen_lower' ? 2400 : 1800),
        height: type === 'wardrobe' ? 2200 : (type === 'kitchen_lower' ? 850 : 450),
        depth: type === 'wardrobe' ? 600 : (type === 'kitchen_lower' ? 600 : 450),
        shelves: type === 'wardrobe' ? 6 : (type === 'kitchen_lower' ? 3 : 2),
        drawers: type === 'wardrobe' ? 4 : (type === 'kitchen_lower' ? 6 : 2),
        doors: type === 'wardrobe' ? 3 : (type === 'kitchen_lower' ? 2 : 2),
        hasLegs: type !== 'wardrobe',
        handleType: 'minimal',
        materialId: 'mat-1',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      },
      parts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'шинэ',
      customerName: 'Захиалагч',
      customerPhone: '99009900',
      price: type === 'wardrobe' ? 1250000 : (type === 'kitchen_lower' ? 1890000 : 1150000)
    };
    addProject(newProj);
    onSelectProject(newProj);
    onNavigate('editor');
  };

  const handleLoadTemplate = (templateProj: Project) => {
    const clonedProj: Project = {
      ...templateProj,
      id: `proj-${Date.now()}`,
      name: `${templateProj.name} (Миний загвар)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addProject(clonedProj);
    onSelectProject(clonedProj);
    onNavigate('editor');
  };

  // Drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAiError('Зөвхөн PNG, JPG зураг оруулна уу.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAiError('Зургийн хэмжээ 10MB-аас бага байх ёстой.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAiError(null);
    setAiResult(null);
    setAiScanning(true);

    try {
      const result = await scanFurnitureImage(file);
      setAiResult(result);
      setAiScanning(false);
    } catch (err: unknown) {
      setAiScanning(false);
      setAiError(err instanceof Error ? err.message : 'AI шинжилгээ амжилтгүй болов.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSaveAsTemplate = () => {
    if (!aiResult) return;
    addCustomTemplate(
      aiResult.name,
      aiResult.type as any,
      {
        width: aiResult.width,
        height: aiResult.height,
        depth: aiResult.depth,
        shelves: aiResult.shelves,
        drawers: aiResult.drawers,
        doors: aiResult.doors,
        hasLegs: aiResult.hasLegs,
        handleType: 'minimal',
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: aiResult.color,
        countertopType: 'none',
      }
    );
    alert('Бэлэн загварт амжилттай хадгалагдлаа!');
    resetAiModal();
  };

  const handleApplyAiResult = () => {
    if (!aiResult) return;
    const aiProj: Project = {
      id: `proj-ai-${Date.now()}`,
      name: aiResult.name,
      furnitureType: aiResult.type as Project['furnitureType'],
      config: {
        width: aiResult.width,
        height: aiResult.height,
        depth: aiResult.depth,
        shelves: aiResult.shelves,
        drawers: aiResult.drawers,
        doors: aiResult.doors,
        hasLegs: aiResult.hasLegs,
        handleType: 'minimal',
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: aiResult.color,
        countertopType: 'none',
      },
      parts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'шинэ',
      customerName: 'AI Захиалагч',
      customerPhone: '',
      price: 0,
    };
    addProject(aiProj);
    onSelectProject(aiProj);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null);
    setShowAiModal(false);
    onNavigate('editor');
  };

  const resetAiModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null);
    setAiScanning(false);
    setShowAiModal(false);
  };

  // Filter templates versus user custom designs
  const templateProjects = projects.filter(
    (p) => p.id === 'proj-1' || p.id === 'proj-2' || p.id === 'proj-3' || p.id === 'proj-tv'
  );

  const userProjects = projects.filter(
    (p) => p.id !== 'proj-empty' && 
           p.id !== 'proj-1' && 
           p.id !== 'proj-2' && 
           p.id !== 'proj-3' && 
           p.id !== 'proj-tv'
  );

  return (
    <div className="flex flex-col gap-10 pb-16 max-w-6xl mx-auto animate-fade-in text-neutral-200">
      
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#1c1d24]/80 via-[#12141c]/90 to-[#0c0d12]/95 p-8 md:p-12 shadow-2xl glass flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 flex flex-col items-start gap-4 text-left z-10">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
            🛋️ Өөрийн орон зайгаа тохижуул
          </span>
          <h1 className="font-display font-black text-3xl md:text-4xl text-white leading-tight">
            Өөрийн хүссэн тавилгаа бүтээ
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-lg leading-relaxed">
            Хэмжээгээ оруулж, загвараа сонгон, 3D дүрслэлээ шууд хараарай. Хэдхэн минутын дотор өөрийн санааг бодит болгож, үнийг нь мэдэх боломжтой.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus size={18} />
              Шинэ дизайн эхлүүлэх
            </button>
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold transition-all border border-white/5 active:scale-[0.98] cursor-pointer"
            >
              <ScanLine size={16} className="text-amber-500" />
              AI-аар зургаас таних
            </button>
          </div>
        </div>
        
        {/* Decorative simulated visualizer pane */}
        <div className="w-full md:w-[320px] lg:w-[360px] aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-tr from-amber-500/10 to-transparent p-4 flex flex-col justify-between relative overflow-hidden group shrink-0 shadow-lg">
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">3D Real-time Visualizer</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          
          <div className="my-auto flex flex-col items-center justify-center gap-2 z-10 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xl font-bold animate-bounce-slow">
              📐
            </div>
            <span className="text-xs text-white font-black">IKEA загварын хялбар төлөвлөгч</span>
            <span className="text-[10px] text-neutral-400 max-w-[200px]">Материал, хэмжээ, загварыг нэг дор өөрчилж харна</span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-neutral-500">
            <span>Энгийн & Хурдан</span>
            <span>Tavmax AI</span>
          </div>
        </div>
      </div>

      {/* 2. QUICK START SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-extrabold text-xl text-white">Юу хиймээр байна?</h2>
          <p className="text-neutral-500 text-xs">Доорх төрлүүдээс сонгон хурдан хугацаанд эхлүүлээрэй.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              type: 'kitchen_lower' as const,
              title: 'Гал тогоо зохиох',
              desc: 'Гал тогооны доод болон дээд шүүгээнүүдийг хүссэн хэмжээгээрээ зохиох',
              img: '/templates/kitchen.png',
              tag: 'Kitchen Cabinet'
            },
            {
              type: 'wardrobe' as const,
              title: 'Хувцасны шкаф хийх',
              desc: 'Шүүгээ тасалгаа болон шургуулгыг өөрийн хэрэглээндээ тааруулан өөрчлөх',
              img: '/templates/wardrobe.png',
              tag: 'Wardrobe System'
            },
            {
              type: 'cabinet' as const,
              title: 'ТВ тавиур хийх',
              desc: 'Зочны өрөөний хэсгийг тохилог, загварлаг харагдуулах ТВ-ийн тавиур шүүгээ',
              img: '/templates/tv.png',
              tag: 'TV Unit Console'
            }
          ].map((item) => (
            <div
              key={item.type}
              onClick={() => handleCreateQuick(item.type)}
              className="bg-[#12141c] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 group flex flex-col justify-between cursor-pointer"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900 border-b border-white/5 flex items-center justify-center">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/templates/empty.png';
                  }}
                />
                <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] text-amber-400 font-bold uppercase tracking-wider border border-white/5">
                  {item.tag}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-2">
                <h3 className="font-display font-bold text-white group-hover:text-amber-500 transition-colors text-sm md:text-base">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {item.desc}
                </p>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mt-2 hover:text-amber-400 transition-colors">
                  Эхлүүлэх <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AI IMAGE IDENTIFIER ASSISTANT (Featured Highlight Banner) */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/15 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex-1 flex flex-col items-start gap-2.5 text-left z-10">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Sparkles size={14} />
            <span>ШИНЭ БОЛОМЖ</span>
          </div>
          <h3 className="font-display font-black text-xl text-white">
            Тавилгын зураг оруулаад AI-аар таних
          </h3>
          <p className="text-neutral-400 text-xs md:text-sm max-w-xl leading-relaxed">
            Pinterest-ээс олсон гоё тавилгын зураг эсвэл өөрийн гараар зурсан нооргоо оруулаарай. Манай хиймэл оюун ухаан зургийг шинжилж, хэмжээ болон тавиур, хаалганы бүтцийг автоматаар тодорхойлж 3D загвар болгож өгнө.
          </p>
        </div>

        <button
          onClick={() => setShowAiModal(true)}
          className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-black shadow-lg shadow-amber-500/10 transition-all shrink-0 active:scale-[0.98] cursor-pointer flex items-center gap-2 z-10 font-bold"
        >
          <ScanLine size={16} />
          Зураг уншуулж үзэх
        </button>
      </div>

      {/* 4. HOW IT WORKS / ONBOARDING GUIDE (Shown when no custom projects exist) */}
      {userProjects.length === 0 && (
        <div className="bg-[#12141c] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
            <h3 className="font-display font-extrabold text-base text-white flex items-center gap-2">
              ✨ Тавилгаа хэрхэн зохиох вэ?
            </h3>
            <p className="text-neutral-500 text-xs">Бид танд 5 алхамд хэрхэн хялбархан тавилгатай болохыг тайлбарлаж өгье.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              { step: '1', title: 'Загвар сонго', desc: 'Дээрх хурдан эхлүүлэх хэсгээс эсвэл бэлэн загваруудаас сонгоно.', icon: <LayoutGrid className="text-amber-400" size={18} /> },
              { step: '2', title: 'Хэмжээ оруул', desc: 'Шүүгээгээ сонгож, өрөөнийхөө зайд тааруулан хэмжээгээ тохируулна.', icon: <Ruler className="text-amber-400" size={18} /> },
              { step: '3', title: 'Материал сонго', desc: 'Их бие болон хаалганы өнгө, модон эсвэл акрил материалаа өөрчилнө.', icon: <Palette className="text-amber-400" size={18} /> },
              { step: '4', title: '3D харах', desc: 'Биет загвараа 3D орон зайд бүх талаас нь эргүүлж, нээж, шалгаж үзнэ.', icon: <Eye className="text-amber-400" size={18} /> },
              { step: '5', title: 'Үнэ тооцох', desc: 'Сонгосон материалуудаар бодогдсон бодит үйлдвэрийн үнийг шууд харна.', icon: <DollarSign className="text-amber-400" size={18} /> }
            ].map((item, idx) => (
              <div key={item.step} className="bg-neutral-900/50 border border-white/[0.02] p-4 rounded-2xl flex flex-col items-center sm:items-start gap-3 text-center sm:text-left relative">
                {idx < 4 && (
                  <div className="hidden sm:block absolute top-7 -right-3 w-6 h-[1px] bg-neutral-800 z-10" />
                )}
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-black text-white flex items-center justify-center sm:justify-start gap-1">
                    <span className="text-[10px] text-amber-500 font-black">0{item.step}.</span>
                    {item.title}
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ХҮМҮҮСИЙН ХАМГИЙН ИХ СОНГОДОГ ЗАГВАРУУД */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Flame size={18} />
            <h2 className="font-display font-extrabold text-xl text-white">Хүмүүсийн хамгийн их сонгодог загварууд</h2>
          </div>
          <p className="text-neutral-500 text-xs">Хамгийн өндөр борлуулалттай, хэрэглэгчид өөрсдөө хамгийн их сонгосон бэлэн загварууд.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POPULAR_DESIGNS.map((item) => (
            <div
              key={item.id}
              className="bg-[#12141c] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 group flex flex-col justify-between"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900 border-b border-white/5 flex items-center justify-center">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/templates/empty.png';
                  }}
                />
                <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] text-amber-400 font-bold uppercase tracking-wider border border-white/5">
                  Топ загвар
                </span>
              </div>
              
              <div className="p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="font-display font-bold text-white group-hover:text-amber-500 transition-colors text-sm md:text-base">
                    {item.name}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed min-h-[32px]">
                    {item.desc}
                  </p>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-white/5 mt-2">
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase block">Үйлдвэрлэх үнэ</span>
                    <span className="text-xs font-bold text-white">{item.price.toLocaleString('mn-MN')} ₮</span>
                  </div>
                  
                  <button
                    onClick={() => handleLoadTemplateConfig(item.name, item.type, item.config, item.price)}
                    className="px-3.5 py-2 bg-[#1c1d24] hover:bg-amber-500 hover:text-neutral-950 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-white/5"
                  >
                    Энэ загварыг ашиглах
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. ӨМНӨ БА ДАРАА ЖИШЭЭ */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Compass size={18} />
            <h2 className="font-display font-extrabold text-xl text-white">Өмнө ба Дараа жишээ</h2>
          </div>
          <p className="text-neutral-500 text-xs">Таны зурсан зураг болон санааг TavMax хэрхэн бодит 3D загвар, тооцоолол болгон хувиргадгийг хараарай.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {BEFORE_AFTER_EXAMPLES.map((item) => (
            <div
              key={item.id}
              className="bg-[#12141c] border border-white/5 hover:border-amber-500/20 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
            >
              {/* Dual pane split screen */}
              <div className="relative aspect-[21/10] w-full border-b border-white/5 bg-neutral-950 flex overflow-hidden">
                {/* Left side: BEFORE (wireframe / CAD blueprint mockup) */}
                <div className="w-1/2 h-full bg-[#161821] border-r border-dashed border-white/10 p-3 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                  <div className="flex justify-between items-center text-[7px] font-mono text-neutral-500">
                    <span>DRAFT_v{item.id.replace('ba-', '')}.dxf</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse" />
                  </div>
                  
                  {/* Schematic box drawing */}
                  <div className="my-auto flex flex-col gap-1.5 p-1 border border-white/10 rounded bg-neutral-900/40 relative">
                    <div className="flex justify-between text-[6px] font-mono text-neutral-500 border-b border-white/10 pb-0.5">
                      <span>{item.title}</span>
                      <span>{item.stats.width}</span>
                    </div>
                    {/* Simulated cabinet slots */}
                    <div className="grid grid-cols-3 gap-1 h-9">
                      <div className="border border-dashed border-white/20 rounded flex flex-col justify-between p-0.5">
                        <div className="h-0.5 bg-white/20 w-3/4 mx-auto" />
                        <div className="h-0.5 bg-white/20 w-3/4 mx-auto" />
                      </div>
                      <div className="border border-dashed border-white/20 rounded flex flex-col justify-between p-0.5">
                        <div className="h-0.5 bg-white/20 w-3/4 mx-auto" />
                      </div>
                      <div className="border border-dashed border-white/20 rounded flex flex-col justify-between p-0.5">
                        <div className="h-0.5 bg-white/20 w-3/4 mx-auto" />
                        <div className="h-0.5 bg-white/20 w-3/4 mx-auto" />
                      </div>
                    </div>
                  </div>

                  <span className="self-start px-1 rounded bg-neutral-800 text-[7px] font-bold text-neutral-400">
                    ӨМНӨ / САНАА
                  </span>
                </div>

                {/* Right side: AFTER (3D Render) */}
                <div className="w-1/2 h-full relative overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = '/templates/empty.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 right-2 px-1 rounded bg-amber-500 text-neutral-950 text-[7px] font-bold">
                    ДАРАА / 3D
                  </span>
                </div>
              </div>

              {/* Description and badges */}
              <div className="p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h4 className="font-display font-bold text-white text-sm">
                    {item.title}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed min-h-[32px]">
                    {item.desc}
                  </p>
                </div>

                {/* Badges list */}
                <div className="flex flex-wrap gap-1 mt-1 border-t border-white/5 pt-3">
                  {item.badges.map((badge) => (
                    <span key={badge} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[9px] font-bold">
                      ✓ {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. INSPIRATION GALLERY */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Palette size={18} />
            <h2 className="font-display font-extrabold text-xl text-white">Санаа авах загварууд</h2>
          </div>
          <p className="text-neutral-500 text-xs">Өрөө тус бүрийн загваруудаас санаа авч, өөрийн хэрэгцээндээ нийцүүлэн засварлан ашиглаарай.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {INSPIRATION_TEMPLATES.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedInspiration(item)}
              className="bg-[#12141c] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 group flex flex-col justify-between cursor-pointer"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900 border-b border-white/5 flex items-center justify-center">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/templates/empty.png';
                  }}
                />
                <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] text-amber-400 font-bold uppercase tracking-wider border border-white/5">
                  {item.category}
                </span>
              </div>
              
              <div className="p-5 flex flex-col gap-2">
                <h3 className="font-display font-bold text-white group-hover:text-amber-500 transition-colors text-sm md:text-base">
                  {item.name}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed min-h-[32px]">
                  {item.desc}
                </p>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mt-2 hover:text-amber-400 transition-colors">
                  Загварыг харах <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. READY TEMPLATES GALLERY */}
      {templateProjects.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display font-extrabold text-xl text-white">Бэлэн загварууд</h2>
            <p className="text-neutral-500 text-xs">Мэргэжлийн дизайнеруудын бэлдсэн загваруудыг шууд ашиглан өөрчлөөрэй.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templateProjects.map((proj) => {
              const mat = materials.find((m) => m.id === proj.config.materialId) || materials[0];
              const getTemplateImage = (type: string) => {
                if (type === 'wardrobe') return '/templates/wardrobe.png';
                if (type === 'kitchen_lower') return '/templates/kitchen_lower.png';
                if (type === 'bookshelf') return '/templates/bookshelf.png';
                if (type === 'cabinet') return '/templates/tv.png';
                return '/templates/empty.png';
              };
              return (
                <div
                  key={proj.id}
                  onClick={() => handleLoadTemplate(proj)}
                  className="bg-[#12141c] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900 border-b border-white/5 flex items-center justify-center">
                    <img
                      src={getTemplateImage(proj.furnitureType)}
                      alt={proj.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = '/templates/empty.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-0.5">
                        {proj.furnitureType === 'wardrobe' ? 'Шкаф' : proj.furnitureType === 'kitchen_lower' ? 'Гал тогоо' : proj.furnitureType === 'bookshelf' ? 'Номын тавиур' : 'ТВ тавиур'}
                      </span>
                      <h4 className="font-display font-bold text-white text-sm group-hover:text-amber-500 transition-colors truncate">
                        {proj.name}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-[10px] text-neutral-400">
                      <span>{proj.config.width} × {proj.config.height} × {proj.config.depth} мм</span>
                      <span className="font-bold text-amber-500">{proj.price.toLocaleString('mn-MN')} ₮</span>
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: mat.color }} />
                      <span>{mat.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. USER'S RECENT PROJECTS */}
      {userProjects.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display font-extrabold text-xl text-white">Миний сүүлийн загварууд</h2>
            <p className="text-neutral-500 text-xs">Таны өмнө нь ажиллаж байсан, хадгалсан хувийн төслүүд.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {userProjects.map((proj) => {
              const mat = materials.find((m) => m.id === proj.config.materialId) || materials[0];
              const getProjectImage = (type: string) => {
                if (type === 'wardrobe') return '/templates/wardrobe.png';
                if (type === 'kitchen_lower') return '/templates/kitchen_lower.png';
                if (type === 'bookshelf') return '/templates/bookshelf.png';
                if (type === 'cabinet') return '/templates/tv.png';
                return '/templates/empty.png';
              };
              return (
                <div
                  key={proj.id}
                  className="bg-[#12141c] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-white/5 overflow-hidden shrink-0">
                          <img
                            src={getProjectImage(proj.furnitureType)}
                            alt={proj.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/templates/empty.png';
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-white group-hover:text-amber-500 transition-colors text-base">
                            {proj.name}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1">
                            Шинэчлэсэн: {new Date(proj.updatedAt).toLocaleDateString('mn-MN')}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0">
                        Миний загвар
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-xl p-3 mt-5 text-[11px] text-neutral-400">
                      <div>
                        <span className="block text-[9px] text-neutral-500 uppercase">Өргөн</span>
                        <span className="font-semibold text-white">{proj.config.width} мм</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-neutral-500 uppercase">Өндөр</span>
                        <span className="font-semibold text-white">{proj.config.height} мм</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-neutral-500 uppercase">Гүн</span>
                        <span className="font-semibold text-white">{proj.config.depth} мм</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: mat.color }} />
                      <span className="text-xs text-neutral-400">{mat.name} ({mat.thickness}мм)</span>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-neutral-900/40 border-t border-white/5 flex justify-between items-center gap-4">
                    <span className="text-sm font-bold text-amber-500">{proj.price.toLocaleString('mn-MN')} ₮</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteProject(proj.id)}
                        className="p-2 rounded-lg bg-neutral-800/50 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Устгах"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenProject(proj)}
                        className="px-4 py-2 bg-[#1c1d24] hover:bg-amber-500 hover:text-neutral-950 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-white/5"
                      >
                        Үргэлжлүүлэн засах
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. AI IMAGE UPLOADER MODAL (Kept exact same functionality) */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#12141c] border border-white/10 rounded-3xl p-8 flex flex-col gap-6 relative shadow-2xl glass-dark">
            <div className="text-center">
              <h3 className="font-display font-bold text-xl text-white">AI Зураг Танигч</h3>
              <p className="text-neutral-400 text-xs mt-1">
                Pinterest скриншот, тавилгын фото зураг, эсвэл зурмал ноорог оруулахад AI хэмжээ болон бүтцийг автоматаар уншина.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Drop zone or preview */}
            {!previewUrl ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full min-h-[200px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-white/10 hover:border-amber-500/40 bg-white/5'
                }`}
              >
                <ScanLine size={40} className="text-neutral-500 mb-3" />
                <div className="text-sm font-semibold text-neutral-300">Зургийг чирч оруулах эсвэл товших</div>
                <div className="text-[10px] text-neutral-500 mt-1">PNG, JPG форматын зураг (Max: 10MB)</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Image preview */}
                <div className="w-full h-44 rounded-xl overflow-hidden border border-white/10 relative">
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                  {aiScanning && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <Loader2 size={28} className="text-amber-400 animate-spin" />
                      <span className="text-xs text-amber-300 font-semibold">AI шинжилж байна...</span>
                    </div>
                  )}
                </div>

                {/* Error */}
                {aiError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-red-300">{aiError}</span>
                  </div>
                )}

                {/* AI Result */}
                {aiResult && !aiScanning && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={14} className="text-amber-400" />
                      <span className="text-xs font-bold text-amber-400">AI танилт амжиллтай!</span>
                    </div>
                    <div className="text-sm font-bold text-white">{aiResult.name}</div>
                    <div className="text-[10px] text-neutral-400">{aiResult.description}</div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        ['Өргөн', aiResult.width + ' мм'],
                        ['Өндөр', aiResult.height + ' мм'],
                        ['Гүн', aiResult.depth + ' мм'],
                        ['Хаалга', aiResult.doors + ' ш'],
                        ['Шургуулга', aiResult.drawers + ' ш'],
                        ['Тавиур', aiResult.shelves + ' ш'],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                          <div className="text-[8px] text-neutral-500 uppercase">{label}</div>
                          <div className="text-xs font-bold text-white mt-0.5">{val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: aiResult.color }} />
                      <span className="text-[10px] text-neutral-400">Өнгө: {aiResult.color}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={resetAiModal}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Хаах
              </button>
              {aiResult && !aiScanning && (
                <>
                  <button
                    onClick={handleSaveAsTemplate}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-amber-500 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Загварт хадгалах
                  </button>
                  <button
                    onClick={handleApplyAiResult}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={13} /> Загвар үүсгэх
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. INSPIRATION PREVIEW MODAL */}
      {selectedInspiration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#12141c] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative shadow-2xl overflow-y-auto max-h-[90vh] glass-dark">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                  {selectedInspiration.category}
                </span>
                <h3 className="font-display font-bold text-2xl text-white mt-1">{selectedInspiration.name}</h3>
              </div>
              <button
                onClick={() => setSelectedInspiration(null)}
                className="text-neutral-400 hover:text-white transition-colors text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Render Preview Image */}
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-neutral-950 flex items-center justify-center relative group">
                <img
                  src={selectedInspiration.img}
                  alt={selectedInspiration.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>

              {/* Spec table */}
              <div className="flex flex-col gap-4">
                <p className="text-neutral-300 text-xs md:text-sm leading-relaxed">
                  {selectedInspiration.desc}
                </p>

                <div className="bg-neutral-900/60 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Тавилгын мэдээлэл</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex justify-between text-neutral-450 gap-2">
                      <span className="text-neutral-500">Өргөн:</span>
                      <span className="font-semibold text-white">{selectedInspiration.config.width} мм</span>
                    </div>
                    <div className="flex justify-between text-neutral-450 gap-2">
                      <span className="text-neutral-500">Өндөр:</span>
                      <span className="font-semibold text-white">{selectedInspiration.config.height} мм</span>
                    </div>
                    <div className="flex justify-between text-neutral-450 gap-2">
                      <span className="text-neutral-500">Гүн:</span>
                      <span className="font-semibold text-white">{selectedInspiration.config.depth} мм</span>
                    </div>
                    <div className="flex justify-between text-neutral-450 gap-2">
                      <span className="text-neutral-500">Тавиур:</span>
                      <span className="font-semibold text-white">{selectedInspiration.config.shelves} ш</span>
                    </div>
                    <div className="flex justify-between text-neutral-450 gap-2">
                      <span className="text-neutral-500">Шургуулга:</span>
                      <span className="font-semibold text-white">{selectedInspiration.config.drawers} ш</span>
                    </div>
                    <div className="flex justify-between text-neutral-450 gap-2">
                      <span className="text-neutral-500">Хаалга:</span>
                      <span className="font-semibold text-white">{selectedInspiration.config.doors} ш</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <div>
                    <span className="text-[9px] text-neutral-500 uppercase block">Төлөвлөсөн үнэ</span>
                    <span className="text-lg font-black text-amber-500">{selectedInspiration.price.toLocaleString('mn-MN')} ₮</span>
                  </div>
                  <button
                    onClick={() => {
                      handleLoadTemplateConfig(
                        selectedInspiration.name,
                        selectedInspiration.type,
                        selectedInspiration.config,
                        selectedInspiration.price
                      );
                      setSelectedInspiration(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-black shadow-lg shadow-amber-500/15 hover:shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Эхлэх
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
