import React, { useState } from "react";
import { MessageCircle, X, ChevronLeft, HelpCircle, BookOpen, Wrench, Layers, CreditCard } from "lucide-react";

interface FAQNode {
  title: string;
  content?: string;
  children?: Record<string, FAQNode>;
}

const FAQ_TREE: Record<string, FAQNode> = {
  "3d-editor": {
    title: "🛠️ 3D Засварлагч ашиглах",
    children: {
      "add-cabinet": {
        title: "Шүүгээ хэрхэн нэмэх вэ?",
        content: "**Шүүгээ шинээр нэмэх заавар:**\n\n1. Зүүн талын цэсний **\"Загвар\"** таб руу орно.\n2. Бэлэн шүүгээнүүдийн жагсаалтаас сонгож, **\"Нэмэх\"** товчлуур дээр дарна.\n3. Эсвэл шүүгээг 3D дэлгэц рүү шууд **чирж оруулах (Drag & Drop)** боломжтой.\n4. Нэмэгдсэн шүүгээг зөөхдөө хулганаар чирж байршлыг өөрчилнө."
      },
      "edit-size": {
        title: "Хэмжээг хэрхэн өөрчлөх вэ?",
        content: "**Шүүгээний хэмжээс өөрчлөх:**\n\n1. 3D дэлгэц дээрх шүүгээн дээрээ **давхар товших (double click)** үйлдэл хийнэ.\n2. Гар утас/таблет дээр автоматаар **\"Тохиргоо\"** таб нээгдэх бөгөөд desktop дээр баруун талын **\"Шүүгээний тохиргоо\"** хэсэгт мэдээлэл нээгдэнэ.\n3. Мөн дэлгэцийн доод хэсэгт байрлах **Properties Panel**-оос өргөн, өндөр, гүнийг шууд өөрчлөх боломжтой."
      },
      "navigation": {
        title: "3D орчныг хэрхэн удирдах вэ?",
        content: "**3D Viewport-ийн удирдлага:**\n\n* **Эргүүлэх**: Хулганы зүүн товчийг даран чирнэ.\n* **Зөөх / Харах өнцөг өөрчлөх**: Хулганы баруун товчийг даран чирнэ эсвэл Shift-ийг даран зүүн товчоор чирнэ.\n* **Ойртуулах / Холдуулах**: Хулганы дунд дугуйг (scroll) ашиглана.\n* **Шуурхай харагдац**: Дээд талын Ribbon цэснээс 3D, Урдаас, Дээрээс, Хажуугаас харах горимуудыг шууд сонгох боломжтой."
      },
      "save-layout": {
        title: "Төслийг хэрхэн хадгалах вэ?",
        content: "**Төсөл хадгалах заавар:**\n\n* Таны хийсэн бүх өөрчлөлт үүлэн серверт (**Cloud**) автоматаар болон секунд тутамд орон нутгийн санд (**Local Storage**) хадгалагддаг.\n* Мөн дээд Ribbon цэснээс **\"Хадгалах\"** товчийг дарснаар тухайн төслийн одоогийн төлөв байдлыг Snapshot болгон хадгалж, дараа нь зүүн цэсний \"Загвар\" -> \"Хадгалсан төслүүд\"-ээс сэргээж болно."
      }
    }
  },
  "materials": {
    title: "🪵 Материалын сан удирдах",
    children: {
      "add-material": {
        title: "Шинэ өнгө, үнэ хэрхэн нэмэх вэ?",
        content: "**Материал шинээр бүртгэх:**\n\n1. Үндсэн цэснээс **\"Материал\"** хуудас руу орно.\n2. Баруун дээд буланд байх **\"Шинэ материал нэмэх\"** товчийг дарна.\n3. Материалын нэр, зузаан (жишээ нь: 18мм), нэг хуудас хавтангийн үнэ, хавтангийн өнгө (RGB эсвэл зураг) зэргийг оруулаад **\"Хадгалах\"** товч дарна.\n4. Үүний дараа 3D засварлагчийн шүүгээний тохиргооноос тухайн шинэ материалыг сонгон хэрэглэж болно."
      },
      "edit-cabinet-material": {
        title: "Шүүгээний материалыг хэрхэн солих вэ?",
        content: "**Шүүгээний материал өөрчлөх:**\n\n1. Шүүгээг сонгоод тохиргооны баруун цонх руу орно.\n2. Сонгосон шүүгээний тохиргооны **3-р алхам болох \"Нүүр / Өнгө\"** хэсэг рүү шилжинэ.\n3. Эндээс **их биений материал** болон **хаалганы материал**-ыг өөрийн бүртгэсэн материалын сангаас сонгож өөрчилнө."
      }
    }
  },
  "nesting": {
    title: "📐 Зүсэлт оновчлол (Nesting)",
    children: {
      "sheet-size": {
        title: "Хавтангийн хэмжээ солих",
        content: "**Хавтангийн хэмжээ тохируулах:**\n\n1. Үндсэн цэснээс **\"Зүсэлт оновчлол\"** хуудас руу шилжинэ.\n2. Зүүн талын \"Хавтангийн хэмжээ\" хэсгээс тохирох стандарт хэмжээг сонгоно:\n   * **2440 x 1220 мм** (Жижиг фанер хавтан)\n   * **2750 x 1830 мм** (Стандарт ЛДСП хавтан)\n   * **3050 x 1830 мм** (Том хэмжээт хавтан)\n3. Сонгосон хэмжээний дагуу алгоритм зүсэлтийн хавтанд хуваарилах зургийг шууд шинэчилнэ."
      },
      "kerf": {
        title: "Хөрөөний ир (Kerf) тохируулах",
        content: "**Хөрөөний ирний зай тохируулах:**\n\n* Хөрөөний ирний зузаан (Kerf) нь хавтан зүсэх үед үүсэх үртэсний ирний зузаан юм (ихэвчлэн 4 мм).\n* \"Зүсэлт оновчлол\" хуудасны **\"Хөрөөний ир\"** гулсуурыг ашиглан ирний зузааныг тодорхойлно.\n* Алгоритм ирний зузаан зайг хэсэг бүрийн дунд автоматаар авч тооцдог тул хэсгүүд давхцах эсвэл хэмжээ алдах зөрчил үүсэхгүй."
      },
      "svg-cnc": {
        title: "SVG CNC зургийн файл татах",
        content: "**CNC зүсэлтийн зураг татах:**\n\n* \"Зүсэлт оновчлол\" хуудас руу орж тооцоолол хийгдсэний дараа хавтан бүрийн баруун дээд буланд **\"SVG CNC Татах\"** товчлуур байрлана.\n* Энэ товчийг дарснаар тухайн хавтан дээрх зүсэлтийн зургийг вектороор (SVG) CNC машинд шууд уншихийн тулд татаж авах боломжтой."
      }
    }
  },
  "pricing": {
    title: "💳 Эрх сунгалт & Төлбөр",
    children: {
      "prices": {
        title: "Эрх сунгах үнэ тариф",
        content: "**TavMax Платформын лицензийн үнэ тариф:**\n\n* **24 цагийн эрх**: 9,900 ₮\n* **30 хоногийн эрх**: 29,900 ₮\n\n*Эрх сунгагдсанаар 3D засварлагчийг ашиглах, зүсэлт оновчлол хийх болон CNC зураг татах зэрэг бүх боломж бүрэн нээгдэнэ.*"
      },
      "how-to-pay": {
        title: "Эрхээ хэрхэн идэвхжүүлэх вэ?",
        content: "**Лиценз идэвхжүүлэх алхмууд:**\n\n1. Та өөрийн бүртгэсэн утасны дугаараар нэвтэрч ороод **\"Миний Эрх & Төлбөр\"** цонхонд шилжинэ.\n2. Төлбөрийн мэдээллийн дагуу гүйлгээ хийхдээ гүйлгээний утга дээр өөрийн **утасны дугаарыг** бичнэ.\n3. Төлбөр орсны дараа системийн админ таны дугаар дээр сонгосон эрхийг шууд идэвхжүүлж өгнө.\n4. Мөн админ ажилтан танд идэвхжүүлэх код өгсөн бол **\"Кодоор идэвхжүүлэх\"** хэсэгт оруулж эрхээ шууд сунгана."
      }
    }
  },
  "contact-admin": {
    title: "📞 Админтай холбогдох",
    content: "TavMax платформын админ ажилтантай холбогдох мэдээлэл:\n\n* **Хариуцах ажилтан**: {ADMIN_NAME}\n* **Холбоо барих утас**: {ADMIN_PHONE}\n\nТа дараах утсаар холбогдон эрхээ сунгуулах, төлбөр баталгаажуулах болон техникийн бусад асуудлаар тусламж авах боломжтой."
  }
};

