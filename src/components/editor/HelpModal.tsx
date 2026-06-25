import React, { useState } from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [helpTab, setHelpTab] = useState(0);

  if (!isOpen) return null;

  const TABS = [
    { icon: '📱', label: 'Ерөнхий заавар' },
    { icon: '🖱️', label: '3D Удирдлага' },
    { icon: '📦', label: 'Шүүгээ нэмэх' },
    { icon: '📐', label: 'Хэмжээ' },
    { icon: '🚪', label: 'Хаалга' },
    { icon: '📚', label: 'Тавиур' },
    { icon: '🎨', label: 'Өнгө & Материал' },
    { icon: '💾', label: 'Хадгалах' },
    { icon: '🏝️', label: 'Гал тогооны арал' },
    { icon: '☁️', label: 'Үүлэн хадгалалт & Сан' },
  ];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 font-sans">
      <div className="bg-[#0e1018] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#12141c] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <div>
              <h2 className="font-extrabold text-white text-sm">TavMax — Ашиглах заавар</h2>
              <p className="text-[10px] text-neutral-500">Бүх функцын тайлбар зурагтайгаар</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-all cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-0.5 px-3 pt-2.5 bg-[#12141c] shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setHelpTab(i)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 ${helpTab === i ? 'bg-[#1a1d28] text-amber-400 border-amber-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-[#1a1d28]" style={{ scrollbarWidth: 'thin' }}>
          {/* TAB 0 */}
          {helpTab === 0 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
                Аппликейшний үндсэн дэлгэцийн бүтэц болон удирдлагын хэсгүүдийн ерөнхий тайлбар:
              </p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-2 overflow-hidden flex justify-center">
                <img 
                  src="/templates/editor_guide_screenshot.png" 
                  alt="TavMax Editor Guide" 
                  className="rounded-lg max-h-[260px] w-full object-contain border border-white/10" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                  <span className="text-[10px] font-bold text-amber-400">1. Загварын цэс (Зүүн талд)</span>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Гал тогоо, шкаф зэрэг бэлэн хавтангуудын загварыг сонгож чирж оруулна.</p>
                </div>
                <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                  <span className="text-[10px] font-bold text-blue-400">2. 3D Удирдах дэлгэц (Төвд)</span>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Хулсаар тавилгаа бүх өнцгөөс эргүүлж, хаалгыг нээж, хэмжээг харна.</p>
                </div>
                <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                  <span className="text-[10px] font-bold text-emerald-400">3. Шүүгээний тохиргоо (Баруун талд)</span>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Сонгосон шүүгээний өргөн, өндөр, гүн, тавиур болон өнгийг засна.</p>
                </div>
                <div className="bg-[#12141c] rounded-lg p-2.5 border border-white/5">
                  <span className="text-[10px] font-bold text-purple-400">4. Багаж & Цэс (Дээд талд)</span>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Төслөө хадгалах, хэвлэж PDF авах, зүсэлт оновчлол харах товчлуурууд.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1 */}
          {helpTab === 1 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">3D дэлгэц дээр тавилгаа бүх өнцгөөс харж, эргүүлж, ойртуулах боломжтой. Хулганы доорх 3 товчлуур ашиглан бүрэн удирдана.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                  <defs>
                    <marker id="ha" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#d97706"/></marker>
                    <marker id="hb" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#3b82f6"/></marker>
                    <marker id="hc" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#10b981"/></marker>
                  </defs>
                  <rect x="15" y="15" width="54" height="80" rx="27" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                  <line x1="42" y1="15" x2="42" y2="62" stroke="#374151" strokeWidth="1.5"/>
                  <rect x="16" y="16" width="25" height="30" rx="12" fill="#d97706" opacity="0.85"/>
                  <text x="42" y="107" textAnchor="middle" fill="#9ca3af" fontSize="8">Зүүн товч</text>
                  <text x="42" y="118" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold">Эргүүлэх</text>
                  <path d="M78 45 Q98 28 118 45" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#ha)"/>
                  <path d="M78 65 Q98 82 118 65" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#ha)"/>
                  
                  <rect x="172" y="15" width="54" height="80" rx="27" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                  <line x1="199" y1="15" x2="199" y2="62" stroke="#374151" strokeWidth="1.5"/>
                  <rect x="200" y="16" width="25" height="30" rx="12" fill="#3b82f6" opacity="0.85"/>
                  <text x="199" y="107" textAnchor="middle" fill="#9ca3af" fontSize="8">Баруун товч</text>
                  <text x="199" y="118" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">Шилжүүлэх</text>
                  <path d="M234 52 L255 52" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#hb)"/>
                  <path d="M234 70 L255 70" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#hb)"/>
                  <path d="M244 44 L244 30" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#hb)"/>
                  
                  <rect x="329" y="15" width="54" height="80" rx="27" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                  <rect x="342" y="23" width="28" height="8" rx="4" fill="#10b981" opacity="0.9"/>
                  <text x="356" y="107" textAnchor="middle" fill="#9ca3af" fontSize="8">Скролл дугуй</text>
                  <text x="356" y="118" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">Ойртох / Холдох</text>
                  <text x="356" y="58" textAnchor="middle" fill="#10b981" fontSize="16">↕</text>
                  <text x="230" y="135" textAnchor="middle" fill="#a78bfa" fontSize="8">✌️ Шүүгээн дээр 2 дарах → Тохиргоо цонх нээгдэнэ</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['🔄', 'amber', 'Зүүн товч + чирэх', '3D загварыг дурын чиглэлд эргүүлнэ'],
                  ['🖐️', 'blue', 'Баруун товч + чирэх', 'Загварыг зүүн, баруун, дээш, доош шилжүүлнэ'],
                  ['🔍', 'emerald', 'Скролл дугуй', 'Дээш эргүүлбэл ойртоно, доош эргүүлбэл холдоно'],
                  ['✌️', 'purple', '2 дарах (Шүүгээн дээр)', 'Тухайн шүүгээний тохиргоо цонх нээгдэнэ'],
                  ['🖱️', 'rose', 'Баруун товч (1 дарах)', 'Тохируулах / Хувилах / Устгах цэс нээгдэнэ'],
                ].map(([icon, col, title, desc], i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{icon}</span>
                    <span className={`text-[10px] font-bold text-${col}-400 shrink-0`}>{title}:</span>
                    <span className="text-[10px] text-neutral-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2 */}
          {helpTab === 2 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">Зүүн талын загварын цэснээс шүүгээ сонгож 3D дэлгэц рүү нэмнэ. Чирж оруулах эсвэл товч дарж нэмж болно.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 150" className="w-full" style={{ maxHeight: 150 }}>
                  <defs><marker id="da" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#d97706"/></marker></defs>
                  <rect x="5" y="5" width="115" height="138" rx="7" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                  <text x="62" y="20" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ЗАГВАРЫН ЦЭС</text>
                  {[
                    ['Гал тогоо (Доод)', '600×750мм', true],
                    ['Гал тогоо (Дээд)', '600×700мм', false],
                    ['Шкаф', '800×2000мм', false]
                  ].map(([n, s, sel], i) => (
                    <g key={i}>
                      <rect x="12" y={28 + i * 38} width="101" height="32" rx="5" fill={sel ? '#1e3a5f' : '#12141c'} stroke={sel ? '#3b82f6' : '#374151'} strokeWidth={sel ? 1.5 : 1}/>
                      <rect x="16" y={32 + i * 38} width="14" height="24" rx="2" fill={sel ? '#2563eb' : '#1e2030'}/>
                      <text x="36" y={43 + i * 38} fill={sel ? '#93c5fd' : '#6b7280'} fontSize="7" fontWeight="bold">{n}</text>
                      <text x="36" y={53 + i * 38} fill="#4b5563" fontSize="6">{s}</text>
                    </g>
                  ))}
                  <path d="M122 72 L148 72" stroke="#d97706" strokeWidth="2" strokeDasharray="4,3" markerEnd="url(#da)"/>
                  <text x="135" y="65" textAnchor="middle" fill="#d97706" fontSize="7">чирэх</text>
                  <rect x="152" y="5" width="190" height="138" rx="7" fill="#12141c" stroke="#374151" strokeWidth="1.5"/>
                  <text x="247" y="20" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">3D ДЭЛГЭЦ</text>
                  <rect x="160" y="62" width="55" height="72" rx="3" fill="#1e2030" stroke="#3b82f6" strokeWidth="1.5"/>
                  <rect x="163" y="65" width="49" height="35" rx="2" fill="#3b82f6" opacity="0.08"/>
                  <line x1="187" y1="65" x2="187" y2="100" stroke="#3b82f6" opacity="0.2" strokeWidth="1"/>
                  <rect x="160" y="35" width="55" height="25" rx="3" fill="#1e2030" stroke="#4b5563" strokeWidth="1"/>
                  <rect x="225" y="45" width="60" height="89" rx="3" fill="#1e2030" stroke="#d97706" strokeWidth="2"/>
                  <text x="255" y="91" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold">ШИНЭ</text>
                  <rect x="355" y="5" width="98" height="138" rx="7" fill="#12141c" stroke="#374151" strokeWidth="1.5"/>
                  <text x="404" y="22" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">НЭМЭХ ТОВЧ</text>
                  <rect x="365" y="32" width="78" height="20" rx="5" fill="#d97706"/>
                  <text x="404" y="45" textAnchor="middle" fill="#0a0a0a" fontSize="7" fontWeight="bold">+ НЭМЭХ</text>
                  <rect x="365" y="58" width="78" height="20" rx="5" fill="#1e2030" stroke="#4b5563"/>
                  <text x="404" y="71" textAnchor="middle" fill="#9ca3af" fontSize="7">Зэрэгцүүлэх</text>
                  <rect x="365" y="84" width="78" height="20" rx="5" fill="#1e2030" stroke="#4b5563"/>
                  <text x="404" y="97" textAnchor="middle" fill="#9ca3af" fontSize="7">Устгах</text>
                  <rect x="365" y="110" width="78" height="20" rx="5" fill="#1e2030" stroke="#4b5563"/>
                  <text x="404" y="123" textAnchor="middle" fill="#9ca3af" fontSize="7">Бүгдийг устгах</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['1', 'Загварын цэс', 'Зүүн талын гулсах цэснээс шүүгээний төрлийг сонгоно (Гал тогоо доод/дээд, Шкаф, Шургуулга гэх мэт)'],
                  ['2', 'Чирж оруулах', 'Сонгосон загварыг 3D дэлгэц рүү чирж тавина — шинэ шүүгээ тухайн байрт гарч ирнэ'],
                  ['3', '«+ Нэмэх» товч', 'Дэлгэцийн дээд хэсгийн «+ Нэмэх» товчоор сонгогдсон шүүгээний хажууд автоматаар нэмнэ'],
                  ['4', 'Байрлуулах', 'Нэмэгдсэн шүүгээг хулганаар чирж байрлуулна. «Зэрэгцүүлэх» товч бүгдийг нэг шугамд тэгшилнэ'],
                ].map(([n, t, d]) => (
                  <div key={n} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <div className="w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3 */}
          {helpTab === 3 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">Шүүгээний өргөн (W), өндөр (H), гүнийг (D) нарийвчлан тохируулна. Слайдер чирэх эсвэл тоо шууд бичнэ.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 148" className="w-full" style={{ maxHeight: 148 }}>
                  <rect x="20" y="18" width="130" height="122" rx="4" fill="#1e2030" stroke="#374151" strokeWidth="1.5"/>
                  <line x1="20" y1="10" x2="150" y2="10" stroke="#d97706" strokeWidth="1.5"/>
                  <line x1="20" y1="6" x2="20" y2="14" stroke="#d97706" strokeWidth="1.5"/>
                  <line x1="150" y1="6" x2="150" y2="14" stroke="#d97706" strokeWidth="1.5"/>
                  <text x="85" y="7" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold">Өргөн (W)</text>
                  <line x1="10" y1="18" x2="10" y2="140" stroke="#3b82f6" strokeWidth="1.5"/>
                  <line x1="6" y1="18" x2="14" y2="18" stroke="#3b82f6" strokeWidth="1.5"/>
                  <line x1="6" y1="140" x2="14" y2="140" stroke="#3b82f6" strokeWidth="1.5"/>
                  <text x="3" y="82" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold" transform="rotate(-90, 3, 82)">Өндөр (H)</text>
                  <line x1="150" y1="18" x2="175" y2="4" stroke="#10b981" strokeWidth="1.5"/>
                  <text x="188" y="7" fill="#10b981" fontSize="8" fontWeight="bold">Гүн (D)</text>
                  <rect x="25" y="140" width="10" height="5" rx="2" fill="#4b5563"/>
                  <rect x="135" y="140" width="10" height="5" rx="2" fill="#4b5563"/>
                  <text x="85" y="148" textAnchor="middle" fill="#6b7280" fontSize="7">Хөлтэй горим</text>
                  <rect x="192" y="5" width="263" height="138" rx="8" fill="#12141c" stroke="#374151" strokeWidth="1.5"/>
                  <text x="323" y="22" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">АЛХАМ 1 — ИХ БИЕ</text>
                  {[
                    {l:'Өргөн (W)', v:'600мм', c:'#d97706', pct:0.5, y:32},
                    {l:'Өндөр (H)', v:'750мм', c:'#3b82f6', pct:0.63, y:60},
                    {l:'Гүн (D)', v:'560мм', c:'#10b981', pct:0.4, y:88}
                  ].map(f=>(
                    <g key={f.y}>
                      <text x="202" y={f.y+2} fill="#9ca3af" fontSize="7">{f.l}</text>
                      <rect x="202" y={f.y+6} width="243" height="12" rx="6" fill="#1a1d28"/>
                      <rect x="202" y={f.y+6} width={243*f.pct} height="12" rx="6" fill={f.c} opacity="0.3"/>
                      <circle cx={202+243*f.pct} cy={f.y+12} r="6" fill={f.c}/>
                      <text x="443" y={f.y+14} textAnchor="end" fill={f.c} fontSize="7" fontWeight="bold">{f.v}</text>
                    </g>
                  ))}
                  <text x="202" y="118" fill="#6b7280" fontSize="7">✏️ Слайдер чирэх эсвэл талбарт тоо бичих</text>
                  <rect x="202" y="122" width="243" height="15" rx="5" fill="#1a1d28" stroke="#374151"/>
                  <text x="323" y="133" textAnchor="middle" fill="#9ca3af" fontSize="7">600</text>
                  <text x="437" y="133" textAnchor="end" fill="#6b7280" fontSize="7">мм</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['📏', 'Өргөн (W)', 'Шүүгээний хэвтэх зай. Гал тогоо: 300–1200мм. Шкаф: 600–1200мм'],
                  ['📐', 'Өндөр (H)', 'Дэлгэрэнгүй: Гал тогооны доод 750мм, дээд 700мм. Шкаф: 1800–2400мм'],
                  ['📦', 'Гүн (D)', 'Стандарт: Доод шүүгээ 560мм, дээд 300мм. Шкаф: 550–600мм'],
                  ['🦵', 'Хөл нэмэх', '«Хөлтэй» сонгоход 100мм хөлийн өндөр нэмэгдэж, кабинет 100мм өргөгдөнө'],
                  ['🔢', 'Тоо шууд бичих', 'Слайдерын баруун талд байгаа хайрцагт тоо бичиж ENTER дарна — хамгийн нарийвчлалтай аргачлал'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4 */}
          {helpTab === 4 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">«Нүүр/Өнго» алхамд хаалганы тоо, загвар болон хэлбэрийг тохируулна. «Тус бүрээр тохируулах» горимд зүүн/баруун хаалгыг тусад нь тохируулж болно.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 138" className="w-full" style={{ maxHeight: 138 }}>
                  <rect x="5" y="8" width="80" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  <rect x="9" y="12" width="72" height="102" rx="3" fill="#d97706" opacity="0.1" stroke="#d97706" strokeWidth="1"/>
                  <circle cx="73" cy="63" r="3.5" fill="#d97706" opacity="0.7"/>
                  <text x="45" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">1 хаалга</text>

                  <rect x="97" y="8" width="100" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  <rect x="101" y="12" width="43" height="102" rx="3" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="1"/>
                  <rect x="149" y="12" width="43" height="102" rx="3" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="1"/>
                  <circle cx="140" cy="63" r="3.5" fill="#3b82f6" opacity="0.7"/>
                  <circle cx="153" cy="63" r="3.5" fill="#3b82f6" opacity="0.7"/>
                  <text x="147" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">2 хаалга</text>

                  <rect x="210" y="8" width="110" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  <text x="240" y="55" fill="#4b5563" fontSize="8">хаалга</text>
                  <text x="240" y="65" fill="#4b5563" fontSize="8">байхгүй</text>
                  <line x1="265" y1="10" x2="265" y2="116" stroke="#374151" strokeWidth="1" strokeDasharray="3,2"/>
                  <rect x="268" y="12" width="24" height="102" rx="3" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1"/>
                  <rect x="294" y="12" width="22" height="102" rx="3" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1"/>
                  <circle cx="266" cy="63" r="3.5" fill="#10b981" opacity="0.7"/>
                  <circle cx="292" cy="63" r="3.5" fill="#10b981" opacity="0.7"/>
                  <text x="265" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">Зүүн=0, Баруун=2</text>

                  <rect x="333" y="8" width="122" height="110" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  <rect x="337" y="12" width="52" height="102" rx="3" fill="#60a5fa" opacity="0.06" stroke="#60a5fa" strokeWidth="1"/>
                  <rect x="350" y="22" width="12" height="82" rx="2" fill="#93c5fd" opacity="0.18"/>
                  <rect x="397" y="12" width="52" height="102" rx="3" fill="#60a5fa" opacity="0.06" stroke="#60a5fa" strokeWidth="1"/>
                  <rect x="410" y="22" width="12" height="82" rx="2" fill="#93c5fd" opacity="0.18"/>
                  <text x="394" y="130" textAnchor="middle" fill="#9ca3af" fontSize="7">Шилэн хаалга</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['🔢', 'Хаалганы тоо', '+ / − товчоор нийт хаалганы тоог тохируулна. 0 = хаалгагүй'],
                  ['✅', 'Тус бүрээр тохируулах', 'Нүдийг чагталбал зүүн/баруун хаалгыг тусад нь тохируулна. Зүүн=1, Баруун=2 гэх мэт'],
                  ['🪟', 'Шилэн хаалга', 'Хаалганы дотор шил хийж харуулна. Тухайн шүүгээний «Шилэн хаалга» чагтлаад идэвхжүүлнэ'],
                  ['🎨', 'Хавтгай vs Классик', '«ХАВТГАЙ» = орчин үеийн цэвэр загвар. «КЛАССИК» = дунд дэвсгэртэй уламжлалт хаалга'],
                  ['🚗', 'Автомат өргөн', 'Хаалганы өргөн секцийн хэмжээнд тааруулан автоматаар тооцоологдоно'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5 */}
          {helpTab === 5 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">«Дотор» алхамд тавиур, хуваалт, шургуулга нэмж дотор орон зайг тохируулна. 3D-д хулганаар чирж байрлуулж болно.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                  <rect x="5" y="5" width="120" height="130" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  {[38, 75, 112].map((y, i) => (
                    <g key={i}>
                      <rect x="9" y={y} width="112" height="7" rx="2" fill="#d97706" opacity={i===1?0.55:0.25} stroke="#d97706" strokeWidth={i===1?1:0}/>
                    </g>
                  ))}
                  <path d="M65 75 L65 55" stroke="#d97706" strokeWidth="1" strokeDasharray="3,2"/>
                  <text x="65" y="50" textAnchor="middle" fill="#d97706" fontSize="7">↕ чирэх</text>
                  <text x="65" y="138" textAnchor="middle" fill="#9ca3af" fontSize="7">3 тавиур</text>
                  
                  <rect x="140" y="5" width="120" height="130" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  <rect x="195" y="9" width="6" height="122" rx="2" fill="#3b82f6" opacity="0.45"/>
                  <text x="165" y="72" textAnchor="middle" fill="#6b7280" fontSize="7">Зүүн</text>
                  <text x="165" y="82" textAnchor="middle" fill="#6b7280" fontSize="7">секц</text>
                  <text x="225" y="72" textAnchor="middle" fill="#6b7280" fontSize="7">Баруун</text>
                  <text x="225" y="82" textAnchor="middle" fill="#6b7280" fontSize="7">секц</text>
                  <path d="M198 30 L215 30" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2"/>
                  <text x="216" y="33" fill="#3b82f6" fontSize="6">↔ чирэх</text>
                  <text x="200" y="138" textAnchor="middle" fill="#9ca3af" fontSize="7">1 хуваалт</text>
                  
                  <rect x="275" y="5" width="120" height="130" rx="4" fill="#1e2030" stroke="#4b5563" strokeWidth="1.5"/>
                  {[0,1,2].map(i=>(
                    <g key={i}>
                      <rect x="279" y={10+i*42} width="112" height="36" rx="3" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="1"/>
                      <line x1="300" y1={29+i*42} x2="370" y2={29+i*42} stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                    </g>
                  ))}
                  <text x="335" y="138" textAnchor="middle" fill="#9ca3af" fontSize="7">3 шургуулга</text>
                  <text x="395" y="30" fill="#d97706" fontSize="8">← Тавиур</text>
                  <text x="395" y="72" fill="#3b82f6" fontSize="8">← Хуваалт</text>
                  <text x="395" y="100" fill="#10b981" fontSize="8">← Шургуулга</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['📚', 'Тавиур', '«Дотор» алхамд «Тавиурын тоо» слайдераар тохируулна. 3D-д тавиурыг чирж өндрийг өөрчилнэ'],
                  ['⬛', 'Хуваалт (Секц)', 'Шүүгээний дотор босоо хуваах хавтан. 3D-д хавтан чирж байрлалыг өөрчилнэ'],
                  ['🗄️', 'Шургуулга', 'Дотоод татаж нээдэг шургуулга. Хаалгатай хамт ашиглах боломжтой'],
                  ['📐', 'Хуваарилалт', 'Олон секцтэй үед тавиур тэнцүү хуваарилагдана. Секц бүр тусад нь тавиуртай болно'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6 */}
          {helpTab === 6 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">Их биеийн болон хаалганы өнгийг «Нүүр/Өнго» болон «Дотор» алхамаас тохируулна. Бэлэн өнгө эсвэл дурын hex өнгө оруулж болно.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                  <rect x="5" y="5" width="215" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                  <text x="112" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ИХ БИЕИЙН МАТЕРИАЛ</text>
                  {[{x:25,c:'#f5f5f5',s:'#d1d5db',n:'Цагаан'},{x:65,c:'#c19a6b',s:'#a0785a',n:'Шар мод'},{x:105,c:'#1f2937',s:'#374151',n:'Хар'},{x:145,c:'#8b5a2b',s:'#7a4f26',n:'Гагнуур'},{x:185,c:'#e5dfd3',s:'#c8c0b2',n:'Кrem'}].map(s=>(
                    <g key={s.x}><circle cx={s.x} cy={60} r={17} fill={s.c} stroke={s.s} strokeWidth="1.5"/><text x={s.x} y={88} textAnchor="middle" fill="#9ca3af" fontSize="6">{s.n}</text></g>
                  ))}
                  <rect x="10" y="98" width="205" height="18" rx="5" fill="#12141c" stroke="#374151"/>
                  <text x="50" y="110" fill="#6b7280" fontSize="7">#</text>
                  <text x="65" y="110" fill="#d97706" fontSize="7">ffffff</text>
                  <text x="160" y="110" fill="#6b7280" fontSize="6">↩ Дурын өнгө</text>
                  <text x="112" y="128" textAnchor="middle" fill="#4b5563" fontSize="6">★ Хадгалах — дараа дахин ашиглах</text>
                  
                  <rect x="235" y="5" width="220" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                  <text x="345" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ХААЛГАНЫ МАТЕРИАЛ</text>
                  {[{x:255,c:'#d97706',s:'#b45309',n:'Алтан'},{x:295,c:'#fafafa',s:'#e5e7eb',n:'Цагаан'},{x:335,c:'#111827',s:'#374151',n:'Хар'},{x:375,c:'#2563eb',s:'#1d4ed8',n:'Цэнхэр'},{x:415,c:'#c19a6b',s:'#a0785a',n:'Мод'}].map(s=>(
                    <g key={s.x}><circle cx={s.x} cy={60} r={17} fill={s.c} stroke={s.s} strokeWidth="1.5"/><text x={s.x} y={88} textAnchor="middle" fill="#9ca3af" fontSize="6">{s.n}</text></g>
                  ))}
                  <text x="345" y="108" textAnchor="middle" fill="#6b7280" fontSize="7">Их биеийн өнгөнөөс</text>
                  <text x="345" y="118" textAnchor="middle" fill="#6b7280" fontSize="7">тусад нь тохируулна</text>
                  <text x="345" y="130" textAnchor="middle" fill="#4b5563" fontSize="6">«Классик» = автоматаар MDF цагаан</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['🪵', 'Бэлэн өнгө', 'Дэлгэцэд гарах өнгийн жагсаалтаас нэгийг сонгоно — тухайн шүүгээний материал шууд өөрчлөгдөнө'],
                  ['🎨', 'Дурын өнгө', 'Hex кодоор (#ff5733) эсвэл өнгийн спектрт дарж дурын өнгийг оруулна'],
                  ['💾', 'Өнгө хадгалах', '«☆ Хадгалах» товч дарж дурын өнгөө хадгаллаа. Цаашид хурдан сонгоход ашиглана'],
                  ['🚪', 'Хаалганы өнгө', 'Их биеийн өнгөнөөс тусад нь хаалганы өнгийг тохируулна. «Классик» загварт цагаан MDF автомат болно'],
                  ['📦', 'Хувийн материал', '«Материалын сан» цэсэнд үүсгэсэн өөрийн материалууд өнгө сонгох хэсэгт автоматаар нэмэгдэж орно.'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7 */}
          {helpTab === 7 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">Зохион бүтээсэн тавилгаа хадгалах, экспорт хийх, хэвлэх боломжтой.</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                  <rect x="5" y="5" width="130" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                  <text x="70" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">БАЙРЛАЛ ХАДГАЛАХ</text>
                  <rect x="12" y="28" width="116" height="20" rx="5" fill="#d97706" opacity="0.9"/>
                  <text x="70" y="41" textAnchor="middle" fill="#0a0a0a" fontSize="7" fontWeight="bold">💾  Хадгалах</text>
                  {['🏠 Гал тогоо 1', '🛋️ Зочны өрөө', '🛏️ Унтлага'].map((t,i)=>(
                    <g key={i}>
                      <rect x="12" y={54+i*22} width="116" height="18" rx="4" fill={i===0?'#1e3a5f':'#12141c'} stroke={i===0?'#3b82f6':'#374151'} strokeWidth="1"/>
                      <text x="20" y={66+i*22} fill={i===0?'#93c5fd':'#6b7280'} fontSize="7">{t}</text>
                    </g>
                  ))}
                  <text x="70" y="126" textAnchor="middle" fill="#4b5563" fontSize="6">«Ачаалах» дарж сэргээнэ</text>
                  
                  <rect x="148" y="5" width="145" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                  <text x="220" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ХУВИЛАХ & ЗАГВАР</text>
                  <rect x="155" y="28" width="131" height="20" rx="5" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1"/>
                  <text x="220" y="41" textAnchor="middle" fill="#10b981" fontSize="7" fontWeight="bold">👯 Шүүгээ хувилах</text>
                  <rect x="155" y="54" width="131" height="20" rx="5" fill="#a855f7" opacity="0.15" stroke="#a855f7" strokeWidth="1"/>
                  <text x="220" y="67" textAnchor="middle" fill="#a855f7" fontSize="7" fontWeight="bold">⭐ Загвар болгон хадгалах</text>
                  <text x="220" y="92" textAnchor="middle" fill="#6b7280" fontSize="6">Хадгалсан загвар</text>
                  <text x="220" y="102" textAnchor="middle" fill="#6b7280" fontSize="6">«Миний загварууд»</text>
                  <text x="220" y="112" textAnchor="middle" fill="#6b7280" fontSize="6">хэсэгт харагдана</text>
                  
                  <rect x="306" y="5" width="149" height="130" rx="8" fill="#1a1d28" stroke="#374151" strokeWidth="1.5"/>
                  <text x="380" y="21" textAnchor="middle" fill="#6b7280" fontSize="7" fontWeight="bold">ЭКСПОРТ</text>
                  {[{c:'#d97706',t:'🖨️ Хэвлэх / PDF',y:28},{c:'#3b82f6',t:'📋 Бэлдцийн жагсаалт',y:56},{c:'#10b981',t:'✂️ Зүсэлт оновчлол',y:84},{c:'#6b7280',t:'📸 3D зураг хадгалах',y:112}].map(e=>(
                    <g key={e.y}>
                      <rect x="313" y={e.y} width="135" height="22" rx="5" fill={`${e.c}18`} stroke={e.c} strokeWidth="1" opacity="0.75"/>
                      <text x="380" y={e.y+14} textAnchor="middle" fill={e.c} fontSize="7" fontWeight="bold">{e.t}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['💾', 'Байрлал хадгалах', 'Дэлгэцийн дээд баруун хэсгийн «💾 Хадгалах» товч. Бүх шүүгээний байрлал хадгалагдана'],
                  ['👯', 'Шүүгээ хувилах', 'Шүүгээн дээр баруун товч дарж «Хувилах» сонгоно — адилхан шүүгээ хажууд нэмэгдэнэ'],
                  ['⭐', 'Загвар болгох', 'Тохируулсан шүүгээг загвар болгон хадгаллаа. Ирээдүйд «Миний загварууд»-аас ашиглана'],
                  ['🖨️', 'Хэвлэх / PDF', '«Хэвлэх» товчоор техникийн хуудас + бэлдцийн жагсаалт PDF болж хадгалагдана'],
                  ['✂️', 'Зүсэлт оновчлол', '«Зүсэлт» хуудасруу орж хавтангуудыг хамгийн хэмнэлттэй зүсэх схемийг харна'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg p-2.5">
                  <p className="text-[10px] text-amber-300">💡 <strong>Зөвлөмж:</strong> Хэзээ ч ажил тань устахгүй, систем секунд бүрт орон нутгийн санд автоматаар давхар хадгалж байдаг.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8 */}
          {helpTab === 8 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">Гал тогооны арал (Kitchen Island) загвар нь орон зайн шинэлэг шийдэл бүхий дараах өвөрмөц онцлогуудтай:</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 480 160" className="w-full" style={{ maxHeight: 160 }}>
                  <defs>
                    <marker id="red-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#ef4444"/></marker>
                    <marker id="purple-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#a78bfa"/></marker>
                  </defs>
                  
                  <g transform="translate(10, 5)">
                    <text x="105" y="15" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="bold">УРД ХАРАГДАЦ (НҮҮР)</text>
                    <rect x="15" y="25" width="180" height="12" rx="2" fill="#c29b69" stroke="#b45309" strokeWidth="0.5"/>
                    <rect x="15" y="37" width="12" height="93" fill="#c29b69" stroke="#b45309" strokeWidth="0.5"/>
                    <rect x="183" y="37" width="12" height="93" fill="#c29b69" stroke="#b45309" strokeWidth="0.5"/>
                    <rect x="27" y="37" width="156" height="93" fill="#1e2030" stroke="#374151" strokeWidth="1"/>
                    <rect x="31" y="41" width="72" height="82" rx="2" fill="#faf9f6" opacity="0.9" stroke="#d1d5db" strokeWidth="0.5"/>
                    <circle cx="93" cy="82" r="2.5" fill="#171717"/>
                    <rect x="107" y="41" width="72" height="82" rx="2" fill="#faf9f6" opacity="0.9" stroke="#d1d5db" strokeWidth="0.5"/>
                    <circle cx="117" cy="82" r="2.5" fill="#171717"/>
                    <text x="105" y="145" textAnchor="middle" fill="#6b7280" fontSize="7">Waterfall хажуу хананы дотор орсон хаалганууд</text>
                  </g>

                  <g transform="translate(240, 5)">
                    <text x="110" y="15" textAnchor="middle" fill="#9ca3af" fontSize="8" fontWeight="bold">ХАЖУУГИЙН ОГТЛОЛ (ЗҮСЭЛТ)</text>
                    <rect x="30" y="25" width="160" height="12" rx="2" fill="#c29b69" stroke="#b45309" strokeWidth="0.5"/>
                    <rect x="172" y="37" width="8" height="93" fill="#4b5563" stroke="#374151" strokeWidth="1"/>
                    <rect x="38" y="37" width="8" height="83" fill="#faf9f6" stroke="#d1d5db" strokeWidth="1"/>
                    <rect x="46" y="120" width="126" height="10" fill="#1e2030" stroke="#374151" strokeWidth="1"/>
                    <rect x="46" y="78" width="126" height="6" fill="#1e2030" opacity="0.5" stroke="#374151" strokeWidth="0.5"/>
                    
                    <line x1="30" y1="37" x2="30" y2="135" stroke="#ef4444" strokeWidth="0.75" strokeDasharray="3,2"/>
                    <line x1="190" y1="37" x2="190" y2="135" stroke="#a78bfa" strokeWidth="0.75" strokeDasharray="3,2"/>
                    
                    <path d="M30 50 L38 50" stroke="#ef4444" strokeWidth="1" markerEnd="url(#red-arrow)"/>
                    <text x="26" y="53" textAnchor="end" fill="#ef4444" fontSize="6" fontWeight="bold">18mm суулгац</text>
                    
                    <path d="M190 50 L182 50" stroke="#a78bfa" strokeWidth="1" markerEnd="url(#purple-arrow)"/>
                    <text x="194" y="53" textAnchor="start" fill="#a78bfa" fontSize="6" fontWeight="bold">18mm хаалт</text>
                    
                    <text x="32" y="90" textAnchor="end" fill="#faf9f6" fontSize="6.5">Хаалга (Дотроо)</text>
                    <text x="166" y="105" textAnchor="start" fill="#a78bfa" fontSize="6.5">Арын хаалт (Битүү)</text>
                    <text x="110" y="145" textAnchor="middle" fill="#6b7280" fontSize="7">Дотор талын хавтангуудын гүнийг багасгасан</text>
                  </g>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['🏝️', 'Waterfall Хажуу хананууд', 'Арлын хоёр хажуу хана нь оройн тавцангийн материалаар шал хүртэл үргэлжилнэ. Хөлийн өндөр орохгүй.'],
                  ['🚪', 'Дотогш суулгасан хаалга (Recessed)', 'Хаалганууд нь арлын хажуу хавтан болон оройн тавцангийн дотор талд байрлах тул мөргөлдөхгүй.'],
                  ['🪵', 'Их биеийн хаалт хавтан (Closed Back)', 'Шүүгээний арын ил задгай хэсгийг 18мм зузаантай их биеийн үндсэн материалаар бүрэн битүүлнэ.'],
                  ['🪓', 'Судасны чиглэл (Grain Direction)', 'Оройн тавцангийн модны хээний судас хэвтээ, Waterfall хавтангуудын судас босоо чиглэлтэй байна.'],
                  ['⚙️', 'Динамик хэсгүүдийн бодолт', 'Хаалга болон арын хаалт орсон тул доторх тавиур, шургуулганы гүн автоматаар 36мм-ээр багасч тооцогдоно.'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9 */}
          {helpTab === 9 && (
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">Систем дээрх таны хийсэн бүх ажил үүлэн серверт автоматаар хадгалагдаж сэргээгдэнэ:</p>
              <div className="bg-[#12141c] rounded-xl border border-white/5 p-3">
                <svg viewBox="0 0 460 140" className="w-full" style={{ maxHeight: 140 }}>
                  <rect x="30" y="25" width="100" height="70" rx="6" fill="#1e2030" stroke="#3b82f6" strokeWidth="1.5"/>
                  <rect x="40" y="32" width="80" height="42" rx="2" fill="#12141c"/>
                  <circle cx="80" cy="86" r="4" fill="#3b82f6"/>
                  <text x="80" y="108" textAnchor="middle" fill="#3b82f6" fontSize="7" fontWeight="bold">Төхөөрөмж / Утас</text>
                  
                  <text x="175" y="55" fill="#10b981" fontSize="16">⇄</text>
                  <text x="175" y="70" textAnchor="middle" fill="#10b981" fontSize="7">Синк хийх</text>

                  <path d="M230 65 C220 65, 215 55, 225 45 C220 30, 240 25, 250 35 C260 25, 280 30, 275 45 C285 55, 280 65, 270 65 Z" fill="#10b981" opacity="0.85"/>
                  <text x="250" y="80" textAnchor="middle" fill="#10b981" fontSize="7" fontWeight="bold">Үүлэн сервер (Supabase)</text>
                  
                  <rect x="330" y="20" width="100" height="80" rx="6" fill="#1a1d28" stroke="#a855f7" strokeWidth="1.5"/>
                  <text x="380" y="32" textAnchor="middle" fill="#a855f7" fontSize="7" fontWeight="bold">Төсөл & Материалууд</text>
                  <rect x="338" y="42" width="84" height="10" rx="2" fill="#12141c"/>
                  <circle cx="344" cy="47" r="2" fill="#10b981"/>
                  <rect x="338" y="58" width="84" height="10" rx="2" fill="#12141c"/>
                  <circle cx="344" cy="63" r="2" fill="#3b82f6"/>
                  <rect x="338" y="74" width="84" height="10" rx="2" fill="#12141c"/>
                  <circle cx="344" cy="79" r="2" fill="#a855f7"/>

                  <text x="380" y="112" textAnchor="middle" fill="#a855f7" fontSize="7">Утасны дугаараар нэвтрэх</text>
                </svg>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ['☁️', 'Үүлэн хадгалалт', 'Зурсан төслүүд таны утасны дугаар дээр автоматаар үүлэн серверт хадгалагдана. Хэзээ ч хаанаас ч хандах боломжтой.'],
                  ['🟢', 'Холболтын төлөв', 'Дээд цэсэнд CLOUD (Ногоон) байна уу эсвэл LOCAL (Шар) байна уу гэдгээр үүлэн холболтын төлөвийг шууд хянаж болно.'],
                  ['🎨', 'Хувийн материалын сан', '«Материалын сан» цэсээс ашиглах хавтангийн шинэ өнгө, зузаан, үнэ зэргийг өөрөө үүсгэж төсөлдөө хэрэглэнэ.'],
                  ['🔄', 'Хуудас шинэчлэх', 'Хуудсыг дахин ачаалахад (reload) таны ажил хэзээ ч устахгүй, идэвхтэй төсөл болон материалууд автоматаар сэргэнэ.'],
                ].map(([ic, t, d]) => (
                  <div key={t} className="flex gap-2 items-start bg-[#12141c] rounded-lg px-3 py-2 border border-white/5">
                    <span className="text-sm shrink-0">{ic}</span>
                    <div><span className="text-[10px] font-bold text-white">{t}: </span><span className="text-[10px] text-neutral-400">{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-white/8 bg-[#0e1018] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            {TABS.map((_, i) => (
              <button key={i} onClick={() => setHelpTab(i)} className={`transition-all cursor-pointer rounded-full ${helpTab === i ? 'bg-amber-400 w-4 h-1.5' : 'bg-neutral-700 hover:bg-neutral-500 w-1.5 h-1.5'}`}/>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {helpTab > 0 && (
              <button onClick={() => setHelpTab(h => h - 1)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-350 text-[10px] font-bold rounded-lg transition-all cursor-pointer border border-white/5">
                ← Өмнөх
              </button>
            )}
            {helpTab < TABS.length - 1 ? (
              <button onClick={() => setHelpTab(h => h + 1)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                Дараах →
              </button>
            ) : (
              <button onClick={onClose} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer">
                ✓ Ойлголоо
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
