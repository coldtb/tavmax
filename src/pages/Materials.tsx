import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Material } from '../data/mockData';
import { Search, Plus, Trash2, X, Layers } from 'lucide-react';

export const Materials: React.FC = () => {
  const { materials, updateMaterialPrice } = useProjectStore();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMat, setNewMat] = useState<Omit<Material, 'id'>>({
    name: '',
    code: '',
    category: 'MDF',
    thickness: 18,
    price: 0,
    stock: 0,
    supplier: '',
    color: '#cccccc',
  });

  const categories = ['all', 'Egger', 'Kronospan', 'MDF', 'HDF', 'Plywood', 'Acrylic'];

  const filteredMaterials = materials.filter((mat) => {
    const matchesSearch =
      mat.name.toLowerCase().includes(search.toLowerCase()) ||
      mat.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || mat.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMat.name.trim() || !newMat.code.trim()) return;
    materials.push({
      id: `mat-${Date.now()}`,
      ...newMat,
    });
    setShowAddModal(false);
    setNewMat({ name: '', code: '', category: 'MDF', thickness: 18, price: 0, stock: 0, supplier: '', color: '#cccccc' });
  };

  const handleDeleteMaterial = (id: string) => {
    const idx = materials.findIndex((m) => m.id === id);
    if (idx !== -1) materials.splice(idx, 1);
    // force a re-render by setting state
    setSearch((s) => s);
  };

  // Category color badges
  const catColor: Record<string, string> = {
    Egger: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Kronospan: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    MDF: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/20',
    HDF: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    Plywood: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    Acrylic: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className="flex flex-col gap-7 pb-12">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Материалын Сан</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Хавтан материалуудын лавлагаа — нэмэх болон устгах боломжтой
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <Plus size={15} />
          Материал Нэмэх
        </button>
      </div>

      {/* ── Search + Filters ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#12141c] border border-white/5 p-4 rounded-xl items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
          <input
            type="text"
            placeholder="Нэр эсвэл кодоор хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0c0d12] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {cat === 'all' ? 'Бүгд' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Material Cards Grid ───────────────────────────── */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers size={40} className="text-neutral-700 mb-4" />
          <p className="text-neutral-500 text-sm font-semibold">Материал олдсонгүй</p>
          <p className="text-neutral-700 text-xs mt-1">Хайлтаа өөрчлөх эсвэл шинэ материал нэмнэ үү</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="group bg-[#12141c] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-xl hover:shadow-black/30 relative"
            >
              {/* Delete button — shows on hover */}
              <button
                onClick={() => handleDeleteMaterial(mat.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-500 transition-all cursor-pointer"
                title="Устгах"
                type="button"
              >
                <Trash2 size={12} />
              </button>

              {/* Color swatch + Name */}
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl border border-white/10 shrink-0 shadow-inner"
                  style={{ backgroundColor: mat.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-white text-sm leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors">
                    {mat.name}
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">{mat.code}</span>
                </div>
              </div>

              {/* Specs row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${catColor[mat.category] || 'bg-neutral-800 text-neutral-400 border-white/5'}`}>
                    {mat.category}
                  </span>
                </div>
                <span className="text-xs font-semibold text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded-lg border border-white/5">
                  {mat.thickness} мм
                </span>
              </div>

              {/* Price Row */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Хуудасны үнэ:</span>
                <div className="relative flex items-center max-w-[120px]">
                  <input
                    type="number"
                    value={mat.price || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateMaterialPrice(mat.id, val);
                    }}
                    className="w-full bg-[#0c0d12]/50 hover:bg-[#0c0d12] focus:bg-[#0c0d12] border border-white/10 hover:border-white/20 focus:border-amber-500 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-amber-400 outline-none transition-all"
                  />
                  <span className="text-[10px] text-neutral-500 font-semibold ml-1">₮</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Material Modal ───────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateMaterial}
            className="w-full max-w-sm bg-[#12141c] border border-white/10 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="font-display font-bold text-white text-sm">Шинэ Материал</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Хавтангийн мэдээллийг бөглөнө үү</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Нэр *</label>
              <input
                type="text"
                placeholder="Жишээ: Egger Цайвар Царс"
                required
                value={newMat.name}
                onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-colors placeholder-neutral-700"
              />
            </div>

            {/* Code + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Код *</label>
                <input
                  type="text"
                  placeholder="H1234-ST10"
                  required
                  value={newMat.code}
                  onChange={(e) => setNewMat({ ...newMat, code: e.target.value })}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-colors font-mono placeholder-neutral-700"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Төрөл</label>
                <select
                  value={newMat.category}
                  onChange={(e) => setNewMat({ ...newMat, category: e.target.value as any })}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-colors cursor-pointer"
                >
                  {['Egger', 'Kronospan', 'MDF', 'HDF', 'Plywood', 'Acrylic'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thickness + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Зузаан (мм)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newMat.thickness}
                  onChange={(e) => setNewMat({ ...newMat, thickness: parseInt(e.target.value) || 18 })}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Өнгө</label>
                <div className="flex items-center gap-2 bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-1.5">
                  <input
                    type="color"
                    value={newMat.color}
                    onChange={(e) => setNewMat({ ...newMat, color: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 outline-none p-0"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono">{newMat.color}</span>
                </div>
              </div>
            </div>

            {/* Price + Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Хуудасны үнэ (₮)</label>
                <input
                  type="number"
                  min={0}
                  value={newMat.price}
                  onChange={(e) => setNewMat({ ...newMat, price: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-colors font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Үлдэгдэл (ш)</label>
                <input
                  type="number"
                  min={0}
                  value={newMat.stock}
                  onChange={(e) => setNewMat({ ...newMat, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0c0d12] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-xs outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Болих
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Нэмэх
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Materials;
