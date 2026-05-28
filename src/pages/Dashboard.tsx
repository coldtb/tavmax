import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Project } from '../data/mockData';
import { Plus, ScanLine, Settings, FileText, BarChart3, Database, Trash2, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scanFurnitureImage, type AiScanResult } from '../utils/aiImageScan';

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

  // Quick statistics
  const totalProjects = projects.length;
  const activeMaterialsCount = materials.length;
  const averageWaste = 18.5; // percent mock

  const handleOpenProject = (proj: Project) => {
    onSelectProject(proj);
    onNavigate('/editor');
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
    onNavigate('/editor');
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
    // Show preview
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
    if ((window as any).tavmaxLog) {
      (window as any).tavmaxLog(`Applying AI Result: ${JSON.stringify(aiResult)}`);
    }
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
    if ((window as any).tavmaxLog) {
      (window as any).tavmaxLog(`Project added and active set to: ${aiProj.id} (${aiProj.name})`);
    }
    // cleanup
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null);
    setShowAiModal(false);
    onNavigate('/editor');
  };

  const resetAiModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAiResult(null);
    setAiError(null);
    setAiScanning(false);
    setShowAiModal(false);
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/10 rounded-3xl p-8 backdrop-blur-md">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Сайн байна уу?</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Системд нийт <span className="text-amber-500 font-bold">{totalProjects}</span> тавилга загварын төсөл хадгалагдсан байна.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold transition-all border border-white/5 active:scale-[0.98] cursor-pointer"
          >
            <ScanLine size={16} />
            AI Зураг Уншуулах
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-sm font-bold shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} />
            Шинэ Загвар Үүсгэх
          </button>
        </div>
      </div>

      {/* SaaS Analytics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#12141c] border border-white/5 p-6 rounded-2xl flex flex-col gap-1.5">
          <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Нийт төсөл</div>
          <div className="text-3xl font-display font-extrabold text-white">{totalProjects}</div>
          <div className="text-[11px] text-neutral-500 mt-2">Хадгалсан нийт загвар</div>
        </div>

        <div className="bg-[#12141c] border border-white/5 p-6 rounded-2xl flex flex-col gap-1.5">
          <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Ашиглаж буй материал</div>
          <div className="text-3xl font-display font-extrabold text-amber-500">{activeMaterialsCount}</div>
          <div className="text-[11px] text-neutral-500 mt-2">Төрөл бүрийн материал</div>
        </div>

        <div className="bg-[#12141c] border border-white/5 p-6 rounded-2xl flex flex-col gap-1.5">
          <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Ашиглалтын харьцаа</div>
          <div className="text-3xl font-display font-extrabold text-emerald-400">{(100 - averageWaste).toFixed(1)}%</div>
          <div className="text-[11px] text-neutral-500 mt-2">Хавтангийн оновчлолын хувь</div>
        </div>

        <div className="bg-[#12141c] border border-white/5 p-6 rounded-2xl flex flex-col gap-1.5">
          <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Нийт хаягдал</div>
          <div className="text-3xl font-display font-extrabold text-red-400">{averageWaste}%</div>
          <div className="text-[11px] text-neutral-500 mt-2">Зүсэлтээс гарсан хаягдал</div>
        </div>
      </div>

      {/* Main Grid: Projects and Analytics graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display font-bold text-xl text-white">Сүүлийн төслүүд</h2>
            <button onClick={() => onNavigate('/editor')} className="text-amber-500 text-xs hover:underline flex items-center gap-1">
              Бүгдийг үзэх <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {projects.map((proj) => {
              const mat = materials.find((m) => m.id === proj.config.materialId) || materials[0];
              return (
                <div
                  key={proj.id}
                  className="bg-[#12141c] border border-white/5 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-display font-bold text-white group-hover:text-amber-500 transition-colors text-base">
                          {proj.name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">Шинэчлэсэн: {new Date(proj.updatedAt).toLocaleDateString('mn-MN')}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        proj.status === 'шинэ'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {proj.status === 'шинэ' ? 'Ноорог' : 'Бэлэн'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-xl p-3 mt-4 text-[11px] text-neutral-400">
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
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Засах
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analytics Breakdown & Materials stock status */}
        <div className="flex flex-col gap-6">
          <h2 className="font-display font-bold text-xl text-white">Материалын үлдэгдэл</h2>

          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-5">
            {materials.map((mat) => {
              const percent = Math.min(100, (mat.stock / 400) * 100);
              return (
                <div key={mat.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white truncate max-w-[160px]">{mat.name}</span>
                    <span className="text-neutral-400">{mat.stock} хавтан</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent < 25 ? 'bg-red-500' : percent < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick AI Generator Prompt templates */}
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/10 rounded-2xl p-6 flex flex-col gap-3">
            <h3 className="font-display font-bold text-white text-base">AI Заавар бэлдэцүүд</h3>
            <p className="text-neutral-400 text-xs">Эдгээр бэлэн текстийн дагуу AI-аар тавилгаа шууд үүсгэх боломжтой.</p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  handleCreateNew();
                }}
                className="w-full text-left px-3.5 py-2.5 bg-[#12141c] hover:bg-amber-500/10 text-neutral-300 hover:text-white rounded-xl text-xs border border-white/5 transition-all cursor-pointer truncate"
              >
                “3 метр хар модерн гал тогоо”
              </button>
              <button
                onClick={() => {
                  handleCreateNew();
                }}
                className="w-full text-left px-3.5 py-2.5 bg-[#12141c] hover:bg-amber-500/10 text-neutral-300 hover:text-white rounded-xl text-xs border border-white/5 transition-all cursor-pointer truncate"
              >
                “цагаан минимал шкаф”
              </button>
              <button
                onClick={() => {
                  handleCreateNew();
                }}
                className="w-full text-left px-3.5 py-2.5 bg-[#12141c] hover:bg-amber-500/10 text-neutral-300 hover:text-white rounded-xl text-xs border border-white/5 transition-all cursor-pointer truncate"
              >
                “лофт стиль номын тавиур”
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI IMAGE UPLOADER MODAL */}
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
