import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export interface SupportMessage {
  id: string;
  user_phone: string;
  user_name: string;
  message: string;
  is_from_admin: boolean;
  created_at: string;
}

interface ChatState {
  messages: SupportMessage[];
  loading: boolean;
  error: string | null;
  fetchUserMessages: (phone: string) => Promise<void>;
  fetchAllMessages: () => Promise<void>;
  sendMessage: (phone: string, name: string, message: string, isFromAdmin: boolean) => Promise<boolean>;
}

// Module-level fallback flag
let useSupabaseFallback = false;

// Helper to get local messages
const getLocalMessages = (): SupportMessage[] => {
  try {
    const data = localStorage.getItem('tavmax_support_messages');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse local messages:', e);
    return [];
  }
};

// Helper to save a local message
const saveLocalMessage = (msg: SupportMessage) => {
  try {
    const msgs = getLocalMessages();
    msgs.push(msg);
    localStorage.setItem('tavmax_support_messages', JSON.stringify(msgs));
  } catch (e) {
    console.error('Failed to save message to localStorage:', e);
  }
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  error: null,

  fetchUserMessages: async (phone: string) => {
    set({ loading: true });
    
    if (isSupabaseConfigured && supabase && !useSupabaseFallback) {
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('user_phone', phone)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Supabase support_messages fetch error, using localStorage:', error.message);
          useSupabaseFallback = true;
        } else if (data) {
          set({ messages: data, loading: false, error: null });
          return;
        }
      } catch (e: any) {
        console.warn('Supabase support_messages fetch exception, using localStorage:', e);
        useSupabaseFallback = true;
      }
    }

    // Local Storage Fallback
    const local = getLocalMessages()
      .filter((m) => m.user_phone === phone)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    set({ messages: local, loading: false, error: null });
  },

  fetchAllMessages: async () => {
    set({ loading: true });

    if (isSupabaseConfigured && supabase && !useSupabaseFallback) {
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Supabase support_messages fetch all error, using localStorage:', error.message);
          useSupabaseFallback = true;
        } else if (data) {
          set({ messages: data, loading: false, error: null });
          return;
        }
      } catch (e: any) {
        console.warn('Supabase support_messages fetch all exception, using localStorage:', e);
        useSupabaseFallback = true;
      }
    }

    // Local Storage Fallback
    const local = getLocalMessages()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    set({ messages: local, loading: false, error: null });
  },

  sendMessage: async (phone: string, name: string, message: string, isFromAdmin: boolean) => {
    const newMsg: SupportMessage = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      user_phone: phone,
      user_name: name,
      message: message.trim(),
      is_from_admin: isFromAdmin,
      created_at: new Date().toISOString()
    };

    let sentSuccessfully = false;

    if (isSupabaseConfigured && supabase && !useSupabaseFallback) {
      try {
        const { error } = await supabase
          .from('support_messages')
          .insert(newMsg);

        if (error) {
          console.warn('Supabase support_messages insert error, saving to localStorage:', error.message);
          useSupabaseFallback = true;
        } else {
          sentSuccessfully = true;
        }
      } catch (e: any) {
        console.warn('Supabase support_messages insert exception, saving to localStorage:', e);
        useSupabaseFallback = true;
      }
    }

    // If Supabase failed or fallback active, save to localStorage
    if (!sentSuccessfully) {
      saveLocalMessage(newMsg);
    }

    // Update the local store state for immediate display
    set((state) => {
      // For general list/history, filter by user phone if not admin, or append if admin
      // But to be simple and correct, we can update state.messages:
      // If we are currently showing messages for a specific user, or admin showing all
      // We check if the message belongs to the current user's session we are viewing.
      // A safe way is to append it to the messages list if it matches the current view's context.
      const hasPhone = state.messages.length > 0 ? state.messages[0].user_phone === phone : true;
      const isAdminView = state.messages.some(m => m.user_phone !== phone); // has multiple user phones
      
      if (hasPhone || isAdminView || isFromAdmin) {
        return { messages: [...state.messages, newMsg] };
      }
      return {};
    });

    return true;
  }
}));
