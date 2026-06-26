import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, ChevronLeft, Send, User, Phone, Star, ThumbsUp } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

interface FAQNode {
  title: string;
  content?: string;
  children?: Record<string, FAQNode>;
}

const FAQ_TREE: Record<string, FAQNode> = {
  "3d-editor": {
    title: "3D Zasvarlagch ashiglakh",
    children: {
      "add-cabinet": {
        title: "Shuugee khervhen nemekh ve?",
        content: "**Shuugee shineer nemekh zaavar:**\n\n1. Zuun taliin tsesnees **Zagvar** tab ruu orno.\n2. Belen shuugeenuudiin jagsaaltaas songooj, **Nemekh** tovchluuren deer daraa.\n3. Esvel shuugeeg 3D delgets ruu shuud **chirj oruulakh** boolomjtoi.\n4. Nemegdsen shuugeeg zoohod khulaanaar chirj bairshlyyg oorcholno."
      },
      "edit-size": {
        title: "Khemjeeg khervhen oorcholokh ve?",
        content: "**Shuugeeii khemjees oorcholokh:**\n\n1. 3D delgets deerkh shuugeenii deer **davkhar tovshikh** uildel khiyno.\n2. Gar utas deer **Tokhirgoo** tab neegdene.\n3. Delgetsiin doodnoos Properties Panel-aas orgonn, onders, guniyg shuud oorcholokh boolomjtoi."
      },
      "navigation": {
        title: "3D orchnyg khervhen udirdakh ve?",
        content: "**3D Viewport-iin udirdlaga:**\n\n* **Erguulex**: Khulaany zuun tovchiyg daran chirne.\n* **Zookh**: Khulaany baruun tovchiyg daran chirne.\n* **Oirtuurakh**: Khulaany dund duguiyg ashiglana."
      },
      "save-layout": {
        title: "Tosliyg khervhen khadgalakh ve?",
        content: "**Tosl khadgalakh zaavar:**\n\n* Tany khiysen buh oorchooltool uulen serverter automataaar khadgalagddaa.\n* Deediyes **Khadgalakh** tovchiyg darsnaaar snapshot boloon khadgaldag."
      }
    }
  },
  "materials": {
    title: "Materialiin san udirdakh",
    children: {
      "add-material": {
        title: "Shine ongo, une khervhen nemekh ve?",
        content: "**Material shineer burtgelekh:**\n\n1. Undsen tsesnees **Material** khuudas ruu orno.\n2. **Shine material nemekh** tovchiyg daraa.\n3. Materialiin ner, zuzaan, une, ongooyg oruulaaad **Khadgalakh** darna."
      },
      "edit-cabinet-material": {
        title: "Shuugeeii materialyg khervhen solikhi ve?",
        content: "**Shuugeeii material oorcholokh:**\n\n1. Shuugeeg songood tokhirgoonii baruun tsonkh ruu orno.\n2. **Nuur / Ongo** kheseg ruu shiljne.\n3. Endees ikhbienii material, khaalganiii material-yg songoj oorcholno."
      }
    }
  },
  "nesting": {
    title: "Zuuselt onovchlol (Nesting)",
    children: {
      "sheet-size": {
        title: "Khavtangiin khemjee solikhi",
        content: "**Khavtangiin khemjee tokhiruulakh:**\n\n1. **Zuuselt onovchlol** khuudas ruu shiljne.\n2. Zuun taliin khesgeees tokhiroh standart khemjeeyg songono.\n3. Algoritm shuud shinchelne."
      },
      "kerf": {
        title: "Khorooony ir (Kerf) tokhiruulakh",
        content: "**Khorooony iriin zai tokhiruulakh:**\n\n* Kerf ni khavtan zuusekh ued uuseh urtesiin iriin zuzaan yum (ikhevchleng 4mm).\n* Algoritm iriin zuzaan zaiyg kheseg buriin dundad avtomataaar avch tootsdog."
      },
      "svg-cnc": {
        title: "SVG CNC zurgiin fail tatakh",
        content: "**CNC zuuseltiiin zurag tatakh:**\n\n* Tootsoolol khiigdesnii daraa **SVG CNC Tatakh** tovchluур baіrlana.\n* Tuhain khavtan deerkh zuuseltiiin zurgiyg vektoorop (SVG) tataj avakh boolomjtoi."
      }
    }
  },
  "pricing": {
    title: "Erkh sungalt & Tölbör",
    children: {
      "prices": {
        title: "Erkh sungakh une tarif",
        content: "**TavMax Platformiin litsenziin une tarif:**\n\n* **24 tsagiin erkh**: 5,940 T\n* **30 khonogoiin erkh**: 17,940 T\n\n*Erkh sungagdsnaar buh boolomj burenguu needne.*"
      },
      "how-to-pay": {
        title: "Erkhee khervhen idévkhzhuulex ve?",
        content: "**Litsenz idévkhzhuulex alkhamууd:**\n\n1. **Minii Erkh & Tölbör** tsonkhond shiljne.\n2. Güilgeenii ütga deer ooriiin utasny dugaaraa bichne.\n3. Tölbör orsnii daraa admin erkh idévkhzhuulne."
      }
    }
  },
  "contact-admin": {
    title: "Admintai kholbogdokh",
    content: "Ta sistem ashiglakh, erkh sungalt, tölbör baталgaazhuurakh boloon tekhnikiiin asuudlaaar manai admintai shuud chatlaaj tuslamzh avakh boolomztoi."
  }
};