export const SupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // Navigate back one step
  const handleBack = () => {
    setCurrentPath((prev) => prev.slice(0, -1));
  };

  // Reset to root
  const handleHome = () => {
    setCurrentPath([]);
  };

  // Get current node in FAQ tree
  const getCurrentNode = (): { title: string; children?: Record<string, FAQNode>; content?: string } => {
    let node: any = { title: "TavMax Туслах", children: FAQ_TREE };
    for (const key of currentPath) {
      if (node && node.children && node.children[key]) {
        node = node.children[key];
      }
    }
    return node;
  };

  const currentNode = getCurrentNode();

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end select-none font-sans">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-[320px] sm:w-[360px] h-[480px] bg-[#0c0d12]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 animate-fade-in glass">
          {/* Header */}
          <div className="px-4 py-3 bg-[#12141c] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentPath.length > 0 && (
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">TavMax Туслах</span>
                <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ашиглахад бэлэн
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Chat Bubble Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>
            {/* Welcoming bot bubble */}
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[10px]">
                TM
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="bg-[#1c1d24] text-neutral-200 text-xs px-3 py-2.5 rounded-2xl rounded-tl-none border border-white/5 leading-normal whitespace-pre-wrap">
                  Сайн байна уу! Танд систем ашиглах, тавилга зурах болон зүсэлтийн тооцоотой холбоотой ямар тусламж хэрэгтэй байна? Сэдвээ сонгоно уу.
                </div>
              </div>
            </div>

            {/* Display history path if viewing a question */}
            {currentPath.length > 1 && (
              <div className="flex gap-2.5 items-start justify-end">
                <div className="flex-1 flex flex-col items-end">
                  <div className="bg-amber-500 text-neutral-950 font-bold text-xs px-3 py-2 rounded-2xl rounded-tr-none shadow shadow-amber-500/10">
                    {currentNode.title}
                  </div>
                </div>
              </div>
            )}

            {/* Show content (answer) if present */}
            {currentNode.content && (
              <div className="flex gap-2.5 items-start animate-fade-in">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[10px]">
                  TM
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-[#1c1d24] text-neutral-200 text-[11px] px-3.5 py-3 rounded-2xl rounded-tl-none border border-white/5 leading-relaxed whitespace-pre-wrap">
                    {currentNode.content
                      .replace("{ADMIN_NAME}", import.meta.env.VITE_ADMIN_NAME || "Золбоо")
                      .replace("{ADMIN_PHONE}", import.meta.env.VITE_ADMIN_PHONE || "90860926")
                      .split("\n\n")
                      .map((para, i) => {
                        // Basic parsing for bold markdown **text**
                        const parts = para.split("**");
                        return (
                          <p key={i} className="mb-2 last:mb-0">
                            {parts.map((p, idx) => (idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{p}</strong> : p))}
                          </p>
                        );
                      })}
                  </div>
                  {currentPath[0] === "contact-admin" && (
                    <a
                      href={`tel:${import.meta.env.VITE_ADMIN_PHONE || "90860926"}`}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer text-center block uppercase tracking-wider shadow"
                    >
                      📞 Шууд залгах ({import.meta.env.VITE_ADMIN_PHONE || "90860926"})
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleBack}
                      className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-350 text-[10px] font-bold rounded-lg border border-white/5 transition-all cursor-pointer text-center"
                    >
                      ← Буцах
                    </button>
                    <button
                      onClick={handleHome}
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center"
                    >
                      🏠 Эхлэл
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Render options/children if present */}
            {currentNode.children && (
              <div className="flex flex-col gap-2 mt-1 animate-fade-in pl-9">
                {Object.entries(currentNode.children).map(([key, node]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentPath((prev) => [...prev, key])}
                    className="w-full text-left px-3.5 py-2.5 bg-neutral-800/40 hover:bg-neutral-850 border border-white/5 hover:border-amber-500/30 rounded-xl text-neutral-200 hover:text-amber-400 text-xs font-semibold transition-all cursor-pointer flex justify-between items-center group shadow-md"
                  >
                    <span className="truncate">{node.title}</span>
                    <span className="text-neutral-500 group-hover:text-amber-400 text-[10px] transition-colors">➔</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Trigger Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative z-50 group border border-amber-600"
        title="Тусламж авах"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && (
          <span className="absolute right-14 bg-neutral-900/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-wider whitespace-nowrap">
            💡 Тусламж авах уу?
          </span>
        )}
      </button>
    </div>
  );
};

