import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DocumentTag = 'Karantina Hewan' | 'Karantina Ikan' | 'Karantina Tumbuhan';
export type DocumentType = 'Jurnal' | 'Laporan Uji Terap';
export type UserRole = 'user' | 'admin';

export interface Document {
  id: string;
  title: string;
  author: string;
  tag: DocumentTag;
  type: DocumentType;
  url: string;
  storage_path: string;
  date: string;
  size: string;
  download_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nip: string | null;
  name: string;
  role: UserRole;
  created_at: string;
}
