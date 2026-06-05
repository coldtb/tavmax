import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSession {
  name: string;
  phone: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory';
}

export interface RegisteredUser {
  name: string;
  phone: string;
  passwordHash: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory';
}

interface AuthState {
  isLoggedIn: boolean;
  user: UserSession | null;
  activationCodeUsed: string | null;
  registeredUsers: RegisteredUser[];
  login: (phone: string, password?: string) => Promise<boolean>;
  register: (name: string, phone: string, code: string, password?: string) => Promise<boolean>;
  logout: () => void;
  validateCode: (code: string) => boolean;
}

// Obfuscated license code hashes (DJB2 hashes of 'TAVMAX-PRO-2026', 'TAVMAX-FCT-9999', 'TAVMAX-DEMO-CODE')
const MOCK_CODE_HASHES: Record<string, 'pro' | 'factory'> = {
  'c7287919': 'pro',
  '96dbb2e3': 'factory',
  '2acdcebc': 'pro'
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
          name: 'Г.Бат-Эрдэнэ',
          phone: '99118822',
          passwordHash: '8159cfaa', // DJB2 hash of "password123"
          role: 'factory',
          subscription: 'factory'
        }
      ],

      validateCode: (code: string) => {
        const hashed = hashString(code.trim().toUpperCase());
        return hashed in MOCK_CODE_HASHES;
      },

      login: async (phone: string, password?: string) => {
        const pass = password || '';
        const hashedPass = hashString(pass);
        const user = get().registeredUsers.find((u) => u.phone === phone);
        if (user && user.passwordHash === hashedPass) {
          set({
            isLoggedIn: true,
            user: {
              name: user.name,
              phone: user.phone,
              role: user.role,
              subscription: user.subscription
            }
          });
          return true;
        }
        return false;
      },

      register: async (name: string, phone: string, code: string, password?: string) => {
        const codeTrimmed = code.trim().toUpperCase();
        const hashedCode = hashString(codeTrimmed);
        const subType = MOCK_CODE_HASHES[hashedCode] || 'free';
        const pass = password || '';
        const hashedPass = hashString(pass);

        const newUser: RegisteredUser = {
          name,
          phone,
          passwordHash: hashedPass,
          role: subType === 'factory' ? 'factory' : 'designer',
          subscription: subType
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
              subscription: newUser.subscription
            }
          };
        });
        return true;
      },

      logout: () => {
        set({ isLoggedIn: false, user: null, activationCodeUsed: null });
      }
    }),
    {
      name: 'tavmax-auth-storage'
    }
  )
);
