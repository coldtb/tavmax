import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { exportProjectToPDF } from '../utils/pdfExport';
import { generatePartsDXF } from '../utils/dxfExport';
import { Calculator, Percent, Coins, Printer, Download, Plus, Trash2, ArrowUpRight } from 'lucide-react';
import { runNestingOptimizer } from '../utils/nesting';
import type { NestingPartInput } from '../utils/nesting';

export const Pricing: React.FC = () => {
  const { activeProject, materials, addPartToActive, removePartFromActive, updatePartInActive, updateMaterialPrice } = useProjectStore();

  // Pricing modifier states (set to 0 for raw material cost estimation)
  const [profitMargin] = useState(0); 
  const [laborCost] = useState(0);   
  const [deliveryCost] = useState(0); 
  const [installCost] = useState(0);   
  const [hasVat] = useState(false);

  // New Part State (Manual adder)
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

  // Calculations
  const calculations = useMemo(() => {
    if (!activeProject) return { board: 0, edge: 0, hardware: 0, labor: 0, subtotal: 0, profit: 0, vat: 0, total: 0 };

    // Calculate boards required using the nesting algorithm to get exact board counts
    const partsInput: NestingPartInput[] = activeProject.parts.map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      quantity: p.quantity,
      materialId: p.materialId,
    }));

    // Group parts by material to find specific sheets required
    let totalBoardCost = 0;
    const materialGroups = new Map<string, typeof partsInput>();
    partsInput.forEach((p) => {
      if (!materialGroups.has(p.materialId)) materialGroups.set(p.materialId, []);
      materialGroups.get(p.materialId)!.push(p);
    });

    let userSheetW = 2440;
    let userSheetH = 1220;
    let userKerf = 4;
    let userMargin = 10;
    let userAllowRotation = true;

    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('tavmax-nesting-sheet-size');
      if (savedSize === '2750x1830' || savedSize === '2440x1220' || savedSize === '3050x1830') {
        const [w, h] = savedSize.split('x').map(x => parseInt(x));
        userSheetW = w;
        userSheetH = h;
      }
      const savedKerf = localStorage.getItem('tavmax-nesting-kerf');
      if (savedKerf) userKerf = parseInt(savedKerf);

      const savedMargin = localStorage.getItem('tavmax-nesting-margin');
      if (savedMargin) userMargin = parseInt(savedMargin);

      const savedRotation = localStorage.getItem('tavmax-nesting-allow-rotation');
      if (savedRotation !== null) userAllowRotation = savedRotation === 'true';
    }

    materialGroups.forEach((groupParts, matId) => {
      const mat = materials.find((m) => m.id === matId) || materials[0];
      const isCountertopMat = matId === 'mat-ct-wood' || matId === 'mat-ct-stone';

      const nestSheetW = isCountertopMat ? 4600 : userSheetW;
      const nestSheetH = isCountertopMat ? 600 : userSheetH;
      const nestRotation = isCountertopMat ? false : userAllowRotation;
      const nestMargin = isCountertopMat ? 0 : userMargin;

      const groupPartsInput = groupParts.map((p) => {
        // Orient countertop parts lengthwise (width=longer, height=600mm)
        const partW = isCountertopMat ? Math.max(p.width, p.height) : p.width;
        const partH = isCountertopMat ? Math.min(p.width, p.height) : p.height;
        return {
          ...p,
          width: partW,
          height: partH,
        };
      });

      const sheets = runNestingOptimizer(groupPartsInput, {
        sheetWidth: nestSheetW,
        sheetHeight: nestSheetH,
        kerf: userKerf,
        margin: nestMargin,
        allowRotation: nestRotation,
      });
      totalBoardCost += sheets.length * mat.price;
    });

    // Simple pricing equations for edge banding (MNT per mm)
    let totalEdgeBandingCost = 0;
    activeProject.parts.forEach((p) => {
      if (p.edgeBanding !== 'none') {
        const perimeter = (p.width + p.height) * 2;
        const rate = p.edgeBanding === '2mm' ? 1.5 : 0.8; // 1.5 MNT per mm for 2mm edge banding
        totalEdgeBandingCost += perimeter * rate * p.quantity;
      }
    });

    // Hardware cost (rough estimation based on door hinges / drawer tracks)
    const hingesCount = activeProject.config.doors * 3;
    const tracksCount = activeProject.config.drawers;
    const hardwareCost = hingesCount * 8000 + tracksCount * 25000 + 40000; // base handle pricing

    const subtotal = totalBoardCost + totalEdgeBandingCost + hardwareCost + laborCost + deliveryCost + installCost;
    const profit = subtotal * (profitMargin / 100);
    const vat = hasVat ? (subtotal + profit) * 0.1 : 0;
    const total = subtotal + profit + vat;

    return {
      board: totalBoardCost,
      edge: totalEdgeBandingCost,
      hardware: hardwareCost,
      labor: laborCost,
      subtotal,
      profit,
      vat,
      total,
    };
  }, [activeProject, profitMargin, laborCost, deliveryCost, installCost, hasVat, materials]);

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
      // Find matching group by dimensions, material, and edge banding
      const match = groups.find((g) =>
        g.width === part.width &&
        g.height === part.height &&
        g.materialId === part.materialId &&
        g.edgeBanding === part.edgeBanding
      );

      if (match) {
        match.quantity += part.quantity;
        match.originalIds.push(part.id);
        
        // Append unique base names if different
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

    // Post-process names to append module numbers if grouped
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

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <Calculator size={48} className="text-neutral-500 mb-4" />
        <h2 className="font-display font-bold text-white text-lg">Сонгосон төсөл алга байна</h2>
      </div>
    );
  }

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.name) return;

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

  const handleTriggerPDF = () => {
    // Group parts by material to find specific sheets required, matching the exact pricing calculations
    const partsByMaterial: { [matId: string]: NestingPartInput[] } = {};
    activeProject.parts.forEach((p) => {
      if (!partsByMaterial[p.materialId]) {
        partsByMaterial[p.materialId] = [];
      }
      partsByMaterial[p.materialId].push({
        id: p.id,
        name: p.name,
        width: p.width,
        height: p.height,
        quantity: p.quantity,
        materialId: p.materialId,
      });
    });

    let userSheetW = 2440;
    let userSheetH = 1220;
    let userKerf = 4;
    let userMargin = 10;
    let userAllowRotation = true;

    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('tavmax-nesting-sheet-size');
      if (savedSize === '2750x1830' || savedSize === '2440x1220' || savedSize === '3050x1830') {
        const [w, h] = savedSize.split('x').map(x => parseInt(x));
        userSheetW = w;
        userSheetH = h;
      }
      const savedKerf = localStorage.getItem('tavmax-nesting-kerf');
      if (savedKerf) userKerf = parseInt(savedKerf);

      const savedMargin = localStorage.getItem('tavmax-nesting-margin');
      if (savedMargin) userMargin = parseInt(savedMargin);

      const savedRotation = localStorage.getItem('tavmax-nesting-allow-rotation');
      if (savedRotation !== null) userAllowRotation = savedRotation === 'true';
    }

    const allSheets: any[] = [];
    let globalSheetId = 1;

    Object.entries(partsByMaterial).forEach(([matId, groupParts]) => {
      const isCountertopMat = matId === 'mat-ct-wood' || matId === 'mat-ct-stone';
      const nestSheetW = isCountertopMat ? 4600 : userSheetW;
      const nestSheetH = isCountertopMat ? 600 : userSheetH;
      const nestRotation = isCountertopMat ? false : userAllowRotation;
      const nestMargin = isCountertopMat ? 0 : userMargin;

      const groupPartsInput = groupParts.map((p) => {
        const partW = isCountertopMat ? Math.max(p.width, p.height) : p.width;
        const partH = isCountertopMat ? Math.min(p.width, p.height) : p.height;
        return {
          ...p,
          width: partW,
          height: partH,
        };
      });

      const sheets = runNestingOptimizer(groupPartsInput, {
        sheetWidth: nestSheetW,
        sheetHeight: nestSheetH,
        kerf: userKerf,
        margin: nestMargin,
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

    const threeImageDataUrl = sessionStorage.getItem('tavmax-three-screenshot');
    exportProjectToPDF(
      { ...activeProject, price: calculations.total },
      materials,
      allSheets,
      threeImageDataUrl,
      calculations
    );
  };

  const handleTriggerDXF = () => {
    const dxfText = generatePartsDXF(activeProject.parts);
    const blob = new Blob([dxfText], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TavMax_CAD_${activeProject.name}.dxf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Cost items for SVG chart representation
  const chartItems = [
    { label: 'Хавтан', val: calculations.board, color: '#f59e0b' },
    { label: 'Ирмэг', val: calculations.edge, color: '#10b981' },
    { label: 'Тоноглол', val: calculations.hardware, color: '#3b82f6' },
    { label: 'Ажлын хөлс', val: calculations.labor, color: '#a855f7' },
    { label: 'Хүргэлт/Суурилуулалт', val: deliveryCost + installCost, color: '#f43f5e' },
    { label: 'Цэвэр ашиг', val: calculations.profit, color: '#eab308' },
  ].filter(item => item.val > 0);

  const totalSum = chartItems.reduce((acc, item) => acc + item.val, 0);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Төслийн Үнэ & Бэлдэц</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Загвар: <span className="text-white font-semibold">{activeProject.name}</span> | Нарийвчилсан бэлдэцийн хэмжээс ба төсөв
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-all shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <Printer size={14} />
            PDF Тайлан хэвлэх
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cost breakdown modifiers side panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Material price editor card */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Coins size={16} className="text-amber-500" />
              <h4 className="font-display font-bold text-white text-sm">Материалын хуудасны үнэ</h4>
            </div>
            
            <div className="flex flex-col gap-4 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {materials.map((mat) => (
                <div key={mat.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 font-semibold">{mat.name} ({mat.thickness}мм)</span>
                    <span className="text-[10px] text-neutral-500 uppercase">{mat.category}</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={mat.price || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        updateMaterialPrice(mat.id, val);
                      }}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-white text-xs outline-none focus:border-amber-500 font-mono text-right"
                    />
                    <span className="absolute right-3 text-[10px] text-neutral-500 font-bold pointer-events-none">₮</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SVG breakdown donut/distribution bar */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <h4 className="font-display font-bold text-white text-sm">Зардлын хуваарилалт</h4>
            
            {/* Visual SVG block segment bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-900 mt-2">
              {chartItems.map((item, index) => {
                const widthPercent = (item.val / totalSum) * 100;
                return (
                  <div
                    key={index}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.label}: ${widthPercent.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Legend checklist */}
            <div className="flex flex-col gap-2 mt-2">
              {chartItems.map((item, index) => {
                const widthPercent = (item.val / totalSum) * 100;
                return (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-semibold text-white">{widthPercent.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pricing calculations total invoice and Parts list table (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Main Price Indicator */}
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/5 to-transparent border border-amber-500/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Coins size={22} />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest leading-none">Санал болгох нийт дүн</span>
                <h2 className="text-2xl font-display font-extrabold text-white mt-1">
                  {Math.round(calculations.total).toLocaleString('mn-MN')} ₮
                </h2>
              </div>
            </div>
            
            <div className="text-left sm:text-right text-[10px] text-neutral-400 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto flex flex-col gap-1">
              <div>Нийт зардал: {Math.round(calculations.subtotal).toLocaleString('mn-MN')} ₮</div>
              <div>Цэвэр ашиг: {Math.round(calculations.profit).toLocaleString('mn-MN')} ₮</div>
            </div>
          </div>

          {/* Parts list header & action buttons */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="font-display font-bold text-white text-base">Бэлдэцийн Хэмжээсүүд</h3>
              <button
                onClick={() => setShowAddPart(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Бэлдэц Нэмэх
              </button>
            </div>

            {/* Parts list registry table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-neutral-400">
                    <th className="pb-3 font-semibold">Нэр</th>
                    <th className="pb-3 font-semibold">Төрөл</th>
                    <th className="pb-3 font-semibold text-right">Өндөр (мм)</th>
                    <th className="pb-3 font-semibold text-right">Өргөн (мм)</th>
                    <th className="pb-3 font-semibold text-center">Тоо</th>
                    <th className="pb-3 font-semibold">Ирмэг</th>
                    <th className="pb-3 text-center">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedParts.map((part) => (
                    <tr key={part.id} className="text-neutral-300 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-medium text-white">{part.name}</td>
                      <td className="py-3 text-neutral-500">{part.category}</td>
                      <td className="py-3 text-right font-mono">{part.height}</td>
                      <td className="py-3 text-right font-mono">{part.width}</td>
                      <td className="py-3 text-center font-mono">{part.quantity}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          part.edgeBanding === 'none' ? 'bg-neutral-800 text-neutral-500' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {part.edgeBanding === 'none' ? 'Ирмэггүй' : part.edgeBanding}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Та энэ хэмжээтэй бүх бэлдэцийг устгахдаа итгэлтэй байна уу?')) {
                              part.originalIds.forEach((id) => removePartFromActive(id));
                            }
                          }}
                          className="p-1 rounded bg-neutral-800/40 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

            <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2">
              <span className="text-[10px] text-neutral-400 font-semibold">3D Байршил (Картны доторх координат)</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500">X (мм)</label>
                  <input
                    type="number"
                    value={newPart.xOffset}
                    onChange={(e) => setNewPart({ ...newPart, xOffset: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500">Y (мм)</label>
                  <input
                    type="number"
                    value={newPart.yOffset}
                    onChange={(e) => setNewPart({ ...newPart, yOffset: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500">Z (мм)</label>
                  <input
                    type="number"
                    value={newPart.zOffset}
                    onChange={(e) => setNewPart({ ...newPart, zOffset: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
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
export default Pricing;
