import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export interface UserSession {
  name: string;
  phone: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory';
  expiresAt?: string;
}

export interface RegisteredUser {
  name: string;
  phone: string;
  passwordHash: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory';
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

// Obfuscated license code hashes (DJB2 hashes of 'TAVMAX-24H-9900', 'TAVMAX-30D-29900', 'TAVMAX-DEMO-CODE')
const MOCK_CODE_HASHES: Record<string, 'pro' | 'factory'> = {
  '66a6ea9c': 'factory', // TAVMAX-24H-9900
  '71db1e7': 'factory',  // TAVMAX-30D-29900
  '2acdcebc': 'factory'  // TAVMAX-DEMO-CODE
};

const hashString = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false, // Default false for security
      user: null,
      activationCodeUsed: null,
      registeredUsers: [
        {
          name: 'Золбоо',
          phone: '90860926',
          passwordHash: '73326a1d', // DJB2 hash of "Zolboo12@"
          role: 'admin',
          subscription: 'factory',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // default 30 days active
        }
      ],

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
            set({
              isLoggedIn: true,
              user: {
                name: metadata.name || session.user.email?.split('@')[0] || 'Хэрэглэгч',
                phone: metadata.phone || '',
                role: metadata.role || 'designer',
                subscription: metadata.subscription || 'free',
                expiresAt: metadata.expiresAt,
              }
            });
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
            set({
              isLoggedIn: true,
              user: {
                name: metadata.name || session.user.email?.split('@')[0] || 'Хэрэглэгч',
                phone: metadata.phone || '',
                role: metadata.role || 'designer',
                subscription: metadata.subscription || 'free',
                expiresAt: metadata.expiresAt,
              }
            });
          } else if (event === 'SIGNED_OUT') {
            set({ isLoggedIn: false, user: null });
          }
        });
      },

      login: async (phone: string, password?: string) => {
        const pass = password || '';
        
        if (isSupabaseConfigured && supabase) {
          const email = `${phone.trim()}@tavmax.mn`;
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
              set({
                isLoggedIn: true,
                user: {
                  name: metadata.name || phone,
                  phone: metadata.phone || phone,
                  role: metadata.role || 'designer',
                  subscription: metadata.subscription || 'free',
                  expiresAt: metadata.expiresAt,
                }
              });
              return true;
            }
          } catch (e) {
            console.error('Supabase auth exception:', e);
            return false;
          }
          return false;
        } else {
          // Local storage fallback
          const hashedPass = hashString(pass);
          const user = get().registeredUsers.find((u) => u.phone === phone);
          if (user && user.passwordHash === hashedPass) {
            set({
              isLoggedIn: true,
              user: {
                name: user.name,
                phone: user.phone,
                role: user.role,
                subscription: user.subscription,
                expiresAt: user.expiresAt
              }
            });
            return true;
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
          const email = `${phone.trim()}@tavmax.mn`;
          try {
            const { data, error } = await supabase.auth.signUp({
              email,
              password: pass,
              options: {
                data: {
                  name,
                  phone,
                  role: subType === 'factory' ? 'factory' : 'designer',
                  subscription: subType,
                  expiresAt,
                }
              }
            });
            if (error) {
              console.error('Supabase signup failed:', error.message);
              throw new Error(error.message);
            }
            if (data.user) {
              set({
                isLoggedIn: true,
                activationCodeUsed: codeTrimmed,
                user: {
                  name,
                  phone,
                  role: subType === 'factory' ? 'factory' : 'designer',
                  subscription: subType,
                  expiresAt,
                }
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
            // Prevent duplicates
            const filtered = state.registeredUsers.filter((u) => u.phone !== phone);
            return {
              isLoggedIn: true,
              activationCodeUsed: codeTrimmed,
              registeredUsers: [...filtered, newUser],
              user: {
                name,
                phone,
                role: newUser.role,
                subscription: newUser.subscription,
                expiresAt
              }
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
