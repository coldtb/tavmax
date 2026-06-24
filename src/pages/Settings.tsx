import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Sliders, Shield, CheckCircle2, X } from 'lucide-react';

// ─── Inline Toast ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

// Settings key for localStorage
const SETTINGS_KEY = 'tavmax_settings';

export const Settings: React.FC = () => {
  const { user, activationCodeUsed, logout } = useAuthStore();
  const { toast, show } = useToast();

  // Load saved settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  };

  const saved = loadSettings();

  const [unit, setUnit] = useState<'mm' | 'cm'>(saved.unit || 'mm');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>(saved.quality || 'high');
  const [defaultKerf, setDefaultKerf] = useState<number>(saved.defaultKerf ?? 4);
  const [defaultMargin, setDefaultMargin] = useState<number>(saved.defaultMargin ?? 10);
  const [saved2, setSaved2] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tavmax_theme') as 'dark' | 'light') || 'dark';
  });

  // Sync theme if toggled elsewhere (e.g. in Header)
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail && (e.detail === 'dark' || e.detail === 'light') && e.detail !== theme) {
        setTheme(e.detail);
      }
    };
    window.addEventListener('tavmax-theme-change', handleThemeChange);
    return () => window.removeEventListener('tavmax-theme-change', handleThemeChange);
  }, [theme]);

  const handleThemeToggle = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    window.dispatchEvent(new CustomEvent('tavmax-theme-change', { detail: newTheme }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save all settings to localStorage
    const settings = { unit, quality, defaultKerf, defaultMargin };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Also expose globally for Cutting / Editor pages to use
    window.dispatchEvent(new CustomEvent('tavmax-settings-change', { detail: settings }));
    setSaved2(true);
    show('Тохиргоо амжилттай хадгалагдлаа!', 'success');
    setTimeout(() => setSaved2(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 pb-12 relative">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold transition-all animate-slide-up ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950/90 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <X size={16} className="shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Үндсэн Тохиргоо</h1>
          <p className="text-xs text-neutral-400 mt-1">Системийн хэмжигдэхүүн, зураглалын чанар, лицензийн мэдээлэл</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: License status */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Shield size={18} className="text-amber-500" />
              <h3 className="font-display font-bold text-white text-sm">Таны Бүртгэл</h3>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <span className="text-neutral-500 uppercase text-[9px]">Хэрэглэгчийн Нэр</span>
              <span className="font-bold text-white text-sm">{user?.name}</span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <span className="text-neutral-500 uppercase text-[9px]">Бүртгэлтэй утас</span>
              <span className="font-bold text-white text-sm">{user?.phone}</span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <span className="text-neutral-500 uppercase text-[9px]">Лицензийн түвшин</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase rounded-lg">
                  {user?.subscription === 'factory' || user?.subscription === 'pro' ? 'ИДЭВХТЭЙ ЭРХ' : 'ҮНЭГҮЙ ЭРХ'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <span className="text-neutral-500 uppercase text-[9px]">Идэвхжүүлэх код</span>
              <span className="font-mono text-neutral-400">{activationCodeUsed || 'DEMO-ACTIVE-CODE'}</span>
            </div>

            {user?.expiresAt && (
              <div className="flex flex-col gap-1.5 text-xs">
                <span className="text-neutral-500 uppercase text-[9px]">Дуусах хугацаа</span>
                <span className="font-mono text-amber-400 text-[11px]">
                  {new Date(user.expiresAt).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}

            <button
              onClick={logout}
              className="w-full mt-4 py-2.5 bg-red-950/20 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/15 hover:border-red-500/30 rounded-xl transition-all text-xs cursor-pointer"
            >
              Системээс Гарах
            </button>
          </div>
        </div>

        {/* Right Col: Preferences Form */}
        <form onSubmit={handleSave} className="lg:col-span-8 bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders size={18} className="text-amber-500" />
            <h3 className="font-display font-bold text-white text-base">Системийн параметер</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Units */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-neutral-400 font-semibold">Хэмжих Нэгж</label>
              <div className="flex bg-[#0c0d12] border border-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUnit('mm')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    unit === 'mm' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Миллиметр (мм)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    unit === 'cm' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Сантиметр (см)
                </button>
              </div>
              <p className="text-[10px] text-neutral-600">Хэмжих нэгж нь хэмжигдэхүүн харуулахад нөлөөлнө</p>
            </div>

            {/* Quality */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-neutral-400 font-semibold">3D Рендерийн Чанар</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500"
              >
                <option value="high">Өндөр чанар (Эхний сонголт)</option>
                <option value="medium">Дундаж чанар (Зөөлөн)</option>
                <option value="low">Бага чанар (Шуурхай)</option>
              </select>
            </div>

            {/* Default Kerf */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Анхны зүсүүрийн ир (мм)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={defaultKerf}
                onChange={(e) => setDefaultKerf(parseInt(e.target.value) || 4)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-neutral-600">Зүсэлт оновчлолд анхдагч утгаар хэрэглэгдэнэ</p>
            </div>

            {/* Default Margin */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Анхны ирмэгийн зай (мм)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={defaultMargin}
                onChange={(e) => setDefaultMargin(parseInt(e.target.value) || 10)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-neutral-600">Хавтангийн ирмэгээс авах зай (мм)</p>
            </div>

            {/* Theme selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-neutral-400 font-semibold">Харагдац (Theme)</label>
              <div className="flex bg-[#0c0d12] border border-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleThemeToggle('dark')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  🌙 Dark Mode
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeToggle('light')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    theme === 'light' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ☀️ Light Mode
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-5 mt-4">
            <button
              type="submit"
              className={`px-6 py-3 text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 ${
                saved2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
              }`}
            >
              {saved2 ? <><CheckCircle2 size={14} /> Хадгалагдлаа!</> : 'Тохиргоог Хадгалах'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Settings;
