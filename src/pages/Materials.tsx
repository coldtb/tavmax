import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { Material } from '../data/mockData';
import { Search, Filter, Plus, ClipboardList, Package, Edit2 } from 'lucide-react';

export const Materials: React.FC = () => {
  const { materials } = useProjectStore();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMat, setNewMat] = useState<Omit<Material, 'id'>>({
    name: '',
    code: '',
    category: 'MDF',
    thickness: 18,
    price: 120000,
    stock: 50,
    supplier: '',
    color: '#cccccc',
  });

  const categories = ['all', 'Egger', 'Kronospan', 'MDF', 'HDF', 'Plywood', 'Acrylic'];

  const filteredMaterials = materials.filter((mat) => {
    const matchesSearch =
      mat.name.toLowerCase().includes(search.toLowerCase()) ||
      mat.code.toLowerCase().includes(search.toLowerCase()) ||
      mat.supplier.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || mat.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMat.name || !newMat.code) return;

    materials.push({
      id: `mat-${Date.now()}`,
      ...newMat,
    });
    
    setShowAddModal(false);
    setNewMat({
      name: '',
      code: '',
      category: 'MDF',
      thickness: 18,
      price: 120000,
      stock: 50,
      supplier: '',
      color: '#cccccc',
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Материалын Сан</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Ашиглагдаж буй хавтан, тавилга бэлдэцийн нөөц болон үнийн бүртгэл
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus size={16} />
          Шинэ Материал Нэмэх
        </button>
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#12141c] border border-white/5 p-4 rounded-xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input
            type="text"
            placeholder="Материалын нэр, код, нийлүүлэгчээр хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0c0d12] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-amber-500"
          />
        </div>

        {/* Category chips filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Бүгд' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Materials List Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((mat) => {
          const isLowStock = mat.stock < 100;
          return (
            <div
              key={mat.id}
              className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-lg group hover:border-amber-500/20 transition-all"
            >
              {/* Header card */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: mat.color }} />
                  <div>
                    <h3 className="font-display font-bold text-white text-sm line-clamp-1 group-hover:text-amber-500 transition-colors">
                      {mat.name}
                    </h3>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">Код: {mat.code}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-neutral-900 border border-white/5 rounded-lg text-[9px] font-bold text-neutral-400 uppercase">
                  {mat.category}
                </span>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-4 bg-neutral-950/40 p-3 rounded-xl text-xs">
                <div>
                  <span className="block text-[9px] text-neutral-500">Зузаан (Thickness)</span>
                  <span className="font-semibold text-white">{mat.thickness} мм</span>
                </div>
                <div>
                  <span className="block text-[9px] text-neutral-500">Нийлүүлэгч</span>
                  <span className="font-semibold text-white truncate block max-w-[100px]">{mat.supplier}</span>
                </div>
              </div>

              {/* Stock and Price */}
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <div className="flex items-center gap-1.5">
                  <Package size={14} className={isLowStock ? 'text-amber-500' : 'text-emerald-500'} />
                  <div>
                    <span className="block text-[9px] text-neutral-500 leading-none">Нөөц үлдэгдэл</span>
                    <span className={`text-xs font-bold ${isLowStock ? 'text-amber-500' : 'text-emerald-400'}`}>
                      {mat.stock} ширхэг
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] text-neutral-500">Хуудасны үнэ</span>
                  <span className="text-sm font-bold text-amber-500">{mat.price.toLocaleString('mn-MN')} ₮</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD MATERIAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateMaterial} className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl glass-dark">
            <div className="text-center border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-white text-base">Шинэ материал бүртгэх</h3>
              <p className="text-[10px] text-neutral-400 mt-1">Үйлдвэрт ашиглагдах хавтангийн өгөгдлийг оруулах</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Материалын Нэр</label>
              <input
                type="text"
                placeholder="Жишээ: Egger Улаан Хүрэн"
                required
                value={newMat.name}
                onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Бүтээгдэхүүний Код</label>
                <input
                  type="text"
                  placeholder="H1234-ST10"
                  required
                  value={newMat.code}
                  onChange={(e) => setNewMat({ ...newMat, code: e.target.value })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Төрөл</label>
                <select
                  value={newMat.category}
                  onChange={(e) => setNewMat({ ...newMat, category: e.target.value as any })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
                >
                  <option value="Egger">Egger</option>
                  <option value="Kronospan">Kronospan</option>
                  <option value="MDF">MDF</option>
                  <option value="HDF">HDF</option>
                  <option value="Plywood">Plywood</option>
                  <option value="Acrylic">Acrylic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Зузаан (мм)</label>
                <input
                  type="number"
                  value={newMat.thickness}
                  onChange={(e) => setNewMat({ ...newMat, thickness: parseInt(e.target.value) || 18 })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Нөөц үлдэгдэл</label>
                <input
                  type="number"
                  value={newMat.stock}
                  onChange={(e) => setNewMat({ ...newMat, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Өнгө (Hex)</label>
                <input
                  type="color"
                  value={newMat.color}
                  onChange={(e) => setNewMat({ ...newMat, color: e.target.value })}
                  className="w-full h-9 bg-neutral-900 border border-white/10 rounded-xl p-1 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Нэгж Хавтангийн Үнэ</label>
                <input
                  type="number"
                  value={newMat.price}
                  onChange={(e) => setNewMat({ ...newMat, price: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Нийлүүлэгч</label>
                <input
                  type="text"
                  placeholder="Компанийн нэр"
                  value={newMat.supplier}
                  onChange={(e) => setNewMat({ ...newMat, supplier: e.target.value })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Хаах
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
              >
                Хадгалах
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Materials;
