import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Project } from '../data/mockData';
import { Plus, ScanLine, Trash2, ArrowRight, Loader2, AlertCircle, CheckCircle2, Ruler, Palette, Eye, DollarSign, LayoutGrid, Sparkles } from 'lucide-react';
import { scanFurnitureImage, type AiScanResult } from '../utils/aiImageScan';

interface DashboardProps {
  onSelectProject: (proj: Project) => void;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onNavigate }) => {
  const { projects, addProject, materials, addCustomTemplate } = useProjectStore();

  const [showAiModal, setShowAiModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        shelves: type === 'wardrobe' ? 2 : (type === 'kitchen_lower' ? 2 : 0),
        drawers: type === 'wardrobe' ? 0 : (type === 'kitchen_lower' ? 0 : 0),
        doors: type === 'wardrobe' ? 3 : (type === 'kitchen_lower' ? 3 : 3),
        partitions: type === 'cabinet' ? 2 : ((type === 'wardrobe' || type === 'kitchen_lower') ? 1 : undefined),
        dividerPositions: type === 'cabinet' ? [600, 1200] : undefined,
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
    </div>
  );
};
export default Dashboard;
