import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export interface UserSession {
  name: string;
  phone: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory' | 'trial';
  expiresAt?: string;
}

export interface RegisteredUser {
  name: string;
  phone: string;
  passwordHash: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory' | 'trial';
  expiresAt?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: UserSession | null;
  activationCodeUsed: string | null;
  registeredUsers: RegisteredUser[];
  initializeAuth: () => Promise<void>;
  login: (phone: string, password?: string) => Promise<boolean>;
  register: (name: string, phone: string, code: string, password?: string) => Promise<boolean>;
  logout: () => void;
  validateCode: (code: string) => boolean;
  updateSubscription: (duration: '24h' | '30d') => Promise<boolean>;
  adminUpdateUserSubscription: (phone: string, duration: '24h' | '30d' | 'cancel') => Promise<boolean>;
}

// DJB2 hash helper
const hashString = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

// Build code hash map from env variables (never hardcoded in source)
const buildCodeHashes = (): Record<string, 'pro' | 'factory'> => {
  const map: Record<string, 'pro' | 'factory'> = {};
  const c1 = import.meta.env.VITE_CODE_24H?.trim();
  const c2 = import.meta.env.VITE_CODE_30D?.trim();
  const c3 = import.meta.env.VITE_CODE_DEMO?.trim();
  if (c1) map[hashString(c1.toUpperCase())] = 'factory';
  if (c2) map[hashString(c2.toUpperCase())] = 'factory';
  if (c3) map[hashString(c3.toUpperCase())] = 'factory';
  return map;
};
const MOCK_CODE_HASHES = buildCodeHashes();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false, // Default false for security
      user: null,
      activationCodeUsed: null,
      registeredUsers: (() => {
        const adminPhone = import.meta.env.VITE_ADMIN_PHONE?.trim();
        const adminHash  = import.meta.env.VITE_ADMIN_HASH?.trim();
        const adminName  = import.meta.env.VITE_ADMIN_NAME?.trim() || 'Admin';
        if (!adminPhone || !adminHash) return [];
        return [
          {
            name: adminName,
            phone: adminPhone,
            passwordHash: adminHash,
            role: 'admin' as const,
            subscription: 'factory' as const,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      })(),

      validateCode: (code: string) => {
        const hashed = hashString(code.trim().toUpperCase());
        return hashed in MOCK_CODE_HASHES;
      },

      initializeAuth: async () => {
        if (!isSupabaseConfigured || !supabase) return;

        // Fetch initial session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
            const metadata = session.user.user_metadata;
            
            // Fetch profile to get the up-to-date subscription state
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            let role = profile?.role || metadata.role || 'designer';
            let subscription = profile?.subscription || metadata.subscription || 'free';
            let expiresAt = profile?.expires_at || metadata.expiresAt;

            // Auto-grant 1 hour free trial for new free accounts (same as login)
            if (subscription === 'free' && !expiresAt) {
              const trialExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  subscription: 'trial',
                  role: 'factory',
                  expires_at: trialExpiresAt
                })
                .eq('id', session.user.id);
              if (!updateError) {
                subscription = 'trial';
                role = 'factory';
                expiresAt = trialExpiresAt;
                await supabase.auth.updateUser({
                  data: { role: 'factory', subscription: 'trial', expiresAt: trialExpiresAt }
                });
              }
            }

            const isAdmin = role === 'admin';
            const isPaid = subscription === 'factory' || subscription === 'pro' || subscription === 'trial';
            const isExpired = expiresAt && new Date(expiresAt).getTime() <= Date.now();

            if (!isAdmin && (!isPaid || isExpired)) {
              await supabase.auth.signOut();
              set({ isLoggedIn: false, user: null });
            } else {
              set({
                isLoggedIn: true,
                user: {
                  name: profile?.name || metadata.name || session.user.email?.split('@')[0] || 'Хэрэглэгч',
                  phone: profile?.phone || metadata.phone || '',
                  role,
                  subscription,
                  expiresAt,
                }
              });
            }
          } else {
            set({ isLoggedIn: false, user: null });
          }
        } catch (e) {
          console.error('Failed to get Supabase session on init:', e);
          set({ isLoggedIn: false, user: null });
        }

        // Setup subscription listener for live session updates
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session && session.user) {
            const metadata = session.user.user_metadata;
            
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            let role = profile?.role || metadata.role || 'designer';
            let subscription = profile?.subscription || metadata.subscription || 'free';
            let expiresAt = profile?.expires_at || metadata.expiresAt;

            // Auto-grant 1 hour free trial for new free accounts (same as login)
            if (subscription === 'free' && !expiresAt) {
              const trialExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  subscription: 'trial',
                  role: 'factory',
                  expires_at: trialExpiresAt
                })
                .eq('id', session.user.id);
              if (!updateError) {
                subscription = 'trial';
                role = 'factory';
                expiresAt = trialExpiresAt;
                await supabase.auth.updateUser({
                  data: { role: 'factory', subscription: 'trial', expiresAt: trialExpiresAt }
                });
              }
            }

            const isAdmin = role === 'admin';
            const isPaid = subscription === 'factory' || subscription === 'pro' || subscription === 'trial';
            const isExpired = expiresAt && new Date(expiresAt).getTime() <= Date.now();

            if (!isAdmin && (!isPaid || isExpired)) {
              if (get().isLoggedIn) {
                await supabase.auth.signOut();
                set({ isLoggedIn: false, user: null });
              }
            } else {
              set({
                isLoggedIn: true,
                user: {
                  name: profile?.name || metadata.name || session.user.email?.split('@')[0] || 'Хэрэглэгч',
                  phone: profile?.phone || metadata.phone || '',
                  role,
                  subscription,
                  expiresAt,
                }
              });
            }
          } else if (event === 'SIGNED_OUT') {
            set({ isLoggedIn: false, user: null });
          }
        });
      },

      login: async (phone: string, password?: string) => {
        const pass = password || '';
        
        if (isSupabaseConfigured && supabase) {
          const email = `${phone.trim()}@tavmax.com`;
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password: pass,
            });
            if (error) {
              console.error('Supabase login failed:', error.message);
              return false;
            }
            if (data.user) {
              const metadata = data.user.user_metadata;
              
              // Query profiles table
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

              let role = profile?.role || metadata.role || 'designer';
              let subscription = profile?.subscription || metadata.subscription || 'free';
              let expiresAt = profile?.expires_at || metadata.expiresAt;

              // Auto-grant 1 hour free trial for new free accounts
              if (subscription === 'free' && !expiresAt) {
                const trialExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
                
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({
                    subscription: 'trial',
                    role: 'factory',
                    expires_at: trialExpiresAt
                  })
                  .eq('id', data.user.id);

                if (!updateError) {
                  subscription = 'trial';
                  role = 'factory';
                  expiresAt = trialExpiresAt;
                  
                  await supabase.auth.updateUser({
                    data: {
                      role: 'factory',
                      subscription: 'trial',
                      expiresAt: trialExpiresAt
                    }
                  });
                } else {
                  console.error('Failed to auto-activate 1h trial:', updateError.message);
                }
              }

              const isAdmin = role === 'admin';
              const isPaid = subscription === 'factory' || subscription === 'pro' || subscription === 'trial';
              const isExpired = expiresAt && new Date(expiresAt).getTime() <= Date.now();

              if (!isAdmin && (!isPaid || isExpired)) {
                await supabase.auth.signOut();
                throw new Error('NOT_ACTIVATED');
              }

              set({
                isLoggedIn: true,
                user: {
                  name: profile?.name || metadata.name || phone,
                  phone: profile?.phone || metadata.phone || phone,
                  role,
                  subscription,
                  expiresAt,
                }
              });
              return true;
            }
          } catch (e: any) {
            console.error('Supabase auth exception:', e);
            throw e;
          }
          return false;
        } else {
          // Local storage fallback
          const hashedPass = hashString(pass);
          const userIdx = get().registeredUsers.findIndex((u) => u.phone === phone);
          if (userIdx !== -1) {
            const user = get().registeredUsers[userIdx];
            if (user.passwordHash === hashedPass) {
              let role = user.role;
              let subscription = user.subscription;
              let expiresAt = user.expiresAt;

              // Auto-grant 1 hour trial in offline mode too
              if (subscription === 'free' && !expiresAt) {
                const trialExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
                subscription = 'trial';
                role = 'factory';
                expiresAt = trialExpiresAt;

                set((state) => {
                  const updated = [...state.registeredUsers];
                  updated[userIdx] = {
                    ...updated[userIdx],
                    subscription: 'trial',
                    role: 'factory',
                    expiresAt: trialExpiresAt
                  };
                  return { registeredUsers: updated };
                });
              }

              const isAdmin = role === 'admin';
              const isPaid = subscription === 'factory' || subscription === 'pro' || subscription === 'trial';
              const isExpired = expiresAt && new Date(expiresAt).getTime() <= Date.now();

              if (!isAdmin && (!isPaid || isExpired)) {
                throw new Error('NOT_ACTIVATED');
              }

              set({
                isLoggedIn: true,
                user: {
                  name: user.name,
                  phone: user.phone,
                  role,
                  subscription,
                  expiresAt
                }
              });
              return true;
            }
            return false;
          }
          return false;
        }
      },

      register: async (name: string, phone: string, code: string, password?: string) => {
        const codeTrimmed = code.trim().toUpperCase();
        const hashedCode = hashString(codeTrimmed);
        const subType = MOCK_CODE_HASHES[hashedCode] || 'free';
        const pass = password || '';

        // Calculate expiresAt
        let expiresAt: string | undefined = undefined;
        if (subType === 'factory') {
          const now = new Date();
          if (codeTrimmed.includes('24H')) {
            now.setHours(now.getHours() + 24);
          } else {
            now.setDate(now.getDate() + 30);
          }
          expiresAt = now.toISOString();
        }

        if (isSupabaseConfigured && supabase) {
          try {
            const role = subType === 'factory' ? 'factory' : 'designer';
            const { data, error } = await supabase.rpc('register_user', {
              p_phone: phone.trim(),
              p_name: name.trim(),
              p_password: pass,
              p_role: role,
              p_subscription: subType
            });
            if (error) {
              console.error('Supabase signup RPC failed:', error.message);
              if (error.message.includes('USER_EXISTS')) {
                throw new Error('Энэ утасны дугаар аль хэдийн бүртгэгдсэн байна.');
              }
              throw new Error(error.message);
            }
            if (data) {
              // Sign out just in case
              await supabase.auth.signOut();
              set({
                isLoggedIn: false,
                activationCodeUsed: null,
                user: null
              });
              return true;
            }
          } catch (e: any) {
            console.error('Supabase registration exception:', e);
            throw e;
          }
          return false;
        } else {
          // Local storage fallback
          const hashedPass = hashString(pass);
          const newUser: RegisteredUser = {
            name,
            phone,
            passwordHash: hashedPass,
            role: subType === 'factory' ? 'factory' : 'designer',
            subscription: subType,
            expiresAt
          };

          set((state) => {
            const filtered = state.registeredUsers.filter((u) => u.phone !== phone);
            return {
              isLoggedIn: false, // DO NOT log in
              activationCodeUsed: null,
              registeredUsers: [...filtered, newUser],
              user: null // DO NOT log in
            };
          });
          return true;
        }
      },

      logout: () => {
        if (isSupabaseConfigured && supabase) {
          supabase.auth.signOut().catch(console.error);
        }
        set({ isLoggedIn: false, user: null, activationCodeUsed: null });
      },

      updateSubscription: async (duration: '24h' | '30d') => {
        const currentUser = get().user;
        if (!currentUser) return false;

        const subType = 'factory';
        const role = 'factory';

        // Calculate expiresAt
        const now = new Date();
        if (duration === '24h') {
          now.setHours(now.getHours() + 24);
        } else {
          now.setDate(now.getDate() + 30);
        }
        const expiresAt = now.toISOString();

        if (isSupabaseConfigured && supabase) {
          try {
            const { data, error } = await supabase.auth.updateUser({
              data: {
                role,
                subscription: subType,
                expiresAt,
              }
            });
            if (error) {
              console.error('Supabase update subscription failed:', error.message);
              return false;
            }
            if (data.user) {
              set({
                user: {
                  ...currentUser,
                  role,
                  subscription: subType,
                  expiresAt,
                }
              });
              return true;
            }
          } catch (e) {
            console.error('Supabase update subscription exception:', e);
            return false;
          }
          return false;
        } else {
          // Local storage fallback
          set((state) => {
            const updatedUsers = state.registeredUsers.map((u) => {
              if (u.phone === currentUser.phone) {
                return { ...u, subscription: subType, role, expiresAt };
              }
              return u;
            });
            return {
              registeredUsers: updatedUsers,
              user: {
                ...currentUser,
                role,
                subscription: subType,
                expiresAt,
              }
            };
          });
          return true;
        }
      },

      adminUpdateUserSubscription: async (phone: string, duration: '24h' | '30d' | 'cancel') => {
        const subType = duration === 'cancel' ? 'free' : 'factory';
        const role = subType === 'factory' ? 'factory' : 'designer';
        const now = new Date();
        let expiresAt: string | null = null;
        if (duration === '24h') {
          now.setHours(now.getHours() + 24);
          expiresAt = now.toISOString();
        } else if (duration === '30d') {
          now.setDate(now.getDate() + 30);
          expiresAt = now.toISOString();
        }

        set((state) => {
          const updatedUsers = state.registeredUsers.map((u) => {
            if (u.phone === phone) {
              return { ...u, subscription: subType, role, expiresAt: expiresAt || undefined };
            }
            return u;
          });
          
          const currentUser = state.user;
          const updatedUser = currentUser && currentUser.phone === phone 
            ? { ...currentUser, subscription: subType, role, expiresAt: expiresAt || undefined }
            : currentUser;

          return {
            registeredUsers: updatedUsers,
            user: updatedUser
          };
        });
        return true;
      }
    }),
    {
      name: 'tavmax-auth-storage'
    }
  )
);
