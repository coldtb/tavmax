import { create } from 'zustand';

export interface UserSession {
  name: string;
  phone: string;
  role: 'factory' | 'customer' | 'admin' | 'designer';
  subscription: 'free' | 'pro' | 'factory';
}

interface AuthState {
  isLoggedIn: boolean;
  user: UserSession | null;
  activationCodeUsed: string | null;
  login: (phone: string, password?: string) => Promise<boolean>;
  register: (name: string, phone: string, code: string, password?: string) => Promise<boolean>;
  logout: () => void;
  validateCode: (code: string) => boolean;
}

// Simulated active activation codes (after payment)
const MOCK_CODES: Record<string, 'pro' | 'factory'> = {
  'TAVMAX-PRO-2026': 'pro',
  'TAVMAX-FCT-9999': 'factory',
  'TAVMAX-DEMO-CODE': 'pro'
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: true, // Default true for easier demonstration/UX
  user: {
    name: 'Г.Бат-Эрдэнэ',
    phone: '99118822',
    role: 'factory', // default to factory/carpenter view
    subscription: 'factory'
  },
  activationCodeUsed: 'TAVMAX-FCT-9999',

  validateCode: (code: string) => {
    return code in MOCK_CODES;
  },

  login: async (phone: string, _password?: string) => {
    // Simulated successful login for dashboard demo
    set({
      isLoggedIn: true,
      user: {
        name: phone === '99118822' ? 'Г.Бат-Эрдэнэ' : 'С.Амар',
        phone,
        role: phone === '99118822' ? 'factory' : 'customer',
        subscription: phone === '99118822' ? 'factory' : 'free'
      }
    });
    return true;
  },

  register: async (name: string, phone: string, code: string, _password?: string) => {
    const subType = MOCK_CODES[code] || 'free';
    set({
      isLoggedIn: true,
      activationCodeUsed: code,
      user: {
        name,
        phone,
        role: subType === 'factory' ? 'factory' : 'designer',
        subscription: subType
      }
    });
    return true;
  },

  logout: () => {
    set({ isLoggedIn: false, user: null, activationCodeUsed: null });
  }
}));
