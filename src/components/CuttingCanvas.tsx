import React, { useState } from 'react';
import type { NestedSheet } from '../utils/nesting';
import { generateSheetSVG } from '../utils/dxfExport';
import { Download, Printer, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CuttingCanvasProps {
  sheet: NestedSheet;
  materialName?: string;
}

export const CuttingCanvas: React.FC<CuttingCanvasProps> = ({ sheet, materialName }) => {
  const [scale, setScale] = useState(1);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Download SVG wrapper
  const handleDownloadSVG = () => {
    const svgStr = generateSheetSVG(sheet);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TavMax_Sheet_${sheet.sheetId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Color mapping based on parts classification (e.g. walls, shelves)
  const getPartColor = (name: string) => {
    if (name.includes('Хажуу')) return 'bg-amber-800/20 border-amber-600 text-amber-300';
    if (name.includes('Хаалга')) return 'bg-blue-800/20 border-blue-600 text-blue-300';
    if (name.includes('Шургуулга')) return 'bg-purple-800/20 border-purple-600 text-purple-300';
    if (name.includes('тавиур') || name.includes('таг')) return 'bg-emerald-800/20 border-emerald-600 text-emerald-300';
    return 'bg-neutral-800/20 border-neutral-600 text-neutral-300';
  };

  const getPartSVGColor = (name: string) => {
    if (name.includes('Хажуу')) return '#f59e0b';
    if (name.includes('Хаалга')) return '#3b82f6';
    if (name.includes('Шургуулга')) return '#a855f7';
    if (name.includes('тавиур') || name.includes('таг')) return '#10b981';
    return '#6b7280';
  };

  return (
    <div className="bg-[#12141c] rounded-2xl border border-white/5 p-3 sm:p-6 flex flex-col gap-4">
      {/* Header controls */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="font-display font-bold text-base sm:text-lg text-white flex flex-wrap items-center gap-2">
            Хавтан №{sheet.localSheetId !== undefined ? sheet.localSheetId : sheet.sheetId} {materialName && <span className="text-amber-400 font-semibold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{materialName}</span>} <span className="text-xs sm:text-sm font-normal text-neutral-400">({sheet.width} x {sheet.height} мм)</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
            Ашигтай талбай: <span className="text-amber-500 font-semibold">{sheet.efficiency}%</span> | Хаягдал: {(100 - sheet.efficiency).toFixed(1)}%
          </p>
        </div>
        
        {/* Buttons HUD */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Багасгах"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => setScale((prev) => Math.min(2, prev + 0.1))}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Томсгох"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleDownloadSVG}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold transition-all shadow-md"
          >
            <Download size={14} />
            SVG CNC Татах
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Хэвлэх"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Board */}
      <div className="relative w-full overflow-auto bg-[#0a0b10] border border-white/5 rounded-xl flex items-center justify-center p-2 sm:p-8 min-h-[350px]">
        <div
          className="relative transition-transform duration-200"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          {/* Main Sheet Container */}
          <div
            className="relative bg-neutral-900 border-2 border-neutral-700 shadow-2xl overflow-hidden"
            style={{
              width: `${sheet.width / 5}px`,
              height: `${sheet.height / 5}px`,
            }}
          >
            {/* Sheet Edge Trim Margin indicator */}
            <div className="absolute inset-[2px] border border-dashed border-red-500/20 pointer-events-none" />

            {/* Placed pieces */}
            {sheet.parts.map((part) => {
              const px = part.x / 5;
              const py = part.y / 5;
              const pw = part.width / 5;
              const ph = part.height / 5;
              const isHovered = hoveredPart === part.id;

              return (
                <div
                  key={part.id}
                  onMouseEnter={() => setHoveredPart(part.id)}
                  onMouseLeave={() => setHoveredPart(null)}
                  className={`absolute rounded border flex flex-col justify-center items-center p-1 text-[8px] leading-tight select-none cursor-help transition-all ${
                    getPartColor(part.name)
                  } ${isHovered ? 'ring-2 ring-amber-500 bg-amber-500/20' : ''}`}
                  style={{
                    left: `${px}px`,
                    top: `${py}px`,
                    width: `${pw}px`,
                    height: `${ph}px`,
                  }}
                >
                  <span className="font-semibold truncate max-w-full">{part.name}</span>
                  <span className="text-[7px] opacity-75">{part.width}x{part.height}</span>
                  {part.rotated && <span className="text-[6px] text-yellow-400 font-bold">R</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover Detailing HUD */}
        {hoveredPart && (
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-xs flex flex-col gap-0.5">
            {sheet.parts
              .filter((p) => p.id === hoveredPart)
              .map((p) => (
                <React.Fragment key={p.id}>
                  <div className="font-bold text-white">{p.name}</div>
                  <div className="text-neutral-400">
                    Хэмжээ: <span className="text-amber-400 font-semibold">{p.width} x {p.height} мм</span>
                  </div>
                  <div className="text-neutral-400">
                    Байршил: X={p.x}, Y={p.y}
                  </div>
                  {p.rotated && <div className="text-amber-500 font-semibold text-[10px]">Эргүүлсэн (90°)</div>}
                </React.Fragment>
              ))}
          </div>
        )}
      </div>

      {/* SVG Nesting stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
        <div>
          <div className="text-neutral-400 text-xs">Хавтангийн хэмжээ</div>
          <div className="font-bold text-sm text-white">{sheet.width} х {sheet.height} мм</div>
        </div>
        <div>
          <div className="text-neutral-400 text-xs">Нийт хэсэг</div>
          <div className="font-bold text-sm text-white">{sheet.parts.length} ширхэг</div>
        </div>
        <div>
          <div className="text-neutral-400 text-xs">Ашигласан талбай</div>
          <div className="font-bold text-sm text-emerald-400">
            {(sheet.usedArea / 1000000).toFixed(2)} м²
          </div>
        </div>
        <div>
          <div className="text-neutral-400 text-xs">Хаягдал талбай</div>
          <div className="font-bold text-sm text-red-400">
            {(sheet.wasteArea / 1000000).toFixed(2)} м²
          </div>
        </div>
      </div>
    </div>
  );
};
export default CuttingCanvas;
