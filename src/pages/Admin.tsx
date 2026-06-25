import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { Users, CheckCircle2, Clock, Search, Shield, ShieldAlert, RefreshCw, Ban, User, CreditCard, Send, MessageCircle } from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'users' | 'support'>('users');
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const adminMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const { messages, fetchAllMessages, sendMessage } = useChatStore();

  // Chat grouping memo
  const chatSessions = React.useMemo(() => {
    const sessions: Record<string, {
      phone: string;
      name: string;
      lastMessage: string;
      timestamp: string;
      needsReply: boolean;
      messages: any[];
    }> = {};

    messages.forEach((msg) => {
      const phone = msg.user_phone;
      if (!sessions[phone]) {
        sessions[phone] = {
          phone,
          name: msg.user_name || 'Зочин',
          lastMessage: '',
          timestamp: '',
          needsReply: false,
          messages: [],
        };
      }
      sessions[phone].messages.push(msg);
    });

    return Object.values(sessions).map(s => {
      const sorted = [...s.messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const last = sorted[sorted.length - 1];
      return {
        ...s,
        messages: sorted,
        lastMessage: last ? last.message : '',
        timestamp: last ? last.created_at : '',
        needsReply: last ? !last.is_from_admin : false
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages]);

  // Polling support chats
  useEffect(() => {
    if (activeTab === 'support') {
      fetchAllMessages();
      const interval = setInterval(() => {
        fetchAllMessages();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchAllMessages]);

  const activeSession = chatSessions.find(s => s.phone === selectedPhone);

  // Auto-scroll admin chat
  useEffect(() => {
    if (activeSession && activeSession.messages.length > 0) {
      adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages.length]);

  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !adminReplyText.trim() || !activeSession) return;

    const success = await sendMessage(
      selectedPhone,
      activeSession.name,
      adminReplyText.trim(),
      true // isFromAdmin
    );
    if (success) {
      setAdminReplyText('');
    }
  };

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

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-amber-500 text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Хэрэглэгчид ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'support'
              ? 'border-amber-500 text-white font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Тусламж (Чат)
          {chatSessions.some(s => s.needsReply) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {activeTab === 'support' ? (
        <div className="bg-[#12141c] border border-white/5 rounded-2xl flex h-[580px] overflow-hidden">
          {/* Sidebar - Sessions */}
          <div className="w-[300px] border-r border-white/5 flex flex-col h-full bg-[#0c0d12]/40 shrink-0">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#12141c]/50">
              <h4 className="font-display font-bold text-white text-sm">Ирсэн чатууд</h4>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/5" style={{ scrollbarWidth: 'thin' }}>
              {chatSessions.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs flex flex-col items-center gap-2">
                  <MessageCircle size={20} className="text-neutral-700" />
                  <span>Чат одоогоор байхгүй байна.</span>
                </div>
              ) : (
                chatSessions.map((session) => {
                  const isActive = selectedPhone === session.phone;
                  const date = new Date(session.timestamp);
                  const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <button
                      key={session.phone}
                      onClick={() => setSelectedPhone(session.phone)}
                      className={`w-full text-left p-4 flex flex-col gap-1.5 transition-all outline-none ${
                        isActive 
                          ? 'bg-neutral-800/40 border-l-2 border-amber-500' 
                          : 'hover:bg-neutral-800/20 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-white truncate max-w-[155px]">
                          {session.name}
                        </span>
                        <span className="text-[9px] text-neutral-500 font-medium">
                          {timeText}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] text-neutral-400 truncate flex-1 leading-normal">
                          {session.lastMessage}
                        </span>
                        {session.needsReply && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Шинэ чат" />
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        {session.phone}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Pane */}
          <div className="flex-1 flex flex-col h-full bg-[#0c0d12]/20">
            {activeSession ? (
              <>
                {/* Active Chat Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-[#12141c]/50 flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-white">{activeSession.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{activeSession.phone}</span>
                  </div>
                  {/* Quick subscription action */}
                  {(() => {
                    const userProfile = profiles.find(p => p.phone === activeSession.phone);
                    return userProfile ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-neutral-400 mr-2">
                          Лиценз: <strong className="text-amber-400">{getRemainingTimeText(userProfile.expires_at, userProfile.subscription)}</strong>
                        </span>
                        <button
                          onClick={() => handleUpdateUser(userProfile, '24h')}
                          disabled={updatingId === userProfile.id}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold border border-amber-500/20 rounded-lg text-[9px] transition-all cursor-pointer disabled:opacity-50"
                        >
                          +24 Цаг
                        </button>
                        <button
                          onClick={() => handleUpdateUser(userProfile, '30d')}
                          disabled={updatingId === userProfile.id}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white font-bold border border-blue-500/20 rounded-lg text-[9px] transition-all cursor-pointer disabled:opacity-50"
                        >
                          +1 Сар
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-neutral-500">Системд бүртгэлгүй зочин хэрэглэгч</span>
                    );
                  })()}
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ scrollbarWidth: 'thin' }}>
                  {activeSession.messages.map((msg) => {
                    const isFromAdmin = msg.is_from_admin;
                    const date = new Date(msg.created_at);
                    const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 items-start ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isFromAdmin && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-bold text-[10px]">
                            {activeSession.name.charAt(0)}
                          </div>
                        )}
                        <div className={`flex flex-col max-w-[70%] gap-1 ${isFromAdmin ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap shadow-md border ${
                              isFromAdmin
                                ? 'bg-neutral-800 text-neutral-100 border-white/5 rounded-tr-none'
                                : 'bg-[#1c1d24] text-neutral-200 border-white/5 rounded-tl-none font-medium'
                            }`}
                          >
                            {msg.message}
                          </div>
                          <span className="text-[8px] text-neutral-500 px-1 font-medium">{timeText}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={adminMessagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form onSubmit={handleAdminSendReply} className="p-3 bg-[#12141c] border-t border-white/5 flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Хариу бичих..."
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-white outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl transition-all cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 gap-2">
                <MessageCircle size={32} className="text-neutral-700 animate-pulse" />
                <span className="text-xs">Чатлахын тулд зүүн талын жагсаалтаас хэрэглэгч сонгоно уу.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default Admin;
