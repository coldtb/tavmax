import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Users, CheckCircle2, Clock, Search, Shield, ShieldAlert, RefreshCw, Ban, User, CreditCard } from 'lucide-react';

interface ProfileData {
  id: string; // phone or supabase uuid
  name: string;
  phone: string;
  role: string;
  subscription: string;
  expires_at?: string;
  updated_at?: string;
}

export const Admin: React.FC = () => {
  const { registeredUsers, adminUpdateUserSubscription } = useAuthStore();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const mapped: ProfileData[] = registeredUsers.map(u => ({
        id: u.phone,
        name: u.name,
        phone: u.phone,
        role: u.role,
        subscription: u.subscription,
        expires_at: u.expiresAt
      }));
      setProfiles(mapped);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setProfiles(data);
      } else if (error) {
        console.error('Error fetching profiles:', error.message);
      }
    } catch (e) {
      console.error('Exception fetching profiles:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, [registeredUsers]);

  const handleUpdateUser = async (user: ProfileData, duration: '24h' | '30d' | 'cancel') => {
    setUpdatingId(user.id);
    const now = new Date();
    let expiresAt: string | null = null;
    let subscription: 'free' | 'factory' = 'free';

    if (duration === '24h') {
      now.setHours(now.getHours() + 24);
      expiresAt = now.toISOString();
      subscription = 'factory';
    } else if (duration === '30d') {
      now.setDate(now.getDate() + 30);
      expiresAt = now.toISOString();
      subscription = 'factory';
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription,
            expires_at: expiresAt,
            role: subscription === 'factory' ? 'factory' : 'designer',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating user:', error.message);
        } else {
          // Trigger a reload
          await fetchProfiles();
        }
      } catch (e) {
        console.error('Exception updating user:', e);
      }
    } else {
      // Local fallback
      await adminUpdateUserSubscription(user.phone, duration);
    }
    setUpdatingId(null);
  };

  // Calculations
  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter(p => {
    if (p.subscription !== 'factory' && p.subscription !== 'pro') return false;
    if (!p.expires_at) return true; // infinite
    return new Date(p.expires_at).getTime() > Date.now();
  }).length;
  
  const expiredUsers = totalUsers - activeUsers;

  const totalRevenue = React.useMemo(() => {
    let sum = 0;
    profiles.forEach((p) => {
      if (p.role === 'admin') return;
      if (p.subscription !== 'factory' && p.subscription !== 'pro') return;

      // Heuristic: check duration from updated_at and expires_at
      if (p.expires_at && p.updated_at) {
        const diffMs = new Date(p.expires_at).getTime() - new Date(p.updated_at).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 5) {
          sum += 29900; // 30-day plan (29,900 MNT)
        } else if (diffDays > 0) {
          sum += 9900; // 24-hour plan (9,900 MNT)
        }
      } else if (p.expires_at) {
        // Fallback: assume 30-day plan
        sum += 29900;
      }
    });
    return sum;
  }, [profiles]);

  const getRemainingTimeText = (expiresAt?: string, subscription?: string) => {
    if (subscription !== 'factory' && subscription !== 'pro') return 'Эрхгүй';
    if (!expiresAt) return 'Хязгааргүй';
    const expireTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = expireTime - now;
    if (diffMs <= 0) return 'Хугацаа дууссан';

    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours <= 24) {
      return `${diffHours} цаг үлдсэн`;
    }
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} хоног үлдсэн`;
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#12141c] border border-white/5 px-6 py-5 rounded-2xl">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Систем Удирдах Хэсэг</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Нийт хэрэглэгчдийн эрх сунгалт, лиценз удирдах админ самбар
          </p>
        </div>
        <button
          onClick={fetchProfiles}
          disabled={loading}
          className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Шинэчлэх
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#12141c] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Нийт Хэрэглэгч</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{totalUsers}</h3>
          </div>
        </div>

        <div className="bg-[#12141c] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Идэвхтэй Эрхтэй</span>
            <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">{activeUsers}</h3>
          </div>
        </div>

        <div className="bg-[#12141c] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <Ban size={22} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Үнэгүй / Дууссан</span>
            <h3 className="text-2xl font-bold text-red-400 mt-0.5">{expiredUsers}</h3>
          </div>
        </div>

        <div className="bg-[#12141c] border border-white/5 p-5 rounded-2xl flex items-center gap-4 bg-gradient-to-br from-[#12141c] to-amber-500/[0.02]">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <CreditCard size={22} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Нийт Олсон Орлого</span>
            <h3 className="text-2xl font-bold text-amber-400 mt-0.5">{totalRevenue.toLocaleString()} ₮</h3>
          </div>
        </div>
      </div>

      {/* Users List Card */}
      <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <h3 className="font-display font-bold text-white text-base">Бүртгэлтэй хэрэглэгчид</h3>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input
              type="text"
              placeholder="Нэр, утасны дугаараар хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-900/60 border border-white/10 rounded-xl focus:border-amber-500 outline-none text-white text-xs"
            />
          </div>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-neutral-500">
                <th className="pb-3">Нэр</th>
                <th className="pb-3">Утасны дугаар</th>
                <th className="pb-3 text-center">Лиценз</th>
                <th className="pb-3 text-center">Хугацаа</th>
                <th className="pb-3 text-right">Эрх сунгах үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-500">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Ачаалж байна...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-500">
                    Тохирох хэрэглэгч олдсонгүй.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((prof) => {
                  const isActive = (prof.subscription === 'factory' || prof.subscription === 'pro') &&
                    (!prof.expires_at || new Date(prof.expires_at).getTime() > Date.now());

                  return (
                    <tr key={prof.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                            {prof.role === 'admin' ? <Shield size={14} className="text-amber-500" /> : <User size={14} />}
                          </div>
                          <div>
                            <span className="block font-bold text-white">{prof.name}</span>
                            <span className="text-[10px] text-neutral-500 uppercase">{prof.role === 'admin' ? 'Админ' : 'Хэрэглэгч'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-mono">{prof.phone}</td>
                      <td className="py-4 text-center">
                        {isActive ? (
                          <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase">
                            Идэвхтэй
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded bg-neutral-800 text-neutral-500 border border-white/5 text-[9px] font-bold uppercase">
                            Эрхгүй
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-center text-neutral-400 font-medium">
                        {getRemainingTimeText(prof.expires_at, prof.subscription)}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateUser(prof, '24h')}
                            disabled={updatingId === prof.id}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold border border-amber-500/20 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-50"
                          >
                            24 Цаг
                          </button>
                          <button
                            onClick={() => handleUpdateUser(prof, '30d')}
                            disabled={updatingId === prof.id}
                            className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white font-bold border border-blue-500/20 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-50"
                          >
                            1 Сар
                          </button>
                          {isActive && (
                            <button
                              onClick={() => handleUpdateUser(prof, 'cancel')}
                              disabled={updatingId === prof.id}
                              className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-500 text-red-400 hover:text-white font-bold border border-red-500/15 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-50"
                              title="Эрх хаах"
                            >
                              Хаах
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
