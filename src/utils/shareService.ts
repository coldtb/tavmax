import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SharedProjectData {
  name: string;
  roomConfig: {
    wallColor: string;
    floorType: string;
    width: number;
    depth: number;
    height: number;
  };
  modules: any[];
}

// Compress string to base64
export async function compressToBase64(str: string): Promise<string> {
  const byteArray = new TextEncoder().encode(str);
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  
  const response = new Response(cs.readable);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Decompress base64 to string
export async function decompressFromBase64(base64: string): Promise<string> {
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  
  const response = new Response(ds.readable);
  const buffer = await response.arrayBuffer();
  return new TextDecoder().decode(buffer);
}

// Generate share link
export async function generateShareLink(data: SharedProjectData): Promise<string> {
  const serialized = JSON.stringify(data);
  
  // Try Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from('shared_projects')
        .insert({
          name: data.name || 'Хуваалцсан төсөл',
          layout_data: data,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (!error && inserted) {
        return `${window.location.origin}${window.location.pathname}?share_id=${inserted.id}`;
      } else {
        console.warn('Supabase project sharing failed, generating URL hash fallback:', error?.message);
      }
    } catch (e) {
      console.warn('Supabase project sharing exception, generating URL hash fallback:', e);
    }
  }
  
  // Fallback to URL-safe compressed hash
  const compressed = await compressToBase64(serialized);
  return `${window.location.origin}${window.location.pathname}?share=${compressed}`;
}

// Retrieve shared project from URL
export async function getSharedProject(): Promise<SharedProjectData | null> {
  const params = new URLSearchParams(window.location.search);
  
  // 1. Compressed hash parameter
  const shareHash = params.get('share');
  if (shareHash) {
    try {
      const decompressed = await decompressFromBase64(shareHash);
      return JSON.parse(decompressed) as SharedProjectData;
    } catch (e) {
      console.error('Failed to parse compressed shared project:', e);
      return null;
    }
  }
  
  // 2. Database ID parameter
  const shareId = params.get('share_id');
  if (shareId && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('shared_projects')
        .select('layout_data')
        .eq('id', shareId)
        .single();
        
      if (!error && data && data.layout_data) {
        return data.layout_data as SharedProjectData;
      } else {
        console.error('Failed to load shared project from Supabase:', error?.message);
      }
    } catch (e) {
      console.error('Exception loading shared project from Supabase:', e);
    }
  }
  
  return null;
}
