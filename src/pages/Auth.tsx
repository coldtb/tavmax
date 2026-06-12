import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Key, Phone, User, Lock, ShieldCheck, CheckCircle2, AlertCircle, Coins, CreditCard, Sparkles, Check, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabaseClient';

export const Auth: React.FC = () => {
  const { validateCode, register, login } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Plans / Access Code input, 2: Registration details, 3: Success
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Form values
  const [activationCode, setActivationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // SaaS Payment Dialog states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; code: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paidCode, setPaidCode] = useState<string | null>(null);

  // Status values
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      name: 'Үнэгүй Багц',
      price: 0,
      desc: '3D загварчлал турших',
      features: ['3D засварлагч ашиглах', '5 хүртэлх бэлдэц үүсгэх', 'Хэмжээ харах'],
      color: 'border-white/5 bg-neutral-900/40',
      actionText: 'Үнэгүй эхлэх',
    },
    {
      name: 'Мэргэжлийн (Pro)',
      price: 29000,
      desc: 'Гэрээр тавилга хийх, дизайнерууд',
      features: [
        'Хязгааргүй 3D загварчлал',
        '2D Зүсэлт оновчлол (Nesting)',
        'Хувийн зардлын тооцоолуур',
        'PDF тайлан, SVG зураг татах',
      ],
      color: 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/10',
      actionText: 'Идэвхжүүлэх (29,000 ₮)',
      highlight: true,
      code: 'TAVMAX-PRO-2026',
    },
    {
      name: 'Үйлдвэрийн (Factory)',
      price: 149000,
      desc: 'Тавилгын үйлдвэрүүд, цехүүд',
      features: [
        'Бүх Pro эрхүүд багтсан',
        'CNC машинд зориулсан DXF экспорт',
        'Үйлдвэрийн Kanban ажлын дараалал',
        'Бэлдэцийн QR шошго хэвлэх',
      ],
      color: 'border-blue-500/30 bg-blue-500/5',
      actionText: 'Идэвхжүүлэх (149,000 ₮)',
      code: 'TAVMAX-FCT-9999',
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
    if (!selectedPlan) return;
    setPaying(true);
    setErrorMsg('');

    // Simulate instant bank payment notification
    setTimeout(() => {
      setPaying(false);
      setPaidCode(selectedPlan.code);
      setActivationCode(selectedPlan.code);
      setSuccessMsg(`Төлбөр амжилттай! Таны лицензийн код: ${selectedPlan.code}`);
      
      // Auto close and fill code
      setTimeout(() => {
        setShowPaymentModal(false);
        setStep(2); // Go to signup details
      }, 2000);
    }, 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone || !name || !password) {
      setErrorMsg('Бүх талбарыг бөглөнө үү!');
      return;
    }

    if (!otpSent) {
      setLoading(true);
      setTimeout(() => {
        setOtpSent(true);
        setLoading(false);
        setSuccessMsg('Таны утсанд баталгаажуулах код илгээгдлээ. (Туршилтын код: 1234)');
      }, 1000);
      return;
    }

    if (otpCode !== '1234') {
      setErrorMsg('Баталгаажуулах код буруу байна! (Туршилтын OTP код: 1234)');
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
    if (!phone || !password) {
      setErrorMsg('Утас болон нууц үгээ оруулна уу!');
      return;
    }

    setLoading(true);
    const success = await login(phone, password);
    setLoading(false);
    if (success) {
      window.location.reload();
    } else {
      setErrorMsg('Утасны дугаар эсвэл нууц үг буруу байна!');
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

        {errorMsg && (
          <div className="bg-red-950/30 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2 max-w-md mx-auto w-full">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      {plan.price > 0 && <span className="text-neutral-500 text-xs">/сар</span>}
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
                Лиценз: <span className="text-amber-500 font-semibold">{activationCode}</span> амжилттай баталгаажлаа.
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

            {otpSent && (
              <div className="flex flex-col gap-1.5 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                <label className="text-xs text-amber-500 font-semibold">Баталгаажуулах код (Жишээ: 1234)</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="XXXX"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full text-center py-2 bg-neutral-900 border border-white/10 rounded-lg focus:border-amber-500 outline-none text-white font-bold tracking-widest text-base"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl active:scale-[0.98] transition-all text-xs cursor-pointer"
            >
              {loading ? 'Уншиж байна...' : otpSent ? 'Бүртгэл дуусгах' : 'Баталгаажуулах код авах'}
            </button>
          </form>
        )}

        {/* STEP 3: REGISTRATION SUCCESS */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center gap-6 py-4 max-w-md mx-auto w-full">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-500 animate-bounce">
              <ShieldCheck size={36} />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">Амжилттай бүртгэгдлээ!</h2>
              <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                Таны бүртгэл баталгаажиж, Pro систем идэвхжлээ. Та одоо өөрийн загварыг бүтээж, зүсэлт болон зардлаа тооцоолно уу.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl active:scale-[0.98] transition-all text-xs cursor-pointer"
            >
              Удирдлагын хэсэг рүү орох
            </button>
          </div>
        )}

        {/* LOGIN MODE */}
        {isLoginMode && (
          <form onSubmit={handleLogin} className="flex flex-col gap-6 max-w-md mx-auto w-full">
            <div className="text-center">
              <h2 className="font-display font-bold text-lg text-white">Системд нэвтрэх</h2>
              <p className="text-neutral-400 text-xs mt-1">Төслийн сандаа нэвтэрч орох</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-400 flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1">💡 Демо Бүртгэл:</span>
              <div className="flex justify-between font-mono">
                <span>Утас: 99118822</span>
                <span>Нууц үг: password123</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-medium">Утасны Дугаар</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <input
                  type="tel"
                  placeholder="Бүртгэлтэй утас (99118822)"
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLoginMode(false)}
                className="text-amber-500 hover:underline text-xs"
              >
                Бүртгэлгүй хэрэглэгч үү? Үнийн тариф харах
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MONGOLIAN PAYMENT MOCK MODAL FOR PLANS */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#12141c] border border-white/10 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl glass-dark">
            <div className="text-center border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-white text-base">{selectedPlan.name} худалдан авах</h3>
              <p className="text-[10px] text-neutral-400 mt-1">Төлбөр төлөгдсөний дараа лиценз код идэвхжинэ.</p>
            </div>

            <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl select-none">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">QPay QR код уншуулах</span>
              <div className="w-40 h-40 bg-contain bg-center bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TavMaxQPayPlanPurchase')] bg-no-repeat border border-neutral-100 p-1.5" />
              <div className="text-center text-xs font-bold text-neutral-800">
                Дүн: {selectedPlan.price.toLocaleString('mn-MN')} ₮
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSimulatePayment}
                disabled={paying}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs cursor-pointer"
              >
                {paying ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Төлбөр шалгаж байна...
                  </>
                ) : (
                  'Төлбөрийг Системээр Баталгаажуулах'
                )}
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
