import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { CreditCard, CheckCircle2, Shield, Sliders, Calendar, FileText, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';

export const Customer: React.FC = () => {
  const { user, activationCodeUsed, updateSubscription } = useAuthStore();

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [renewPlanName, setRenewPlanName] = useState('');
  const [renewPrice, setRenewPrice] = useState(0);
  const [copiedField, setCopiedField] = useState<'account' | 'name' | 'amount' | 'desc' | null>(null);

  const handleCopy = (text: string, field: 'account' | 'name' | 'amount' | 'desc') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quotas based on subscription
  const isFactory = user?.subscription === 'factory';
  const isPro = user?.subscription === 'pro';

  const quotaModel = {
    designs: isFactory ? '24 / Хязгааргүй' : isPro ? '8 / 100' : '3 / 5',
    nesting: isFactory ? 'Хязгааргүй' : isPro ? '45 / 500' : '2 / 5',
    exports: isFactory ? 'Хязгааргүй' : isPro ? '12 / 100' : '0 / 1',
  };

  const handleOpenRenew = (planName: string, price: number) => {
    setRenewPlanName(planName);
    setRenewPrice(price);
    setInvoiceOpen(true);
    setPaid(false);
  };

  const handleConfirmPay = () => {
    setPaying(true);
    const newSubscription = renewPlanName.includes('Factory') ? 'factory' : 'pro';
    setTimeout(async () => {
      const success = await updateSubscription(newSubscription);
      setPaying(false);
      if (success) {
        setPaid(true);
        setTimeout(() => setInvoiceOpen(false), 2000);
      }
    }, 2000);
  };

  // Mock invoice receipts
  const invoices = [
    { id: 'TX-5091', date: '2026-05-23', plan: 'Factory Багц (Сунгалт)', amount: 149000, status: 'Төлөгдсөн' },
    { id: 'TX-2019', date: '2026-04-23', plan: 'Factory Багц (Эхний)', amount: 149000, status: 'Төлөгдсөн' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Эрх & Төлбөрийн Мэдээлэл</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Таны лицензийн хугацаа, ашигласан квот болон төлбөрийн түүх
          </p>
        </div>
      </div>

      {/* Grid widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Quotas & Active Plan (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active plan status */}
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/5 to-transparent border border-amber-500/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Shield size={22} />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Идэвхтэй Лиценз</span>
                <h3 className="text-xl font-display font-extrabold text-white mt-0.5">
                  {isFactory ? 'Factory (Үйлдвэрийн Багц)' : isPro ? 'Мэргэжлийн (Pro Багц)' : 'Үнэгүй Туршилтын Эрх'}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">Код: <span className="font-mono text-amber-400">{activationCodeUsed || 'Бүртгэлгүй'}</span></p>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs text-neutral-400 border-l border-white/10 pl-6 shrink-0">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={14} />
                Идэвхтэй байна
              </div>
              <div className="text-[10px] text-neutral-500">Хугацаа: 2026-06-23 хүртэл (30 хоног үлдсэн)</div>
            </div>
          </div>

          {/* Usage Quota limits meters */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
            <h3 className="font-display font-bold text-white text-base border-b border-white/5 pb-3">
              Энэ сарын ашиглалтын квот
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Designs */}
              <div className="bg-neutral-900/40 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">Хадгалсан загвар</span>
                <span className="text-lg font-bold text-white mt-1">{quotaModel.designs}</span>
                <div className="w-full h-1 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              {/* Nesting */}
              <div className="bg-neutral-900/40 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">Зүсэлт бодсон тоо</span>
                <span className="text-lg font-bold text-white mt-1">{quotaModel.nesting}</span>
                <div className="w-full h-1 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '10%' }} />
                </div>
              </div>

              {/* PDF/DXF Exports */}
              <div className="bg-neutral-900/40 p-4 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold">Файл таталт (CAD/PDF)</span>
                <span className="text-lg font-bold text-white mt-1">{quotaModel.exports}</span>
                <div className="w-full h-1 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '12%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Invoices receipts history list */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-white text-base">Гүйлгээний түүх</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-neutral-500">
                    <th className="pb-3">Баримтын №</th>
                    <th className="pb-3">Огноо</th>
                    <th className="pb-3">Багц</th>
                    <th className="pb-3 text-right">Төлсөн дүн</th>
                    <th className="pb-3 text-center">Төлөв</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-300">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 font-mono text-neutral-400">{inv.id}</td>
                      <td className="py-3">{inv.date}</td>
                      <td className="py-3 font-medium text-white">{inv.plan}</td>
                      <td className="py-3 text-right font-bold text-amber-500">{inv.amount.toLocaleString('mn-MN')} ₮</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Renew/Upgrade (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <CreditCard size={18} className="text-amber-500" />
              <h3 className="font-display font-bold text-white text-sm">Эрх сунгах / Өөрчлөх</h3>
            </div>

            <p className="text-neutral-400 text-xs leading-relaxed">
              Та дараах багцуудаас сонгон эрхээ шууд сунгах боломжтой. Төлбөр хийсний дараа лиценз хугацаа сунгагдана.
            </p>

            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={() => handleOpenRenew('Мэргэжлийн (Pro Багц)', 29000)}
                className="w-full flex justify-between items-center p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="block text-xs font-bold text-white">Pro сунгалт (30 хоног)</span>
                  <span className="text-[10px] text-neutral-500">Дизайнер, Карпентер</span>
                </div>
                <span className="text-xs font-bold text-amber-500">29,000 ₮</span>
              </button>

              <button
                onClick={() => handleOpenRenew('Үйлдвэрийн (Factory Багц)', 149000)}
                className="w-full flex justify-between items-center p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-amber-500/20 text-left transition-colors cursor-pointer"
              >
                <div>
                  <span className="block text-xs font-bold text-white">Factory сунгалт (30 хоног)</span>
                  <span className="text-[10px] text-neutral-500">CNC/DXF хэвлэх, QR код</span>
                </div>
                <span className="text-xs font-bold text-amber-500">149,000 ₮</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Transfer Invoice Modal */}
      {invoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl glass-dark">
            <div className="text-center border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-white text-base">Лиценз Сунгах Нэхэмжлэх</h3>
              <p className="text-[11px] text-amber-500 mt-1">{renewPlanName}</p>
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
                  <span className="text-xs font-mono font-bold text-amber-500">5076295536</span>
                  <button 
                    onClick={() => handleCopy('5076295536', 'account')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="Данс хуулах"
                  >
                    {copiedField === 'account' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Account Holder Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Хүлээн авагч:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Бат-Эрдэнэ Г. (TavMax)</span>
                  <button 
                    onClick={() => handleCopy('Бат-Эрдэнэ Г.', 'name')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="Нэр хуулах"
                  >
                    {copiedField === 'name' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Amount Row */}
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-xs text-neutral-400">Төлөх дүн:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{renewPrice.toLocaleString('mn-MN')} ₮</span>
                  <button 
                    onClick={() => handleCopy(renewPrice.toString(), 'amount')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
                    title="Дүн хуулах"
                  >
                    {copiedField === 'amount' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Transaction Description Row */}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-neutral-400">Гүйлгээний утга:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {user?.phone || 'Бүртгэлтэй утас'}
                  </span>
                  <button 
                    onClick={() => handleCopy(user?.phone || '', 'desc')}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white cursor-pointer"
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
                  Гүйлгээний утга дээр өөрийн бүртгэлтэй утасны дугаараа (<b>{user?.phone}</b>) заавал зөв бичнэ үү. Буруу бичвэл эрх автоматаар сунгагдах боломжгүйг анхаарна уу.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleConfirmPay}
                disabled={paying}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs cursor-pointer"
              >
                {paying ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Шилжүүлгийг шалгаж байна...
                  </>
                ) : paid ? (
                  'Сунгалт Амжилттай!'
                ) : (
                  'Шилжүүлсэн гүйлгээг шалгах'
                )}
              </button>
              <button
                onClick={() => setInvoiceOpen(false)}
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
export default Customer;
