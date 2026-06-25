import React, { useState, useEffect } from 'react'; // Redeploy trigger
import { useAuthStore } from '../store/authStore';
import { Key, Phone, User, Lock, ShieldCheck, CheckCircle2, AlertCircle, Coins, CreditCard, Sparkles, Check, RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { sendSMS } from '../utils/sms';

export const Auth: React.FC = () => {
  const { validateCode, register, login } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Plans / Access Code input, 2: Registration details, 3: Success
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form values
  const [activationCode, setActivationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  // SaaS Payment Dialog states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; code: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [inactiveSelectedPlan, setInactiveSelectedPlan] = useState<'24H' | '30D'>('30D');
  const [paidCode, setPaidCode] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'account' | 'name' | 'amount' | 'desc' | 'iban' | null>(null);

  const handleCopy = (text: string, field: 'account' | 'name' | 'amount' | 'desc' | 'iban') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Status values
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: '24 цагийн эрх',
      price: 9900,
      desc: 'Богино хугацаанд хурдан зүсэлт гаргах',
      features: [
        'Бүх боломжууд нээлттэй',
        '2D Зүсэлт оновчлол (Nesting)',
        'CNC машинд зориулсан DXF экспорт',
        'PDF тайлан, SVG зураг татах',
      ],
      color: 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/10',
      actionText: 'Идэвхжүүлэх (9,900 ₮)',
      highlight: true,
      code: import.meta.env.VITE_CODE_24H || '',
    },
    {
      name: '1 сарын эрх',
      price: 29900,
      desc: 'Урт хугацаанд хязгааргүй ашиглах',
      features: [
        'Бүх боломжууд нээлттэй',
        '2D Зүсэлт оновчлол (Nesting)',
        'CNC машинд зориулсан DXF экспорт',
        'PDF тайлан, SVG зураг татах',
      ],
      color: 'border-blue-500/30 bg-blue-500/5',
      actionText: 'Идэвхжүүлэх (29,900 ₮)',
      code: import.meta.env.VITE_CODE_30D || '',
    },
  ];

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!activationCode.trim()) {
      setErrorMsg('Идэвхжүүлэх кодыг оруулна уу!');
      return;
    }

    if (validateCode(activationCode.trim())) {
      setStep(2);
    } else {
      setErrorMsg('Буруу эсвэл хүчингүй код байна! (Худалдаж авах хэсгээс шинэ код авна уу)');
    }
  };

  const handleBuyPlan = (plan: typeof plans[1]) => {
    if (plan.price === 0) {
      // Free plan bypasses payment
      setActivationCode('TAVMAX-DEMO-CODE');
      setStep(2);
      return;
    }
    setSelectedPlan({ name: plan.name, price: plan.price, code: plan.code || '' });
    setShowPaymentModal(true);
  };

  const handleSimulatePayment = () => {
    setShowPaymentModal(false);
    setActivationCode(''); // Register as free user first, admin will activate after verification
    setStep(2); // Go to signup details
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone || !name || !password) {
      setErrorMsg('Бүх талбарыг бөглөнө үү!');
      return;
    }

    try {
      setLoading(true);
      const success = await register(name, phone, activationCode, password);
      setLoading(false);
      if (success) {
        setStep(3);
      } else {
        setErrorMsg('Бүртгэл амжилтгүй боллоо. Мэдээллээ шалгана уу.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Бүртгэл амжилтгүй боллоо. Таны утас аль хэдийн бүртгэгдсэн байж магадгүй.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!phone || !password) {
      setErrorMsg('Утас болон нууц үгээ оруулна уу!');
      return;
    }

    try {
      setLoading(true);
      const success = await login(phone, password);
      setLoading(false);
      if (!success) {
        setErrorMsg('Утасны дугаар эсвэл нууц үг буруу байна!');
      }
    } catch (err: any) {
      setLoading(false);
      if (err.message === 'NOT_ACTIVATED') {
        setErrorMsg('NOT_ACTIVATED');
      } else {
        setErrorMsg(err.message || 'Утасны дугаар эсвэл нууц үг буруу байна!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] flex items-center justify-center p-6 relative overflow-y-auto">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Main SaaS Container */}
      <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl shadow-2xl glass-dark animate-slide-up flex flex-col gap-8 my-8">
        
        {/* Header Title */}
        <div className="text-center">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest">
            SaaS Өөрөө Загварчлах Систем
          </span>
          <div className="mt-2.5 flex justify-center">
            {isSupabaseConfigured ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ҮҮЛЭН САНТАЙ ХОЛБОГДСОН (CLOUD)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                ОФФЛАЙН ГОРИМ (LOCAL STORAGE)
              </span>
            )}
          </div>
          <h1 className="font-display font-extrabold text-4xl tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent mt-3">
            TAVMAX
          </h1>
          <p className="text-neutral-400 text-xs mt-2 max-w-lg mx-auto leading-relaxed">
            Мэргэжлийн 3D тавилгын зураг үүсгэж, зүсэлтийн оновчлол, бэлдэц хэмжээний жагсаалт болон материалын өртөгөө өөрөө бодож гаргах систем.
          </p>
        </div>

        {errorMsg && errorMsg !== 'NOT_ACTIVATED' && (
          <div className="bg-red-950/30 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2 max-w-md mx-auto w-full">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {errorMsg === 'NOT_ACTIVATED' && (
          <div className="bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs p-5 rounded-2xl flex flex-col gap-4 max-w-md mx-auto w-full animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-white text-sm">Туршилтын хугацаа дууссан байна!</span>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  Таны 10 минутын үнэгүй туршилтын хугацаа дууссан байна. Үргэлжлүүлэн ашиглахын тулд доорх дансаар төлбөрөө шилжүүлж эрхээ сунгана уу. Админ 5-10 минутад баталгаажуулах болно.
                </p>
              </div>
            </div>

            {/* Plan Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-900/60 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setInactiveSelectedPlan('24H')}
                className={`py-1.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                  inactiveSelectedPlan === '24H'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                24 цагийн эрх (9,900 ₮)
              </button>
              <button
                type="button"
                onClick={() => setInactiveSelectedPlan('30D')}
                className={`py-1.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                  inactiveSelectedPlan === '30D'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                1 сарын эрх (29,900 ₮)
              </button>
            </div>

            {/* Bank Transfer Instructions Card inside alert */}
            <div className="flex flex-col gap-2.5 bg-neutral-950/50 border border-white/5 p-3.5 rounded-xl text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Хүлээн авах Банк:</span>
                <span className="font-bold text-white">Хаан Банк (Khan Bank)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Дансны дугаар:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-amber-500">
                  <span>5114296800</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy('5114296800', 'account')}
                    className="p-1 hover:bg-white/5 rounded text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'account' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Хүлээн авагч:</span>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span>Золбоо Заяахүү</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy('Золбоо Заяахүү', 'name')}
                    className="p-1 hover:bg-white/5 rounded text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'name' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">
                  Төлөх дүн ({inactiveSelectedPlan === '24H' ? '24 Цаг' : '1 Сар'}):
                </span>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span>{inactiveSelectedPlan === '24H' ? '9,900 ₮' : '29,900 ₮'}</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy(inactiveSelectedPlan === '24H' ? '9900' : '29900', 'amount')}
                    className="p-1 hover:bg-white/5 rounded text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'amount' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                <span className="text-neutral-400">Гүйлгээний утга (Утас):</span>
                <div className="flex items-center gap-1.5 font-mono font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <span>{phone}</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy(phone, 'desc')}
                    className="p-1 hover:bg-white/5 rounded text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'desc' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 p-2.5 rounded-xl leading-relaxed flex gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Шилжүүлгийн утга дээр өөрийн утасны дугаарыг (<b>{phone}</b>) зөв бичсэн эсэхээ дахин нягтална уу.</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2 max-w-md mx-auto w-full">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: PLANS AND LICENSE CHECK */}
        {step === 1 && !isLoginMode && (
          <div className="flex flex-col gap-10">
            {/* SaaS Pricing Grid */}
            <div className="max-w-3xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((plan, idx) => (
                <div
                  key={idx}
                  className={`border rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all hover:scale-[1.01] ${plan.color}`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-display font-bold text-white text-base">{plan.name}</h3>
                      {plan.highlight && (
                        <span className="px-2 py-0.5 bg-amber-500 text-neutral-950 font-bold text-[9px] uppercase rounded-md tracking-wider flex items-center gap-0.5">
                          <Sparkles size={8} /> Сонгох
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-display font-extrabold text-white">
                        {plan.price === 0 ? 'Үнэгүй' : `${plan.price.toLocaleString('mn-MN')} ₮`}
                      </span>
                      {plan.price > 0 && <span className="text-neutral-500 text-xs">{plan.code.includes('24H') ? '/24 цаг' : '/сар'}</span>}
                    </div>
                    <p className="text-neutral-400 text-xs leading-relaxed">{plan.desc}</p>
                    
                    <div className="flex flex-col gap-2 mt-4 border-t border-white/5 pt-4">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-[11px] text-neutral-300">
                          <Check size={12} className="text-amber-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyPlan(plan)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer ${
                      plan.highlight
                        ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950 shadow-lg shadow-amber-500/10'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {plan.actionText}
                  </button>
                </div>
              ))}
            </div>

            {/* Direct Activation code row */}
            <div className="border-t border-white/5 pt-8 max-w-md mx-auto w-full flex flex-col gap-4">
              <div className="text-center">
                <h4 className="text-xs text-neutral-400 font-semibold">Хэрэв танд аль хэдийн идэвхжүүлэх код байгаа бол:</h4>
              </div>
              <form onSubmit={handleVerifyCode} className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                  <input
                    type="text"
                    placeholder="Лицензийн код оруулах"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs font-mono font-bold tracking-wider"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Идэвхжүүлэх
                </button>
              </form>
            </div>

            <div className="text-center border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setIsLoginMode(true)}
                className="text-amber-500 hover:underline text-xs"
              >
                Танд аль хэдийн бүртгэл байгаа бол? Нэвтрэх
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REGISTRATION DETAILS FORM */}
        {step === 2 && !isLoginMode && (
          <form onSubmit={handleRegister} className="flex flex-col gap-5 max-w-md mx-auto w-full">
            <div className="text-center">
              <h2 className="font-display font-bold text-lg text-white">Хэрэглэгчийн бүртгэл үүсгэх</h2>
              <p className="text-neutral-400 text-xs mt-1">
                Системд шинээр бүртгүүлэн үнэгүй аккаунт үүсгэх
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Таны Нэр</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="text"
                  placeholder="Бат-Эрдэнэ"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Утасны Дугаар</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="tel"
                  placeholder="Утасны дугаар"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-semibold">Нууц Үг Үүсгэх</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="password"
                  placeholder="Нууц үг"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl active:scale-[0.98] transition-all text-xs cursor-pointer"
            >
              {loading ? 'Уншиж байна...' : 'Бүртгэл дуусгах'}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  setStep(1);
                }}
                className="text-amber-500 hover:underline text-xs"
              >
                Танд аль хэдийн бүртгэл байгаа бол? Нэвтрэх
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: REGISTRATION SUCCESS & PAYMENT DETAILS */}
        {step === 3 && (
          <div className="flex flex-col gap-6 py-4 max-w-md mx-auto w-full animate-fade-in">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-500 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-white">Бүртгэл амжилттай үүслээ!</h2>
                <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                  Таны бүртгэл үүслээ. Одоо нэвтрэх хэсэг рүү очиж өөрийн утасны дугаар, нууц үгээр нэвтэрвэл танд <b className="text-amber-400">10 минутын үнэгүй туршилтын эрх</b> автоматаар олгогдох болно.
                </p>
              </div>
            </div>

            {/* Plan Selector */}
            {!selectedPlan && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-900/60 border border-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInactiveSelectedPlan('24H')}
                  className={`py-1.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                    inactiveSelectedPlan === '24H'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  24 цагийн эрх (9,900 ₮)
                </button>
                <button
                  type="button"
                  onClick={() => setInactiveSelectedPlan('30D')}
                  className={`py-1.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                    inactiveSelectedPlan === '30D'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1 сарын эрх (29,900 ₮)
                </button>
              </div>
            )}

            {/* Bank Transfer Instructions Card */}
            <div className="flex flex-col gap-3 bg-neutral-900/60 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-display">Шилжүүлгийн Мэдээлэл</span>
              
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Хүлээн авах Банк:</span>
                <span className="text-xs font-bold text-white">Хаан Банк (Khan Bank)</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Дансны дугаар:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-500">5114296800</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy('5114296800', 'account')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'account' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">IBAN:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">15000500</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy('15000500', 'iban')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'iban' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Хүлээн авагч:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Золбоо Заяахүү</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy('Золбоо Заяахүү', 'name')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'name' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">
                  {selectedPlan 
                    ? `${selectedPlan.name} төлбөр:` 
                    : (inactiveSelectedPlan === '24H' ? '24 цагийн эрхийн төлбөр:' : '1 сарын эрхийн төлбөр:')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {selectedPlan 
                      ? `${selectedPlan.price.toLocaleString('mn-MN')} ₮` 
                      : (inactiveSelectedPlan === '24H' ? '9,900 ₮' : '29,900 ₮')}
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleCopy(selectedPlan ? selectedPlan.price.toString() : (inactiveSelectedPlan === '24H' ? '9900' : '29900'), 'amount')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'amount' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-neutral-400">Гүйлгээний утга (Таны утас):</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {phone}
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleCopy(phone, 'desc')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer hover:bg-neutral-800"
                  >
                    {copiedField === 'desc' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Alert Box */}
            <div className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Маш чухал санамж!</span>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  Гүйлгээний утга дээр өөрийн бүртгүүлсэн утасны дугаараа (<b>{phone}</b>) заавал зөв бичнэ үү. Буруу бичвэл таны эрхийг идэвхжүүлэх боломжгүй болно.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLoginMode(true);
                setStep(1);
                setSuccessMsg('Одоо өөрийн дугаараар нэвтэрч 10 минутын үнэгүй туршилтын эрхээ ашиглана уу!');
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl active:scale-[0.98] transition-all text-xs cursor-pointer text-center"
            >
              Нэвтрэх хэсэг рүү очих (10 минут үнэгүй турших)
            </button>
          </div>
        )}

        {/* LOGIN MODE */}
        {isLoginMode && (
          <form onSubmit={handleLogin} className="flex flex-col gap-6 max-w-md mx-auto w-full">
            <div className="text-center">
              <h2 className="font-display font-bold text-lg text-white">Системд нэвтрэх</h2>
              <p className="text-neutral-400 text-xs mt-1">Төслийн сандаа нэвтэрч орох</p>
              {isSupabaseConfigured && (
                <p className="text-[9px] text-neutral-600 mt-1 font-mono">
                  DB: {(import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '')}
                </p>
              )}
            </div>



            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-medium">Утасны Дугаар</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="tel"
                  placeholder="Бүртгэлтэй утасны дугаар"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-medium">Нууц Үг</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="password"
                  placeholder="Нууц үг"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl active:scale-[0.98] transition-all text-xs cursor-pointer shadow-lg"
            >
              {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
            </button>

            <div className="text-center flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setStep(2);
                  setActivationCode('');
                }}
                className="text-amber-500 hover:underline text-xs font-bold"
              >
                Бүртгүүлэх (Шинэ бүртгэл үүсгэх)
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MONGOLIAN PAYMENT BANK TRANSFER MODAL FOR PLANS */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl glass-dark">
            <div className="text-center border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-white text-base">{selectedPlan.name} Идэвхжүүлэх</h3>
              <p className="text-[11px] text-amber-500 mt-1">Төлбөр шилжүүлсний дараа лиценз код үүснэ.</p>
            </div>

            {/* Bank Transfer Instructions Card */}
            <div className="flex flex-col gap-3 bg-neutral-900/60 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Шилжүүлгийн Мэдээлэл</span>
              
              {/* Bank Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Хүлээн авах Банк:</span>
                <span className="text-xs font-bold text-white">Хаан Банк (Khan Bank)</span>
              </div>

              {/* Account Number Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Дансны дугаар:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-500">5114296800</span>
                  <button 
                    onClick={() => handleCopy('5114296800', 'account')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="Данс хуулах"
                  >
                    {copiedField === 'account' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* IBAN Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">IBAN:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">15000500</span>
                  <button 
                    onClick={() => handleCopy('15000500', 'iban')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="IBAN хуулах"
                  >
                    {copiedField === 'iban' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Account Holder Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Хүлээн авагч:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Золбоо Заяахүү</span>
                  <button 
                    onClick={() => handleCopy('Золбоо Заяахүү', 'name')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="Нэр хуулах"
                  >
                    {copiedField === 'name' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Amount Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Шилжүүлэх дүн:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{selectedPlan.price.toLocaleString('mn-MN')} ₮</span>
                  <button 
                    onClick={() => handleCopy(selectedPlan.price.toString(), 'amount')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="Дүн хуулах"
                  >
                    {copiedField === 'amount' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Transaction Description Row */}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-neutral-400">Гүйлгээний утга (Утас):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    placeholder="Бүртгүүлэх утас"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-32 text-xs font-mono font-extrabold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-right outline-none focus:border-amber-500 placeholder-amber-500/50"
                  />
                  <button 
                    onClick={() => handleCopy(phone, 'desc')}
                    disabled={!phone}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer disabled:opacity-50"
                    title="Утасны дугаар хуулах"
                  >
                    {copiedField === 'desc' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Alert Box */}
            <div className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Маш чухал санамж!</span>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  Гүйлгээний утга дээр өөрийн бүртгүүлэх утасны дугаарыг заавал зөв бичнэ үү. Буруу бичвэл эрх автоматаар сунгагдах боломжгүйг анхаарна уу.
                </p>
              </div>
            </div>

             {/* Actions */}
             <div className="flex flex-col gap-2 mt-1">
               <button
                 onClick={handleSimulatePayment}
                 disabled={!phone}
                 className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs cursor-pointer"
               >
                 Төлбөр шилжүүлсэн, Бүртгүүлэх
               </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Auth;
