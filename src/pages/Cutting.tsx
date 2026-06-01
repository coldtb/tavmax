import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { runNestingOptimizer } from '../utils/nesting';
import type { NestingPartInput } from '../utils/nesting';
import { CuttingCanvas } from '../components/CuttingCanvas';
import { Play, Settings, Ruler, Info, Layers } from 'lucide-react';

export const Cutting: React.FC = () => {
  const { activeProject, materials } = useProjectStore();

  // Nesting options states
  const [sheetSize, setSheetSize] = useState<'2750x1830' | '2440x1220' | '3050x1830'>('2750x1830');
  const [kerf, setKerf] = useState(4); // 4mm kerf blade
  const [margin, setMargin] = useState(10); // 10mm trim margin
  const [allowRotation, setAllowRotation] = useState(true);

  // Parse width and height from sheetSize string selection
  const sheetDimensions = useMemo(() => {
    const [w, h] = sheetSize.split('x').map((x) => parseInt(x));
    return { width: w, height: h };
  }, [sheetSize]);

  // Run nesting calculations
  const nestedSheets = useMemo(() => {
    if (!activeProject || !activeProject.parts || activeProject.parts.length === 0) return [];

    // Countertop material IDs — they use dedicated 4m x 600mm sheets, no rotation
    const COUNTERTOP_MAT_IDS = new Set(['mat-ct-wood', 'mat-ct-stone']);

    // Group parts by materialId
    const partsByMaterial: { [matId: string]: typeof activeProject.parts } = {};
    activeProject.parts.forEach((p) => {
      if (!partsByMaterial[p.materialId]) {
        partsByMaterial[p.materialId] = [];
      }
      partsByMaterial[p.materialId].push(p);
    });

    const allSheets: any[] = [];
    let globalSheetId = 1;

    Object.entries(partsByMaterial).forEach(([matId, parts]) => {
      const isCountertopMat = COUNTERTOP_MAT_IDS.has(matId);

      // Countertop sheets: 4000mm long x 600mm wide, no rotation
      const nestSheetW = isCountertopMat ? 4000 : sheetDimensions.width;
      const nestSheetH = isCountertopMat ? 600 : sheetDimensions.height;
      const nestRotation = isCountertopMat ? false : allowRotation;

      const partsInput: NestingPartInput[] = parts.map((p) => ({
        id: p.id,
        name: p.name,
        width: p.width,
        height: p.height,
        quantity: p.quantity,
        materialId: p.materialId,
      }));

      const sheets = runNestingOptimizer(partsInput, {
        sheetWidth: nestSheetW,
        sheetHeight: nestSheetH,
        kerf,
        margin,
        allowRotation: nestRotation,
      });

      sheets.forEach((sheet) => {
        allSheets.push({
          ...sheet,
          sheetId: globalSheetId++,
          materialId: matId,
        });
      });
    });

    return allSheets;
  }, [activeProject, sheetDimensions, kerf, margin, allowRotation]);

  // Calculate global metrics
  const totalSheets = nestedSheets.length;
  const avgEfficiency = useMemo(() => {
    if (nestedSheets.length === 0) return 0;
    const sum = nestedSheets.reduce((acc, sheet) => acc + sheet.efficiency, 0);
    return parseFloat((sum / nestedSheets.length).toFixed(1));
  }, [nestedSheets]);

  const groupedSheets = useMemo(() => {
    const groups: { [matId: string]: { material: any; sheets: any[] } } = {};
    
    nestedSheets.forEach((sheet) => {
      const matId = (sheet as any).materialId;
      if (!groups[matId]) {
        const material = materials.find((m) => m.id === matId) || {
          id: matId,
          name: 'Үл мэдэгдэх материал',
          thickness: 18,
          color: '#888',
          category: 'Бусад',
          code: 'N/A'
        };
        groups[matId] = { material, sheets: [] };
      }
      groups[matId].sheets.push(sheet);
    });
    
    return Object.values(groups);
  }, [nestedSheets, materials]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <Layers size={48} className="text-neutral-500 mb-4" />
        <h2 className="font-display font-bold text-white text-lg">Сонгосон төсөл алга байна</h2>
        <p className="text-neutral-400 text-xs mt-1">Эхлээд хянах самбараас төсөл сонгоно уу.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Хуудас зүсэлтийн оновчлол</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Төсөл: <span className="text-white font-semibold">{activeProject.name}</span>
            {' '}| Зүсэгдэх бэлдэц: <span className="text-amber-400 font-bold">{activeProject.parts.filter(p => !p.name.includes('Чулуун тавцан')).length}</span>
            {activeProject.parts.some(p => p.name.includes('Чулуун тавцан')) && (
              <span className="text-neutral-500"> | <span className="text-blue-400">{activeProject.parts.filter(p => p.name.includes('Чулуун тавцан')).length}</span> чулуун тавцан тусад нь захиалагдана</span>
            )}
          </p>
        </div>
      </div>

      {/* Grid: Settings and Layout displays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Side Panel (Col 4) */}
        <div className="lg:col-span-4 bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Settings size={18} className="text-amber-500" />
            <h3 className="font-display font-bold text-white text-base">Оновчлолын тохиргоо</h3>
          </div>

          {/* Board size selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-neutral-400 font-semibold">Стандарт хавтангийн хэмжээ</label>
            <select
              value={sheetSize}
              onChange={(e) => setSheetSize(e.target.value as any)}
              className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-3 text-white text-xs outline-none focus:border-amber-500"
            >
              <option value="2750x1830">2750 x 1830 мм (Стандарт Egger)</option>
              <option value="2440x1220">2440 x 1220 мм (Жижиг фанер)</option>
              <option value="3050x1830">3050 x 1830 мм (Том формат)</option>
            </select>
          </div>

          {/* Kerf blade size */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="font-semibold">Зүсүүрийн ирний зузаан (Kerf)</span>
              <span className="text-amber-500 font-bold">{kerf} мм</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={kerf}
              onChange={(e) => setKerf(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Margins */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="font-semibold">Хавтангийн ирмэгийн зай (Margin)</span>
              <span className="text-amber-500 font-bold">{margin} мм</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={5}
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Rotation allowed */}
          <div className="flex items-center gap-3 border-t border-white/5 pt-5">
            <input
              type="checkbox"
              id="allowRotation"
              checked={allowRotation}
              onChange={(e) => setAllowRotation(e.target.checked)}
              className="w-4 h-4 bg-neutral-900 border border-white/10 rounded accent-amber-500"
            />
            <div className="flex flex-col gap-0.5 select-none cursor-pointer">
              <label htmlFor="allowRotation" className="text-xs text-neutral-300 font-semibold">
                Бэлдэцийг эргүүлэх
              </label>
              <span className="text-[10px] text-neutral-500">Ширхэг чиглэл дагах шаардлагагүй үед эргүүлж талбай хэмнэнэ.</span>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-neutral-400">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              Зүсэлтийг эхлүүлэхэд систем автоматаар 2D үүрэн алгоритмаар бодож оновчтой координатыг гаргана.
            </div>
          </div>
        </div>

        {/* Nesting Results Viewports (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* General nesting summaries banner */}
          <div className="grid grid-cols-3 gap-4 bg-[#12141c] border border-white/5 p-4 rounded-xl">
            <div className="text-center border-r border-white/5">
              <span className="block text-[10px] text-neutral-500 uppercase">Шаардлагатай хавтан</span>
              <span className="text-xl font-bold text-white">{totalSheets} ширхэг</span>
            </div>
            <div className="text-center border-r border-white/5">
              <span className="block text-[10px] text-neutral-500 uppercase">Нийт ашиглалт</span>
              <span className="text-xl font-bold text-emerald-400">{avgEfficiency}%</span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] text-neutral-500 uppercase">Дундаж хаягдал</span>
              <span className="text-xl font-bold text-red-400">{(100 - avgEfficiency).toFixed(1)}%</span>
            </div>
          </div>

          {/* List of Canvas sheets renderers grouped by material */}
          {groupedSheets.length > 0 ? (
            <div className="flex flex-col gap-10">
              {groupedSheets.map(({ material, sheets }) => (
                <div key={material.id} className="flex flex-col gap-6 bg-[#0a0b10]/40 border border-white/5 p-6 rounded-2xl">
                  {/* Material Section Title */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: material.color }} />
                      <div>
                        <h4 className="text-sm font-bold text-white leading-none">
                          {material.name} ({material.thickness} мм)
                        </h4>
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          Ангилал: {material.category} | Код: {material.code}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Хэрэглэгдэх хавтан: {sheets.length} ш
                    </span>
                  </div>

                  {/* Canvas Renderers for this Material */}
                  <div className="flex flex-col gap-8">
                    {sheets.map((sheet, index) => (
                      <CuttingCanvas
                        key={sheet.sheetId}
                        sheet={{
                          ...sheet,
                          localSheetId: index + 1
                        }}
                        materialName={`${material.name} (${material.thickness}мм)`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#12141c] rounded-2xl p-12 text-center border border-white/5">
              <p className="text-neutral-400 text-xs">Бэлдэцийн жагсаалт хоосон тул зүсэлт бодогдсонгүй.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Cutting;
