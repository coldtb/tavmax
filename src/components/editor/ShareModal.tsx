import React, { useState } from 'react';
import { X, Copy, Check, Send } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0c0d12]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#12141c] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <Send size={16} />
            <span className="text-sm font-bold text-white">Төсөл хуваалцах</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 text-center">
          <p className="text-xs text-neutral-400 leading-relaxed">
            Та энэхүү холбоосыг хуулж аван бусадтай хуваалцсанаар тэд таны зурсан 3D загварыг шууд нээж үзэх, өөртөө хуулан үргэлжлүүлэн засварлах боломжтой болно.
          </p>

          <div className="flex items-center gap-2 bg-neutral-900/60 border border-white/10 rounded-xl p-2.5 mt-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-xs text-neutral-300 outline-none select-all truncate font-mono"
            />
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-all shrink-0 cursor-pointer ${
                copied 
                  ? 'bg-emerald-500 text-neutral-950 scale-105' 
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-350 hover:text-white'
              }`}
              title={copied ? 'Хуулагдсан' : 'Холбоосыг хуулах'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          {copied && (
            <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
              ✓ Холбоосыг санах ойд амжилттай хууллаа!
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#12141c] border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold rounded-xl border border-white/5 transition-all cursor-pointer"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
};
