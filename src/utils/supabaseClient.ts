import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Verify that keys are not placeholders or empty
export const isSupabaseConfigured = 
  !(typeof window !== 'undefined' && (window as any).__MOCK_AUTH__) &&
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('your-') && 
  !supabaseAnonKey.includes('your-');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Debounce helper to prevent spamming the database with intermediate layout slider updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      func(...args);
    }, wait);
  };
}
