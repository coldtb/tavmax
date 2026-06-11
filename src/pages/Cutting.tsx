import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { runNestingOptimizer } from '../utils/nesting';
import type { NestingPartInput } from '../utils/nesting';
import { CuttingCanvas } from '../components/CuttingCanvas';
import { Play, Settings, Ruler, Info, Layers, Plus, Trash2, Download, Printer, RefreshCw } from 'lucide-react';
import { exportProjectToPDF } from '../utils/pdfExport';
import { generatePartsDXF } from '../utils/dxfExport';

export const Cutting: React.FC = () => {
  const { activeProject, materials, addPartToActive, removePartFromActive } = useProjectStore();
  const [pdfLoading, setPdfLoading] = useState(false);

  // Nesting options states with localStorage persistence
  const [sheetSize, setSheetSize] = useState<'2750x1830' | '2440x1220' | '3050x1830'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tavmax-nesting-sheet-size');
      if (saved === '2750x1830' || saved === '2440x1220' || saved === '3050x1830') {
        return saved;
      }
    }
    return '2440x1220'; // Default is now 2440x1220 (Жижиг фанер)
  });

  const [kerf, setKerf] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tavmax-nesting-kerf');
      if (saved) return parseInt(saved);
    }
    return 4;
  });

  const [margin, setMargin] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tavmax-nesting-margin');
      if (saved) return parseInt(saved);
    }
    return 10;
  });

  const [allowRotation, setAllowRotation] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tavmax-nesting-allow-rotation');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-nesting-sheet-size', sheetSize);
    }
  }, [sheetSize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-nesting-kerf', kerf.toString());
    }
  }, [kerf]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-nesting-margin', margin.toString());
    }
  }, [margin]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavmax-nesting-allow-rotation', allowRotation.toString());
    }
  }, [allowRotation]);

  // Manual part addition states
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState({
    name: '',
    width: 500,
    height: 500,
    quantity: 1,
    category: 'Хажуу хана' as any,
    edgeBanding: 'none' as any,
    xOffset: 0,
    yOffset: 200,
    zOffset: 0,
  });

  const partsCategories = ['Хажуу хана', 'Дээд тавиур', 'Доод тавиур', 'Хаалга', 'Шургуулга', 'Ар тал', 'Хуваалт'];
  const edgeBandings = ['none', '1mm', '2mm', 'all-sides'];

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.name || !activeProject) return;

    addPartToActive({
      name: newPart.name,
      width: newPart.width,
      height: newPart.height,
      quantity: newPart.quantity,
      materialId: activeProject.config.materialId,
      category: newPart.category,
      edgeBanding: newPart.edgeBanding,
      xOffset: newPart.xOffset,
      yOffset: newPart.yOffset,
      zOffset: newPart.zOffset,
    } as any);

    setShowAddPart(false);
    setNewPart({
      name: '',
      width: 500,
      height: 500,
      quantity: 1,
      category: 'Хажуу хана',
      edgeBanding: 'none',
      xOffset: 0,
      yOffset: 200,
      zOffset: 0,
    });
  };

  // Group parts with duplicate dimensions, material, and edge banding
  const groupedParts = useMemo(() => {
    if (!activeProject || !activeProject.parts) return [];

    interface GroupedPart {
      id: string;
      name: string;
      category: string;
      width: number;
      height: number;
      quantity: number;
      edgeBanding: string;
      materialId: string;
      originalIds: string[];
    }

    const groups: GroupedPart[] = [];
    const modules = activeProject.modules || [];

    activeProject.parts.forEach((part) => {
      const match = groups.find((g) =>
        g.width === part.width &&
        g.height === part.height &&
        g.materialId === part.materialId &&
        g.edgeBanding === part.edgeBanding
      );

      if (match) {
        match.quantity += part.quantity;
        match.originalIds.push(part.id);
        
        const existingNames = match.name.split(' / ');
        const partBaseName = part.name.includes(' - ') ? part.name.split(' - ')[1] : part.name;
        if (!existingNames.includes(partBaseName)) {
          match.name += ` / ${partBaseName}`;
        }
      } else {
        const partBaseName = part.name.includes(' - ') ? part.name.split(' - ')[1] : part.name;
        groups.push({
          id: part.id,
          name: partBaseName,
          category: part.category,
          width: part.width,
          height: part.height,
          quantity: part.quantity,
          edgeBanding: part.edgeBanding,
          materialId: part.materialId,
          originalIds: [part.id]
        });
      }
    });

    return groups.map((g) => {
      const modNums: number[] = [];
      g.originalIds.forEach((pId) => {
        const originalPart = activeProject.parts.find(p => p.id === pId);
        if (originalPart) {
          const modIdx = modules.findIndex(m => originalPart.name.startsWith(m.name));
          if (modIdx !== -1) {
            modNums.push(modIdx + 1);
          }
        }
      });
      
      const uniqueModNums = Array.from(new Set(modNums)).sort((a, b) => a - b);
      if (uniqueModNums.length > 1) {
        return {
          ...g,
          name: `${g.name} (${uniqueModNums.join(', ')})`
        };
      }
      return g;
    });
  }, [activeProject]);

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

      // Countertop sheets: 4600mm long x 600mm wide, no rotation
      const nestSheetW = isCountertopMat ? 4600 : sheetDimensions.width;
      const nestSheetH = isCountertopMat ? 600 : sheetDimensions.height;
      const nestRotation = isCountertopMat ? false : allowRotation;

      const partsInput: NestingPartInput[] = parts.map((p) => {
        // Countertop parts are defined with width=600 and height=module_width in projectStore.
        // Orient them lengthwise (longer dimension as width, 600mm width as height) to lay flat.
        const partW = isCountertopMat ? Math.max(p.width, p.height) : p.width;
        const partH = isCountertopMat ? Math.min(p.width, p.height) : p.height;
        return {
          id: p.id,
          name: p.name,
          width: partW,
          height: partH,
          quantity: p.quantity,
          materialId: p.materialId,
        };
      });

      const sheets = runNestingOptimizer(partsInput, {
        sheetWidth: nestSheetW,
        sheetHeight: nestSheetH,
        kerf,
        margin: isCountertopMat ? 0 : margin,
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

  // Calculations for total price matching raw cost
  const calculations = useMemo(() => {
    if (!activeProject) return { board: 0, edge: 0, hardware: 0, labor: 0, subtotal: 0, profit: 0, vat: 0, total: 0 };

    let totalBoardCost = 0;
    nestedSheets.forEach((sheet) => {
      const mat = materials.find((m) => m.id === sheet.materialId) || materials[0];
      totalBoardCost += mat?.price || 0;
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
    return {
      board: totalBoardCost,
      edge: totalEdgeBandingCost,
      hardware: hardwareCost,
      labor: 0,
      subtotal,
      profit: 0,
      vat: 0,
      total: subtotal,
    };
  }, [activeProject, nestedSheets, materials]);

  const handleTriggerPDF = async () => {
    if (!activeProject || pdfLoading) return;
    setPdfLoading(true);
    try {
      const threeImageDataUrl = sessionStorage.getItem('tavmax-three-screenshot');
      await exportProjectToPDF(
        { ...activeProject, price: calculations.total },
        materials,
        nestedSheets,
        threeImageDataUrl,
        calculations
      );
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleTriggerDXF = () => {
    if (!activeProject) return;
    const dxfText = generatePartsDXF(activeProject.parts);
    const blob = new Blob([dxfText], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TavMax_CAD_${activeProject.name}.dxf`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
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

        {/* Exports HUD */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleTriggerDXF}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-white/5 transition-all cursor-pointer"
          >
            <Download size={14} />
            DXF CNC Экспорт
          </button>
          <button
            onClick={handleTriggerPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-all shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfLoading ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                Бэлдэж байна...
              </>
            ) : (
              <>
                <Printer size={14} />
                PDF Тайлан хэвлэх
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: Settings and Layout displays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Side Panel (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
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
                <option value="2440x1220">2440 x 1220 мм (Жижиг фанер)</option>
                <option value="2750x1830">2750 x 1830 мм (Стандарт Egger)</option>
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

          {/* ── NEW: Бэлдэцийн Хэмжээсүүд ── */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-white text-sm">Бэлдэцийн Хэмжээсүүд</h3>
              <button
                onClick={() => setShowAddPart(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <Plus size={12} />
                Нэмэх
              </button>
            </div>

            {/* Compact Parts list table */}
            <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-white/5 text-neutral-500">
                    <th className="pb-2 font-semibold">Нэр</th>
                    <th className="pb-2 font-semibold text-right">Өндөр</th>
                    <th className="pb-2 font-semibold text-right">Өргөн</th>
                    <th className="pb-2 font-semibold text-center">Тоо</th>
                    <th className="pb-2 text-center">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedParts.map((part) => (
                    <tr key={part.id} className="text-neutral-300 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 font-medium text-white truncate max-w-[90px]" title={part.name}>{part.name}</td>
                      <td className="py-2 text-right font-mono">{part.height}</td>
                      <td className="py-2 text-right font-mono">{part.width}</td>
                      <td className="py-2 text-center font-mono">{part.quantity}</td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Та энэ хэмжээтэй бүх бэлдэцийг устгахдаа итгэлтэй байна уу?')) {
                              part.originalIds.forEach((id) => removePartFromActive(id));
                            }
                          }}
                          className="p-1 rounded bg-neutral-800/40 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {groupedParts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-neutral-500">
                        Бэлдэц хоосон байна.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

      {/* ADD MANUALLY PART POPUP MODAL */}
      {showAddPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddPartSubmit} className="w-full max-w-sm bg-[#12141c] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl glass-dark">
            <div className="text-center border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-white text-base">Шинэ бэлдэц оруулах</h3>
              <p className="text-[10px] text-neutral-400 mt-1">Гар аргаар бэлдэцийн хэмжээг жагсаалтад нэмэх</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Бэлдэцийн нэр</label>
              <input
                type="text"
                placeholder="Жишээ: Хаалга дунд хуваалт"
                required
                value={newPart.name}
                onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Өндөр (мм)</label>
                <input
                  type="number"
                  required
                  value={newPart.height}
                  onChange={(e) => setNewPart({ ...newPart, height: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Өргөн (мм)</label>
                <input
                  type="number"
                  required
                  value={newPart.width}
                  onChange={(e) => setNewPart({ ...newPart, width: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Тоо ширхэг</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-semibold">Ангилал</label>
                <select
                  value={newPart.category}
                  onChange={(e) => setNewPart({ ...newPart, category: e.target.value as any })}
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                >
                  {partsCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Ирмэг наалт</label>
              <select
                value={newPart.edgeBanding}
                onChange={(e) => setNewPart({ ...newPart, edgeBanding: e.target.value as any })}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 cursor-pointer"
              >
                {edgeBandings.map((eb) => (
                  <option key={eb} value={eb}>
                    {eb === 'none' ? 'Ирмэггүй' : eb}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setShowAddPart(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Хаах
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
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
export default Cutting;