export const SupportChat: React.FC = () => {
  const { isLoggedIn, user } = useAuthStore();
  const { messages, fetchUserMessages, sendMessage } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<'faq' | 'form' | 'chat' | 'feedback' | 'feedback-done'>('faq');
  const [chatName, setChatName] = useState('');
  const [chatPhone, setChatPhone] = useState('');
  const [inputText, setInputText] = useState('');
  const [formError, setFormError] = useState('');

  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const resetFeedback = () => {
    setFeedbackRating(0);
    setFeedbackHover(0);
    setFeedbackCategory('');
    setFeedbackText('');
    setFeedbackError('');
  };

  const handleBack = () => {
    if (chatMode === 'feedback' || chatMode === 'feedback-done') {
      setChatMode('faq');
      setCurrentPath([]);
      resetFeedback();
      return;
    }
    if (chatMode !== 'faq') {
      setChatMode('faq');
      return;
    }
    setCurrentPath((prev) => prev.slice(0, -1));
  };

  const handleHome = () => {
    setChatMode('faq');
    setCurrentPath([]);
    resetFeedback();
  };

  const getCurrentNode = (): { title: string; children?: Record<string, FAQNode>; content?: string } => {
    let node: any = { title: "TavMax Tuslaakh", children: FAQ_TREE };
    for (const key of currentPath) {
      if (node && node.children && node.children[key]) {
        node = node.children[key];
      }
    }
    return node;
  };

  const currentNode = getCurrentNode();

  useEffect(() => {
    if (chatMode === 'chat' && chatPhone && isOpen) {
      fetchUserMessages(chatPhone);
      const interval = window.setInterval(() => {
        fetchUserMessages(chatPhone);
      }, 4000);
      pollingIntervalRef.current = interval;
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [chatMode, chatPhone, isOpen, fetchUserMessages]);

  useEffect(() => {
    if (chatMode === 'chat' && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatMode]);

  useEffect(() => {
    if (isOpen) {
      if (isLoggedIn && user) {
        setChatName(user.name);
        setChatPhone(user.phone);
      } else {
        const storedName = localStorage.getItem('tavmax_chat_name') || '';
        const storedPhone = localStorage.getItem('tavmax_chat_phone') || '';
        if (storedName && storedPhone) {
          setChatName(storedName);
          setChatPhone(storedPhone);
        }
      }
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [isOpen, isLoggedIn, user]);

  const handleStartChatClick = () => {
    if (isLoggedIn && user) {
      setChatName(user.name);
      setChatPhone(user.phone);
      setChatMode('chat');
    } else {
      const storedName = localStorage.getItem('tavmax_chat_name') || '';
      const storedPhone = localStorage.getItem('tavmax_chat_phone') || '';
      if (storedName && storedPhone) {
        setChatName(storedName);
        setChatPhone(storedPhone);
        setChatMode('chat');
      } else {
        setChatMode('form');
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatName.trim()) { setFormError('Nereet oruulna uu.'); return; }
    if (!chatPhone.trim() || chatPhone.trim().length < 8) { setFormError('Utasny dugaaraa zov oruulna uu.'); return; }
    localStorage.setItem('tavmax_chat_name', chatName.trim());
    localStorage.setItem('tavmax_chat_phone', chatPhone.trim());
    setFormError('');
    setChatMode('chat');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const phone = chatPhone || (isLoggedIn && user ? user.phone : '');
    const name = chatName || (isLoggedIn && user ? user.name : 'Zochin');
    if (!phone) return;
    const success = await sendMessage(phone, name, inputText.trim(), false);
    if (success) setInputText('');
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackCategory) { setFeedbackError('Anglilalyg songono uu.'); return; }
    if (!feedbackText.trim()) { setFeedbackError('Sanal khuseltee bichne uu.'); return; }
    setFeedbackLoading(true);
    setFeedbackError('');
    const phone = chatPhone || (isLoggedIn && user ? user.phone : 'Anonім');
    const name = chatName || (isLoggedIn && user ? user.name : 'Zochin');
    const stars = feedbackRating > 0 ? Array(feedbackRating).fill('*').join('') + Array(5 - feedbackRating).fill('o').join('') : 'unelgui';
    const msg = '[SANAL KHUSELT] ' + feedbackCategory + ' | ' + stars + '\n' + feedbackText.trim();
    try {
      await sendMessage(phone, name, msg, false);
      setChatMode('feedback-done');
    } catch {
      setFeedbackError('Ilgeekhed aldaa garslaa. Dakhin oroldono uu.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const starLabels = ['', 'Mash muu', 'Muu', 'Dundazh', 'Sain', 'Mash sain'];
  const categories = [
    { key: 'Khuselt', emoji: '1F4A1' },
    { key: 'Aldaa', emoji: '1F41B' },
    { key: 'Shinechlel', emoji: '2728' },
    { key: 'Ontslog', emoji: '1F4AC' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end select-none font-sans">
      {isOpen && (
        <div className="w-[320px] sm:w-[360px] h-[480px] bg-[#0c0d12]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 animate-fade-in glass">
          {/* Header */}
          <div className="px-4 py-3 bg-[#12141c] border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {(currentPath.length > 0 || chatMode !== 'faq') && (
                <button onClick={handleBack} className="p-1 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer">
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">
                  {chatMode === 'chat' ? 'Admintai kholbogdokh'
                    : (chatMode === 'feedback' || chatMode === 'feedback-done') ? 'Sanal Khuselt'
                    : 'TavMax Tuslaakh'}
                </span>
                <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ashiglakhad belen
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer">
              <X size={15} />
            </button>
          </div>

          {/* FORM MODE */}
          {chatMode === 'form' && (
            <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-center p-6 gap-4">
              <div className="text-center mb-2">
                <h4 className="text-sm font-bold text-white mb-1">Admintai kholbogdokh</h4>
                <p className="text-[10px] text-neutral-400">Neriig boloon utasny dugaaraa oruulaaad chatlaakh boolomztoi.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Tany ner</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="text" required placeholder="Nereet oruulna uu..." value={chatName} onChange={(e) => setChatName(e.target.value)} style={{ fontSize: '16px' }} className="w-full bg-neutral-900/60 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Utasny dugaar</label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="tel" required maxLength={8} placeholder="Utasny dugaar..." value={chatPhone} onChange={(e) => setChatPhone(e.target.value.replace(/\D/g, ''))} style={{ fontSize: '16px' }} className="w-full bg-neutral-900/60 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-amber-500 transition-colors font-mono" />
                </div>
              </div>
              {formError && <p className="text-[10px] text-red-400 text-center font-medium">{formError}</p>}
              <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg mt-2">Chatlaakh</button>
              <button type="button" onClick={() => setChatMode('faq')} className="w-full py-2 bg-neutral-900 text-neutral-400 text-[10px] font-bold rounded-xl border border-white/5 transition-all cursor-pointer text-center">&larr; Butsakh</button>
            </form>
          )}

          {/* CHAT MODE */}
          {chatMode === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ scrollbarWidth: "thin" }}>
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <MessageCircle size={24} className="text-amber-500/30 mb-2" />
                    <span className="text-[10px] text-neutral-500 leading-normal">Chat ekhelleh. Asuukh zuiliee bichij adminas tuslamz avna uu.</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = !msg.is_from_admin;
                    const timeText = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={msg.id} className={`flex gap-2 items-start ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (<div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[9px]">TM</div>)}
                        <div className={`flex flex-col max-w-[75%] gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3 py-2 rounded-2xl text-[11px] leading-normal whitespace-pre-wrap shadow-sm border ${isMe ? 'bg-amber-500 text-neutral-950 border-amber-400 font-medium rounded-tr-none' : 'bg-[#1c1d24] text-neutral-200 border-white/5 rounded-tl-none'}`}>{msg.message}</div>
                          <span className="text-[8px] text-neutral-500 px-1 font-medium">{timeText}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-3 bg-[#12141c] border-t border-white/5 flex gap-2 items-center shrink-0">
                <input type="text" placeholder="Asuultaa bichne uu..." value={inputText} onChange={(e) => setInputText(e.target.value)} style={{ fontSize: '16px' }} className="flex-1 bg-neutral-900 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-white outline-none focus:border-amber-500 transition-colors" />
                <button type="submit" className="p-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl transition-all cursor-pointer"><Send size={14} /></button>
              </form>
            </div>
          )}

          {/* FEEDBACK MODE */}
          {chatMode === 'feedback' && (
            <form onSubmit={handleFeedbackSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[10px]">TM</div>
                <div className="bg-[#1c1d24] text-neutral-200 text-xs px-3 py-2.5 rounded-2xl rounded-tl-none border border-white/5 leading-relaxed">
                  Tany sanal khuselt bidend mash chukhаl baina! Sistemийг saijruulakhad tusalna uu.
                </div>
              </div>

              {/* Stars */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Sistemiin unelgee (zaavalgui)</label>
                <div className="flex gap-2 items-center">
                  {[1,2,3,4,5].map((star) => (
                    <button key={star} type="button"
                      onClick={() => setFeedbackRating(feedbackRating === star ? 0 : star)}
                      onMouseEnter={() => setFeedbackHover(star)}
                      onMouseLeave={() => setFeedbackHover(0)}
                      className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Star size={24} className={`transition-colors ${star <= (feedbackHover || feedbackRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'}`} />
                    </button>
                  ))}
                  {feedbackRating > 0 && <span className="text-[10px] text-amber-400 font-bold ml-1">{starLabels[feedbackRating]}</span>}
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Angilal <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Khuselt', icon: '💡' },
                    { label: 'Aldaa', icon: '🐛' },
                    { label: 'Shinechlel', icon: '✨' },
                    { label: 'Ontslog', icon: '💬' },
                  ].map(({ label, icon }) => (
                    <button key={label} type="button" onClick={() => setFeedbackCategory(label)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 justify-center ${feedbackCategory === label ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-lg' : 'bg-neutral-900/60 border-white/10 text-neutral-400 hover:border-amber-500/40 hover:text-white'}`}
                    >
                      <span>{icon}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Tany sanal <span className="text-red-400">*</span></label>
                <textarea
                  rows={4}
                  placeholder="Delgerenguui sanal khuseltee end bichne uu..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full bg-neutral-900/60 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                  style={{ fontSize: '14px' }}
                />
              </div>

              {feedbackError && <p className="text-[10px] text-red-400 font-medium">{feedbackError}</p>}

              <button type="submit" disabled={feedbackLoading} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2">
                <Send size={13} />
                {feedbackLoading ? 'Ilgeej baina...' : 'Sanal ilgeekh'}
              </button>
              <button type="button" onClick={handleBack} className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-[10px] font-bold rounded-xl border border-white/5 transition-all cursor-pointer">&larr; Butsakh</button>
            </form>
          )}

          {/* FEEDBACK DONE */}
          {chatMode === 'feedback-done' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center">
                <ThumbsUp size={30} className="text-emerald-400" />
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-bold text-white">Bayarlalaa!</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed max-w-[240px] mx-auto">
                  Tany sanal khuselt amjilttai khuleen avgdlaa. Bid tany sanalийг ankhaaralttai kharj sistemiig saijruulakhad ashiglana.
                </p>
              </div>
              <button type="button" onClick={handleHome} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer">
                Ekhlelruu ochikh
              </button>
            </div>
          )}

          {/* FAQ MODE */}
          {chatMode === 'faq' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: "thin" }}>
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[10px]">TM</div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="bg-[#1c1d24] text-neutral-200 text-xs px-3 py-2.5 rounded-2xl rounded-tl-none border border-white/5 leading-normal">
                    Sain baina uu! Tand sistem ashiglakh, tavilga zurakh boloon zuuseltiiin tootsootoi kholbootoi yamar tuslamzh kheregтei baina? Sedvee songono uu.
                  </div>
                </div>
              </div>

              {currentPath.length > 1 && (
                <div className="flex gap-2.5 items-start justify-end">
                  <div className="flex-1 flex flex-col items-end">
                    <div className="bg-amber-500 text-neutral-950 font-bold text-xs px-3 py-2 rounded-2xl rounded-tr-none shadow shadow-amber-500/10">{currentNode.title}</div>
                  </div>
                </div>
              )}

              {currentNode.content && (
                <div className="flex gap-2.5 items-start animate-fade-in">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[10px]">TM</div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-[#1c1d24] text-neutral-200 text-[11px] px-3.5 py-3 rounded-2xl rounded-tl-none border border-white/5 leading-relaxed whitespace-pre-wrap">
                      {currentNode.content.split("\n\n").map((para, i) => {
                        const parts = para.split("**");
                        return (
                          <p key={i} className="mb-2 last:mb-0">
                            {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-bold">{p}</strong> : p)}
                          </p>
                        );
                      })}
                    </div>
                    {currentPath[0] === "contact-admin" && (
                      <button onClick={handleStartChatClick} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow">
                        Admintai chatlaakh
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleBack} className="flex-1 py-1.5 bg-neutral-800 text-neutral-350 text-[10px] font-bold rounded-lg border border-white/5 transition-all cursor-pointer text-center">&larr; Butsakh</button>
                      <button onClick={handleHome} className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center">Ekhlelruu</button>
                    </div>
                  </div>
                </div>
              )}

              {currentNode.children && (
                <div className="flex flex-col gap-2 mt-1 animate-fade-in pl-9">
                  {Object.entries(currentNode.children).map(([key, node]) => (
                    <button key={key} onClick={() => setCurrentPath((prev) => [...prev, key])}
                      className="w-full text-left px-3.5 py-2.5 bg-neutral-800/40 hover:bg-neutral-850 border border-white/5 hover:border-amber-500/30 rounded-xl text-neutral-200 hover:text-amber-400 text-xs font-semibold transition-all cursor-pointer flex justify-between items-center group shadow-md"
                    >
                      <span className="truncate">{node.title}</span>
                      <span className="text-neutral-500 group-hover:text-amber-400 text-[10px] transition-colors">&rarr;</span>
                    </button>
                  ))}

                  {currentPath.length === 0 && (
                    <button onClick={() => setChatMode('feedback')}
                      className="w-full text-left px-3.5 py-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 hover:border-emerald-500/40 rounded-xl text-neutral-300 hover:text-emerald-300 text-xs font-semibold transition-all cursor-pointer flex justify-between items-center group shadow-md"
                    >
                      <span>Sanal khuselt uldekh</span>
                      <span className="text-neutral-500 group-hover:text-emerald-400 text-[10px] transition-colors">&rarr;</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative z-50 group border border-amber-600"
        title="Tuslamzh avakh"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && (
          <span className="absolute right-14 bg-neutral-900/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-wider whitespace-nowrap">
            Tuslamzh avakh uu?
          </span>
        )}
      </button>
    </div>
  );
};