import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Project } from '../data/mockData';
import { Plus } from 'lucide-react';

interface DashboardProps {
  onSelectProject: (proj: Project) => void;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onNavigate }) => {
  const { projects, addProject } = useProjectStore();
  const [showVideoModal, setShowVideoModal] = useState(false);

  const totalProjects = projects.length;

  const handleOpenProject = (proj: Project) => {
    onSelectProject(proj);
    onNavigate('editor');
  };

  const handleCreateNew = () => {
    // Generate new blank project (custom/empty type)
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: 'Шинэ тавилга загвар',
      furnitureType: 'custom',
      config: {
        width: 1200,
        height: 850,
        depth: 600,
        shelves: 0,
        drawers: 0,
        doors: 0,
        hasLegs: false,
        handleType: 'none',
        materialId: 'mat-3',
        doorMaterialId: 'mat-3',
        color: '#faf9f6'
      },
      parts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'шинэ',
      customerName: 'Захиалагч',
      customerPhone: '99009900',
      price: 0
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

  // Filter templates versus user custom designs
  const templateProjects = projects.filter(
    (p) => p.id === 'proj-1' || p.id === 'proj-2' || p.id === 'proj-3' || p.id === 'proj-tv' || p.id === 'proj-island'
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
              onClick={() => setShowVideoModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-bold transition-all active:scale-[0.98] cursor-pointer border border-white/5"
            >
              📹 Видео заавар үзэх
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
            <span>Tavmax Design</span>
          </div>
        </div>
      </div>

      {/* Video Onboarding Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-[#12141c] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl glass-dark">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                📹 Систем ашиглах зааварчилгаа бичлэг
              </h3>
              <button 
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
              >
                ✕ Хаах
              </button>
            </div>
            
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5">
              <video 
                src="/tavmax_ad.mp4" 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="text-[11px] text-neutral-400 text-center leading-relaxed">
              Энэхүү богино зааварчилгааг үзээд 10 минутын туршилтын эрхээ ашиглан өөрийн тавилгыг зураарай.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
