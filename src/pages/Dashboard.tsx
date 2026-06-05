import React from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Project } from '../data/mockData';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

interface DashboardProps {
  onSelectProject: (proj: Project) => void;
  onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onNavigate }) => {
  const { projects, deleteProject, addProject, materials, addCustomTemplate } = useProjectStore();



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
        shelves: type === 'wardrobe' ? 2 : (type === 'kitchen_lower' ? 2 : 2),
        drawers: type === 'wardrobe' ? 0 : (type === 'kitchen_lower' ? 0 : 2),
        doors: type === 'wardrobe' ? 3 : (type === 'kitchen_lower' ? 3 : 2),
        partitions: (type === 'wardrobe' || type === 'kitchen_lower') ? 1 : undefined,
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







      {/* 6. USER'S RECENT PROJECTS */}
      {userProjects.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h2 className="font-display font-extrabold text-xl text-white">Миний сүүлийн загварууд</h2>
              <p className="text-neutral-500 text-xs">Таны өмнө нь ажиллаж байсан, хадгалсан хувийн төслүүд.</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Та бүх хувийн загвараа устгахдаа итгэлтэй байна уу?')) {
                  userProjects.forEach((proj) => deleteProject(proj.id));
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-neutral-950 text-red-400 text-xs font-bold transition-all border border-red-500/10 cursor-pointer"
              title="Бүх хувийн загварыг устгах"
            >
              <Trash2 size={14} />
              Бүгдийг устгах
            </button>
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


    </div>
  );
};
export default Dashboard;
